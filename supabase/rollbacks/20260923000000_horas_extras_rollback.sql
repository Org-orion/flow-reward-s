-- ============================================================================
-- ROLLBACK de supabase/migrations/20260923000000_horas_extras.sql
--
-- ⚠️ FORA de supabase/migrations/ de propósito: reversão manual.
--
-- ⚠️ DESTRUTIVO: apaga TODA a base histórica de ponto já importada. Não há como
-- reconstruí-la sem os arquivos originais do Secullum. Antes de rodar, exporte:
--   copy (select * from public.concremrh_ponto_lancamentos) to stdout csv header;
--
-- `has_secao` NÃO é removida: ela é da Fase 3 de RLS e outras tabelas dependem
-- dela. Esta migração apenas a criou caso ainda não existisse.
-- ============================================================================

-- As tabelas saem primeiro: `concremrh_usuario_atual_id` é DEFAULT de uma
-- coluna e não pode ser removida enquanto a tabela existir.
drop table if exists public.concremrh_ponto_relatorios;
drop table if exists public.concremrh_ponto_lancamentos;
drop table if exists public.concremrh_ponto_importacoes;
drop table if exists public.concremrh_ponto_funcionarios;
drop table if exists public.concremrh_ponto_departamentos;
drop table if exists public.concremrh_ponto_config;

drop function if exists public.concremrh_ponto_importar(text, text, date, date, boolean, jsonb, boolean, jsonb);
drop function if exists public.concremrh_usuario_atual_id();

delete from public.concremrh_hr_applications where code = 'horas_extras';

-- A seção fica órfã nos usuários que a receberam; remover é opcional.
-- update public.concremrh_usuarios
--    set secoes = secoes - 'horas_extras'
--  where secoes ? 'horas_extras';
