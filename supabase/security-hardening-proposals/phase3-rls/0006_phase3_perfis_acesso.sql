-- ============================================================================
-- PROPOSTA (Fase 3 — RLS) LOTE 0006: PERFIS DE ACESSO — NÃO APLICAR AINDA
-- concremrh_perfis_acesso define QUEM pode o quê: leitura para qualquer
-- autenticado (a tela de acessos precisa listar os perfis) e escrita apenas
-- admin. Depende do lote 0001 + Fase 2.
--
-- Nota: as colunas `perfil_acesso_id`/`permissoes` de concremrh_usuarios já são
-- cobertas pelas policies de `concremrh_usuarios` (lote 0002, Grupo A).
-- ============================================================================

drop policy if exists "allow_all_concremrh_perfis_acesso" on public.concremrh_perfis_acesso;
create policy "perfis_acesso_read"  on public.concremrh_perfis_acesso for select to authenticated using (true);
create policy "perfis_acesso_write" on public.concremrh_perfis_acesso for all    to authenticated using (public.is_admin()) with check (public.is_admin());
