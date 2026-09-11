-- ============================================================================
-- ROLLBACK de supabase/migrations/20260910000000_permissoes_granulares.sql
--
-- ⚠️ Fica FORA de supabase/migrations/ de propósito: é script de reversão
-- manual e NÃO deve rodar em CI nem em `supabase db push`.
--
-- Projeto real: ewfebwljhmcvuopopqpb (ver .env / auth-proposals/0001).
--
-- A definição de `concremrh_verify_login` restaurada no passo 1 é a REAL,
-- capturada em produção em 2026-09-10 via
--   select pg_get_functiondef(p.oid) from pg_proc p
--     join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname = 'concremrh_verify_login';
-- Confirmada idêntica a supabase/migrations-v2/0008_functions_rpc.sql.
--
-- Rode em uma transação e valide o login ANTES do commit.
-- ============================================================================

begin;

-- 1) Restaura o login SEM as permissões granulares -------------------------
-- Mesma assinatura, mesmo SECURITY DEFINER e SEM `set search_path`
-- (crypt() vive no schema de extensões — não mexer nisso).
CREATE OR REPLACE FUNCTION public.concremrh_verify_login(p_email text, p_password text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE rec RECORD;
BEGIN
  SELECT id, email, nome, perfil, secoes, senha_hash INTO rec
  FROM concremrh_usuarios
  WHERE email = p_email AND ativo = true AND senha_hash IS NOT NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  IF rec.senha_hash = crypt(p_password, rec.senha_hash) THEN
    RETURN jsonb_build_object(
      'ok', true, 'id', rec.id::text, 'email', rec.email,
      'nome', rec.nome, 'perfil', rec.perfil, 'secoes', rec.secoes
    );
  END IF;

  RETURN jsonb_build_object('ok', false);
END;
$function$;

-- 2) Remove a função de resolução ------------------------------------------
drop function if exists public.concremrh_permissoes_efetivas(uuid);

-- 3) Remove as colunas de permissão do usuário -----------------------------
-- Isto DESCARTA os vínculos de perfil e as exceções já cadastradas.
alter table public.concremrh_usuarios
  drop constraint if exists concremrh_usuarios_perfil_acesso_fk,
  drop constraint if exists concremrh_usuarios_permissoes_shape;

drop index if exists public.concremrh_usuarios_perfil_acesso_idx;

alter table public.concremrh_usuarios
  drop column if exists perfil_acesso_id,
  drop column if exists permissoes;

-- 4) Remove a tabela de perfis de acesso -----------------------------------
drop table if exists public.concremrh_perfis_acesso;

-- ============================================================================
-- Antes do commit, valide que o login volta a funcionar:
--   • pelo APP (não por SQL — evita senha em texto claro no histórico do editor);
--   • e confira os privilégios preservados da função:
--       select proacl from pg_proc where proname = 'concremrh_verify_login';
--     Se o lockdown do Turnstile já estava aplicado, `anon` NÃO deve aparecer.
--
-- Se algo estiver errado: rollback;   Se estiver ok: commit;
-- ============================================================================

commit;

-- ----------------------------------------------------------------------------
-- Depois do rollback do banco:
--   • O frontend e a Edge Function novos CONTINUAM funcionando: ambos tratam a
--     ausência de `permissoes` como "usuário legado" (governado por `secoes`).
--     Não é obrigatório reverter deploys.
--   • Usuários já logados seguem com a sessão da aba; o efeito aparece no
--     próximo login.
-- ----------------------------------------------------------------------------
