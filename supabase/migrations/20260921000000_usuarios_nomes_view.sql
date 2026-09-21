-- ============================================================================
-- VIEW `concremrh_usuarios_nomes` — expõe SOMENTE id e nome dos usuários
--
-- PROBLEMA QUE RESOLVE
-- A policy de leitura de `concremrh_usuarios` é `usuarios_read ... using
-- (is_admin())`: só administrador lê a tabela. Toda tela que mostra o
-- responsável de uma operação faz join nessa tabela para pegar o nome —
-- então, para qualquer usuário NÃO administrador, o join volta vazio e a
-- interface exibe "—". Sintomas observados: "Emitido por" no recibo de
-- entrega, e "Responsável" em Movimentações, Estornos, Entradas recentes e no
-- detalhe do fardamento.
--
-- POR QUE NÃO ABRIR A TABELA
-- `concremrh_usuarios` guarda `senha_hash` (bcrypt), além de e-mail, seções e
-- permissões. Liberar `select` na tabela exporia o hash de senha a qualquer
-- usuário autenticado. Permissão por COLUNA também não serve: administrador e
-- operador usam o mesmo papel no banco (`authenticated`), então restringir
-- colunas quebraria a tela de Usuários e Acessos.
--
-- SOLUÇÃO
-- Uma view com projeção mínima (id, nome). Ela NÃO usa `security_invoker`,
-- portanto executa com os privilégios do dono e não é barrada pelo RLS da
-- tabela base — e não há o que vazar além do nome, que já é visível a qualquer
-- autenticado pelo cadastro de funcionários (`funcionarios_read using (true)`).
--
-- Rollback: supabase/rollbacks/20260921000000_usuarios_nomes_view_rollback.sql
-- ============================================================================

create or replace view public.concremrh_usuarios_nomes
  with (security_invoker = false) as
  select u.id, u.nome
  from public.concremrh_usuarios u;

comment on view public.concremrh_usuarios_nomes is
  'Projeção mínima (id, nome) de concremrh_usuarios para exibir o responsável de operações. Executa com privilégios do dono: contorna o RLS da tabela base SEM expor e-mail, seções, permissões ou senha_hash.';

-- Leitura para quem está autenticado; anon não tem nada aqui.
revoke all on public.concremrh_usuarios_nomes from anon;
grant select on public.concremrh_usuarios_nomes to authenticated, service_role;

-- ============================================================================
-- Validação
--   select count(*) from public.concremrh_usuarios_nomes;   -- deve contar todos
--   select * from public.concremrh_usuarios_nomes order by nome;
--
-- No app (logado com usuário NÃO administrador), depois do deploy do frontend:
--   • Recibo de entrega deve mostrar o nome em "Emitido por";
--   • Movimentações deve mostrar o nome na coluna "Responsável".
-- ============================================================================
