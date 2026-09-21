-- ============================================================================
-- ROLLBACK de supabase/migrations/20260921000000_usuarios_nomes_view.sql
--
-- ⚠️ FORA de supabase/migrations/ de propósito: reversão manual.
--
-- Depois deste rollback, o frontend que consulta `concremrh_usuarios_nomes`
-- passa a receber erro nas telas que mostram o responsável. Reverter o banco
-- exige reverter TAMBÉM o commit do frontend (ou voltar os 5 joins para
-- `concremrh_usuarios`), senão Movimentações, Estornos e o recibo quebram.
-- ============================================================================

drop view if exists public.concremrh_usuarios_nomes;
