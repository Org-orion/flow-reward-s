-- ============================================================================
-- ROLLBACK do LOTE 0006 — restaura o allow_all de concremrh_perfis_acesso.
-- ============================================================================

drop policy if exists "perfis_acesso_read"  on public.concremrh_perfis_acesso;
drop policy if exists "perfis_acesso_write" on public.concremrh_perfis_acesso;
create policy "allow_all_concremrh_perfis_acesso" on public.concremrh_perfis_acesso as permissive for all to public using (true) with check (true);
