-- ============================================================================
-- get_my_profile() passa a devolver as PERMISSÕES GRANULARES
--
-- Complemento obrigatório de 20260910000000_permissoes_granulares.sql para os
-- ambientes em modo `supabase` (VITE_AUTH_MODE=supabase). Nesse modo o perfil do
-- usuário NÃO vem da Edge Function `turnstile-login` (que ali só valida o
-- captcha) — vem desta RPC, chamada pelo AuthContext após o signInWithPassword.
-- Sem esta migração, o cliente nunca recebe `permissoes` e TODO usuário é
-- tratado como legado (governado apenas por `secoes`).
--
-- Base: definição REAL capturada em produção em 2026-09-10 via
--   select pg_get_functiondef(p.oid) from pg_proc p
--     join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname = 'get_my_profile';
-- Preservados fielmente: LANGUAGE sql, STABLE, SECURITY DEFINER e
-- SET search_path TO 'public'. A única mudança é o acréscimo de duas chaves no
-- jsonb de retorno (`permissoes` e `perfil_acesso`) e o LEFT JOIN que as supre.
--
-- `permissoes` = NULL para usuário legado (sem perfil de acesso e sem exceções),
-- e o app cai no modelo de seções — mesmo comportamento de antes.
--
-- Rollback: supabase/rollbacks/20260910010000_get_my_profile_permissoes_rollback.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_profile()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case when u.id is null then jsonb_build_object('ok', false)
    else jsonb_build_object(
      'ok', true, 'id', u.id::text, 'email', u.email,
      'nome', u.nome, 'perfil', u.perfil, 'secoes', coalesce(u.secoes, '[]'::jsonb),
      -- NULL = usuário legado (o app usa `secoes`). Array (mesmo vazio) = granular.
      'permissoes', public.concremrh_permissoes_efetivas(u.id),
      'perfil_acesso', pa.nome
    ) end
  from (select auth.uid() as uid) s
  left join public.concremrh_usuarios u
    on u.auth_user_id = s.uid and u.ativo = true
  left join public.concremrh_perfis_acesso pa
    on pa.id = u.perfil_acesso_id and pa.ativo = true
  limit 1;
$function$;

-- ============================================================================
-- Validação (rodar logado no app, não aqui — esta função depende de auth.uid()):
--   • Faça logout/login e confira na tela de Produção por Setor se a coluna
--     Meta aparece com cadeado para quem tem o perfil "Apontador de Produção".
--   • Para inspecionar sem logar, use a função de resolução direto:
--       select nome, public.concremrh_permissoes_efetivas(id)
--         from concremrh_usuarios order by nome;
-- ============================================================================
