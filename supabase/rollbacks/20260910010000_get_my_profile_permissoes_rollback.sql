-- ============================================================================
-- ROLLBACK de supabase/migrations/20260910010000_get_my_profile_permissoes.sql
--
-- ⚠️ FORA de supabase/migrations/ de propósito: reversão manual, não roda em CI
-- nem em `supabase db push`.
--
-- Restaura a get_my_profile() SEM as permissões granulares. Esta é a definição
-- REAL capturada em produção em 2026-09-10 (pg_get_functiondef), verbatim.
--
-- Depois deste rollback o app volta a tratar TODOS os usuários como legados
-- (governados por `secoes`) — o frontend lida com isso sem quebrar, porque lê
-- `permissoes` ausente como `null`.
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
      'nome', u.nome, 'perfil', u.perfil, 'secoes', coalesce(u.secoes, '[]'::jsonb)
    ) end
  from (select auth.uid() as uid) s
  left join public.concremrh_usuarios u
    on u.auth_user_id = s.uid and u.ativo = true
  limit 1;
$function$;
