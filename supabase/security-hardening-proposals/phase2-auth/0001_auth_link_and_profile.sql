-- ============================================================================
-- PROPOSTA (Fase 2 — Supabase Auth) — NÃO APLICAR AINDA
-- Vincula concremrh_usuarios a auth.users e adiciona uma RPC para montar o
-- perfil a partir de uma sessao verificada (auth.uid()). NAO cria usuarios no
-- Auth (isso e feito pelo script link-migrate-users.mjs) e NAO mexe em RLS.
-- Reversivel: ver secao ROLLBACK ao final.
-- ============================================================================

-- 1) Vinculo com auth.users (a coluna auth_user_id JA existe em concremrh_usuarios).
--    FK opcional (ON DELETE SET NULL) para nao apagar o registro de RH se o auth user sumir.
--    Executar como `postgres` (schema auth exige privilegio).
do $$ begin
  alter table public.concremrh_usuarios
    add constraint concremrh_usuarios_auth_user_fk
    foreign key (auth_user_id) references auth.users(id) on delete set null;
exception when duplicate_object then null; end $$;

-- Unicidade do vinculo (1 auth user <-> 1 registro). Parcial: ignora NULLs.
create unique index if not exists concremrh_usuarios_auth_user_uidx
  on public.concremrh_usuarios(auth_user_id)
  where auth_user_id is not null;

-- 2) RPC para o NOVO login: dado o auth.uid() da sessao, retorna o perfil da app.
--    Usada pelo AuthContext (modo supabase) para montar { id,email,nome,perfil,secoes }.
create or replace function public.get_my_profile()
  returns jsonb
  language sql
  stable
  security definer
  set search_path = public
as $function$
  select case when u.id is null then jsonb_build_object('ok', false)
    else jsonb_build_object(
      'ok', true, 'id', u.id::text, 'email', u.email,
      'nome', u.nome, 'perfil', u.perfil, 'secoes', coalesce(u.secoes, '[]'::jsonb),
      -- Permissões granulares efetivas (NULL = usuário legado, governado por `secoes`).
      -- Ver supabase/migrations/20260910000000_permissoes_granulares.sql.
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

-- (get_my_perfil() ja existe desde 0008 e passa a funcionar de fato apos o vinculo.)

-- ============================================================================
-- ROLLBACK
--   drop function if exists public.get_my_profile();
--   drop index if exists public.concremrh_usuarios_auth_user_uidx;
--   alter table public.concremrh_usuarios drop constraint if exists concremrh_usuarios_auth_user_fk;
-- ============================================================================
