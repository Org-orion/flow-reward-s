import { supabase } from '@/integrations/supabase/client';
import type { UnidadeRow, CategoriaRow, TamanhoRow, VarianteRow, SaldoRow, MovimentacaoRow, ItemInput, EntregaRow, DevolucaoAtivaRow, DevolucaoRow } from '../types/db.types';

/**
 * Camada de acesso a dados do módulo Controle de Estoque. As tabelas
 * `concremrh_estoque_*` não estão no types.ts gerado → uso de `(supabase as any)`
 * (mesmo padrão de useFuncionariosSensivel). Toda MUTAÇÃO passa pelas RPCs
 * transacionais (0002); leituras respeitam a RLS (0003). Sem N+1 (consultas em lote).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const novaOperacaoId = (): string => crypto.randomUUID();

const BUCKET_DOCUMENTOS = 'estoque-documentos';

/** Metadados do PDF de NF enviados à RPC de entrada (p_documento). */
export interface DocumentoEntrada {
  nome_original: string;
  nome_interno: string;
  storage_key: string;
  mime_type: string;
  tamanho: number;
}

/**
 * Faz upload autenticado do PDF da nota fiscal para o Storage privado, no prefixo
 * `notas/` (exigido pela RLS 0004), ANTES da RPC de metadata. Retorna o objeto
 * `p_documento`. Se a RPC falhar depois, o objeto fica órfão (limpeza por rotina
 * service_role — 0004). O caminho não inclui movimentacao_id (só conhecido após a
 * RPC); o uuid garante unicidade e o prefixo `notas/` satisfaz a policy.
 */
export async function uploadNotaFiscal(file: File, unidadeId: string, ano: string): Promise<DocumentoEntrada> {
  const uuid = crypto.randomUUID();
  const nomeInterno = `${uuid}.pdf`;
  const storageKey = `notas/${unidadeId}/${ano}/${uuid}.pdf`;
  const { error } = await supabase.storage.from(BUCKET_DOCUMENTOS).upload(storageKey, file, {
    contentType: 'application/pdf', upsert: false,
  });
  if (error) throw new Error(error.message);
  return { nome_original: file.name, nome_interno: nomeInterno, storage_key: storageKey, mime_type: 'application/pdf', tamanho: file.size };
}

/** URL assinada (curta) para baixar/visualizar um documento do Storage privado. */
export async function urlAssinadaDocumento(storageKey: string, expiraEmSeg = 60): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET_DOCUMENTOS).createSignedUrl(storageKey, expiraEmSeg);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? 'Não foi possível gerar o link do documento.');
  return data.signedUrl;
}

function unwrap<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// ── Leituras ────────────────────────────────────────────────────────────
export async function getUnidades(): Promise<UnidadeRow[]> {
  return unwrap<UnidadeRow[]>(await db.from('concremrh_estoque_unidades').select('*').eq('ativo', true).order('nome')) ?? [];
}

export async function getCategorias(): Promise<CategoriaRow[]> {
  return unwrap<CategoriaRow[]>(await db.from('concremrh_estoque_categorias').select('*').eq('ativo', true).order('nome')) ?? [];
}

export async function getTamanhos(): Promise<TamanhoRow[]> {
  return unwrap<TamanhoRow[]>(await db.from('concremrh_estoque_tamanhos').select('*').eq('ativo', true).order('ordem')) ?? [];
}

export async function getVariantes(): Promise<VarianteRow[]> {
  const sel = '*, modelo:concremrh_estoque_modelos(nome, categoria:concremrh_estoque_categorias(nome)), tamanho:concremrh_estoque_tamanhos(rotulo, tipo)';
  return unwrap<VarianteRow[]>(await db.from('concremrh_estoque_variantes').select(sel).is('deletado_em', null).eq('ativo', true).order('nome')) ?? [];
}

/** Variantes ATIVAS e INATIVAS (exceto soft-deletadas) — para a tela de gestão com filtro ativo/inativo. */
export async function getVariantesTodas(): Promise<VarianteRow[]> {
  const sel = '*, modelo:concremrh_estoque_modelos(nome, categoria:concremrh_estoque_categorias(nome)), tamanho:concremrh_estoque_tamanhos(rotulo, tipo), fornecedor:concremrh_estoque_fornecedores(razao_social, nome_fantasia)';
  return unwrap<VarianteRow[]>(await db.from('concremrh_estoque_variantes').select(sel).is('deletado_em', null).order('nome')) ?? [];
}

export async function getSaldos(): Promise<SaldoRow[]> {
  return unwrap<SaldoRow[]>(await db.from('concremrh_estoque_saldos').select('id, variante_id, unidade_id, quantidade, estoque_minimo, estoque_ideal')) ?? [];
}

export async function getMovimentacoes(limit = 50): Promise<MovimentacaoRow[]> {
  const sel = 'id, numero, tipo, unidade_id, referencia_tipo, observacao, created_at, documento:concremrh_estoque_entrada_documentos(id, storage_key, nome_original)';
  const rows = unwrap<MovimentacaoRow[]>(
    await db.from('concremrh_estoque_movimentacoes').select(sel).order('created_at', { ascending: false }).limit(limit),
  ) ?? [];
  // O embed 1-1 (unique em movimentacao_id) pode vir como objeto; normaliza p/ array.
  return rows.map((r) => ({ ...r, documento: normalizarDocumento((r as { documento?: unknown }).documento) }));
}

function normalizarDocumento(d: unknown): MovimentacaoRow['documento'] {
  if (!d) return null;
  return Array.isArray(d) ? d : [d as { id: string; storage_key: string; nome_original: string }];
}

export async function getEntregas(limit = 50): Promise<EntregaRow[]> {
  const sel = 'id, recibo, funcionario_id, unidade_id, tipo, status, created_at, funcionario:concremrh_funcionarios(nome), itens:concremrh_estoque_entrega_itens(variante_id, quantidade, variante:concremrh_estoque_variantes(nome, codigo_interno))';
  return unwrap<EntregaRow[]>(await db.from('concremrh_estoque_entregas').select(sel).eq('status', 'CONFIRMADA').order('created_at', { ascending: false }).limit(limit)) ?? [];
}

export interface ReciboItem { nome: string; codigo: string; quantidade: number; custoUnitario: number }
export interface ReciboEntrega {
  id: string;
  recibo: string;
  tipo: string;
  valorCompra: number | null;
  createdAt: string;
  colaboradorNome: string;
  operadorNome: string;
  unidadeNome: string;
  itens: ReciboItem[];
}

const primeiro = <T,>(x: T | T[] | null | undefined): T | undefined => (Array.isArray(x) ? x[0] : (x ?? undefined));

/**
 * NOME DO RESPONSÁVEL: os joins abaixo apontam para a view
 * `concremrh_usuarios_nomes` (id, nome), e NÃO para `concremrh_usuarios`.
 *
 * Motivo: a policy de leitura da tabela é `is_admin()`, então para usuário não
 * administrador o join na tabela volta vazio e a interface mostra "—" no lugar
 * do responsável. A view expõe só o nome e executa com privilégios do dono.
 * Ver supabase/migrations/20260921000000_usuarios_nomes_view.sql.
 */

/** Dados completos de uma entrega para emissão do recibo (colaborador, operador, itens c/ código e custo). */
export async function getEntregaRecibo(entregaId: string): Promise<ReciboEntrega> {
  const sel = 'id, recibo, tipo, valor_compra, created_at, funcionario:concremrh_funcionarios(nome), operador:concremrh_usuarios_nomes(nome), unidade:concremrh_estoque_unidades(nome), itens:concremrh_estoque_entrega_itens(quantidade, variante:concremrh_estoque_variantes(nome, codigo_interno, custo_unitario))';
  const row = unwrap<Record<string, unknown>>(await db.from('concremrh_estoque_entregas').select(sel).eq('id', entregaId).single());
  const func = primeiro(row.funcionario as { nome?: string });
  const oper = primeiro(row.operador as { nome?: string });
  const und = primeiro(row.unidade as { nome?: string });
  const itensRaw = (row.itens as Array<{ quantidade: number; variante?: unknown }>) ?? [];
  return {
    id: String(row.id), recibo: String(row.recibo ?? ''), tipo: String(row.tipo ?? ''),
    valorCompra: row.valor_compra == null ? null : Number(row.valor_compra), createdAt: String(row.created_at),
    colaboradorNome: func?.nome ?? '—', operadorNome: oper?.nome ?? '—', unidadeNome: und?.nome ?? '—',
    itens: itensRaw.map((it) => {
      const v = primeiro(it.variante as { nome?: string; codigo_interno?: string; custo_unitario?: number });
      return { nome: v?.nome ?? 'Item', codigo: v?.codigo_interno ?? '—', quantidade: it.quantidade, custoUnitario: Number(v?.custo_unitario ?? 0) };
    }),
  };
}

export interface MedidasFuncionario { camisa: string | null; calca: string | null; calcado: string | null; observacoes: string | null }
/** Medidas cadastradas do colaborador (rótulos de tamanho). Retorna null se não houver cadastro. */
export async function getMedidasFuncionario(funcionarioId: string): Promise<MedidasFuncionario | null> {
  const sel = 'observacoes, camisa:tamanho_camisa_id(rotulo), calca:tamanho_calca_id(rotulo), calcado:tamanho_calcado_id(rotulo)';
  const { data, error } = await db.from('concremrh_estoque_funcionario_medidas').select(sel).eq('funcionario_id', funcionarioId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const r = data as Record<string, unknown>;
  return {
    camisa: primeiro(r.camisa as { rotulo?: string })?.rotulo ?? null,
    calca: primeiro(r.calca as { rotulo?: string })?.rotulo ?? null,
    calcado: primeiro(r.calcado as { rotulo?: string })?.rotulo ?? null,
    observacoes: (r.observacoes as string) ?? null,
  };
}

export interface EntregaFuncionario { id: string; recibo: string; tipo: string; status: string; createdAt: string; itens: number; pecas: number }
/** Entregas anteriores de um colaborador (histórico resumido). */
export async function getEntregasPorFuncionario(funcionarioId: string, limit = 5): Promise<EntregaFuncionario[]> {
  const sel = 'id, recibo, tipo, status, created_at, itens:concremrh_estoque_entrega_itens(quantidade)';
  const rows = unwrap<Array<Record<string, unknown>>>(await db.from('concremrh_estoque_entregas').select(sel).eq('funcionario_id', funcionarioId).order('created_at', { ascending: false }).limit(limit)) ?? [];
  return rows.map((r) => {
    const its = (r.itens as Array<{ quantidade: number }>) ?? [];
    return { id: String(r.id), recibo: String(r.recibo), tipo: String(r.tipo), status: String(r.status), createdAt: String(r.created_at), itens: its.length, pecas: its.reduce((a, i) => a + i.quantidade, 0) };
  });
}

/** Devoluções ATIVAS de uma entrega (para calcular o disponível por variante). */
export async function getDevolucoesAtivas(entregaId: string): Promise<DevolucaoAtivaRow[]> {
  return unwrap<DevolucaoAtivaRow[]>(await db.from('concremrh_estoque_devolucoes').select('variante_id, quantidade').eq('entrega_id', entregaId).eq('status', 'ATIVA')) ?? [];
}

/** Devoluções ATIVAS mais recentes (para a tela de Estornos). Unidade vem da entrega. */
export async function getDevolucoes(limit = 50): Promise<DevolucaoRow[]> {
  const sel = 'id, entrega_id, variante_id, quantidade, condicao, destino, status, created_at, variante:concremrh_estoque_variantes(nome, codigo_interno), entrega:concremrh_estoque_entregas(recibo, unidade_id)';
  return unwrap<DevolucaoRow[]>(await db.from('concremrh_estoque_devolucoes').select(sel).eq('status', 'ATIVA').order('created_at', { ascending: false }).limit(limit)) ?? [];
}

export interface DevolucaoDetalhe {
  id: string; varianteId: string; varianteNome: string; varianteCodigo: string;
  quantidade: number; condicao: string; destino: string; reestocado: boolean; status: string;
  createdAt: string; responsavel: string; recibo: string; funcionarioNome: string; unidadeId: string;
}

function mapDevolucaoDetalhe(r: Record<string, unknown>): DevolucaoDetalhe {
  const v = primeiro(r.variante as { nome?: string; codigo_interno?: string }) ?? {};
  const e = (primeiro(r.entrega as Record<string, unknown>) ?? {}) as Record<string, unknown>;
  return {
    id: String(r.id), varianteId: String(r.variante_id), varianteNome: v.nome ?? 'Item', varianteCodigo: v.codigo_interno ?? '—',
    quantidade: Number(r.quantidade), condicao: String(r.condicao), destino: String(r.destino),
    reestocado: r.reestocado === true, status: String(r.status), createdAt: String(r.created_at),
    responsavel: primeiro(r.responsavel as { nome?: string })?.nome ?? '—',
    recibo: String(e.recibo ?? ''), funcionarioNome: primeiro(e.funcionario as { nome?: string })?.nome ?? '—', unidadeId: String(e.unidade_id ?? ''),
  };
}

/** Devoluções de UMA entrega (histórico da entrega selecionada). */
export async function getDevolucoesDaEntrega(entregaId: string): Promise<DevolucaoDetalhe[]> {
  const sel = 'id, variante_id, quantidade, condicao, destino, reestocado, status, created_at, variante:concremrh_estoque_variantes(nome, codigo_interno), responsavel:concremrh_usuarios_nomes(nome), entrega:concremrh_estoque_entregas(recibo, unidade_id, funcionario:concremrh_funcionarios(nome))';
  const rows = unwrap<Array<Record<string, unknown>>>(await db.from('concremrh_estoque_devolucoes').select(sel).eq('entrega_id', entregaId).order('created_at', { ascending: false })) ?? [];
  return rows.map(mapDevolucaoDetalhe);
}

/** Devoluções recentes (todas as situações) — painel "últimas devoluções" + drawer. */
export async function getDevolucoesRecentes(limit = 15): Promise<DevolucaoDetalhe[]> {
  const sel = 'id, variante_id, quantidade, condicao, destino, reestocado, status, created_at, variante:concremrh_estoque_variantes(nome, codigo_interno), responsavel:concremrh_usuarios_nomes(nome), entrega:concremrh_estoque_entregas(recibo, unidade_id, funcionario:concremrh_funcionarios(nome))';
  const rows = unwrap<Array<Record<string, unknown>>>(await db.from('concremrh_estoque_devolucoes').select(sel).order('created_at', { ascending: false }).limit(limit)) ?? [];
  return rows.map(mapDevolucaoDetalhe);
}

export interface TrocaDetalhe {
  id: string; createdAt: string; motivo: string; quantidade: number;
  colaborador: string; unidadeId: string; recibo: string; novoRecibo: string;
  itemAntigo: string; itemAntigoCodigo: string; itemNovo: string; itemNovoCodigo: string;
}

function mapTroca(r: Record<string, unknown>): TrocaDetalhe {
  const dev = (primeiro(r.devolucao as Record<string, unknown>) ?? {}) as Record<string, unknown>;
  const nova = (primeiro(r.nova_entrega as Record<string, unknown>) ?? {}) as Record<string, unknown>;
  const orig = (primeiro(r.entrega_original as Record<string, unknown>) ?? {}) as Record<string, unknown>;
  const vAntigo = primeiro(dev.variante as { nome?: string; codigo_interno?: string }) ?? {};
  const itensNova = (nova.itens as Array<{ quantidade: number; variante?: unknown }>) ?? [];
  const vNovo = primeiro(itensNova[0]?.variante as { nome?: string; codigo_interno?: string }) ?? {};
  const devEntrega = (primeiro(dev.entrega as Record<string, unknown>) ?? {}) as Record<string, unknown>;
  return {
    id: String(r.id), createdAt: String(r.created_at), motivo: String(r.motivo ?? ''), quantidade: Number(dev.quantidade ?? 0),
    colaborador: primeiro(nova.funcionario as { nome?: string })?.nome ?? '—', unidadeId: String(devEntrega.unidade_id ?? nova.unidade_id ?? ''),
    recibo: String(orig.recibo ?? ''), novoRecibo: String(nova.recibo ?? ''),
    itemAntigo: vAntigo.nome ?? 'Item', itemAntigoCodigo: vAntigo.codigo_interno ?? '', itemNovo: vNovo.nome ?? 'Item', itemNovoCodigo: vNovo.codigo_interno ?? '',
  };
}

const SEL_TROCA = 'id, motivo, created_at, entrega_original:concremrh_estoque_entregas!concremrh_estoque_trocas_entrega_original_id_fkey(recibo), devolucao:concremrh_estoque_devolucoes(quantidade, variante:concremrh_estoque_variantes(nome, codigo_interno), entrega:concremrh_estoque_entregas(unidade_id)), nova_entrega:concremrh_estoque_entregas!concremrh_estoque_trocas_nova_entrega_id_fkey(recibo, unidade_id, funcionario:concremrh_funcionarios(nome), itens:concremrh_estoque_entrega_itens(quantidade, variante:concremrh_estoque_variantes(nome, codigo_interno)))';

export async function getTrocasDaEntrega(entregaId: string): Promise<TrocaDetalhe[]> {
  const rows = unwrap<Array<Record<string, unknown>>>(await db.from('concremrh_estoque_trocas').select(SEL_TROCA).eq('entrega_original_id', entregaId).order('created_at', { ascending: false })) ?? [];
  return rows.map(mapTroca);
}
export async function getTrocasRecentes(limit = 15): Promise<TrocaDetalhe[]> {
  const rows = unwrap<Array<Record<string, unknown>>>(await db.from('concremrh_estoque_trocas').select(SEL_TROCA).order('created_at', { ascending: false }).limit(limit)) ?? [];
  return rows.map(mapTroca);
}

// ── Movimentações detalhadas (com itens + operador) — para tela de Fardamentos ──
export interface MovItemDet { varianteId: string; quantidade: number; direcao: 'IN' | 'OUT'; saldoAnterior: number; saldoPosterior: number }
export interface MovDetalhada {
  id: string; numero: string; tipo: string; unidadeId: string; observacao: string | null; createdAt: string; operadorNome: string;
  referenciaTipo: string | null; referenciaId: string | null; operacaoId: string | null;
  itens: MovItemDet[]; documento?: { id: string; storage_key: string; nome_original: string } | null;
}

function mapItens(itens: unknown): MovItemDet[] {
  return ((itens as Array<Record<string, unknown>>) ?? []).map((it) => ({
    varianteId: String(it.variante_id), quantidade: Number(it.quantidade), direcao: (it.direcao as 'IN' | 'OUT'),
    saldoAnterior: Number(it.saldo_anterior), saldoPosterior: Number(it.saldo_posterior),
  }));
}

/** Movimentações recentes com itens embutidos + operador. Alimenta última-movimentação, atividade e drawer. */
/** Faixa [inicio, fim) para consultar um período específico no SERVIDOR. */
export interface MovPeriodo { inicio: Date; fim: Date }

/**
 * Movimentações detalhadas. Sem `periodo`, traz as `limit` mais recentes.
 *
 * Com `periodo`, filtra no SERVIDOR pela faixa — é o que permite consultar um
 * mês antigo sem depender da janela das mais recentes (que, com o histórico
 * grande, não alcançaria aquele mês e devolveria vazio sem avisar).
 */
export async function getMovimentacoesDetalhadas(limit = 300, periodo?: MovPeriodo): Promise<MovDetalhada[]> {
  const sel = 'id, numero, tipo, unidade_id, observacao, created_at, referencia_tipo, referencia_id, operacao_id, operador:concremrh_usuarios_nomes(nome), itens:concremrh_estoque_movimentacao_itens(variante_id, quantidade, direcao, saldo_anterior, saldo_posterior), documento:concremrh_estoque_entrada_documentos(id, storage_key, nome_original)';
  let q = db.from('concremrh_estoque_movimentacoes').select(sel).order('created_at', { ascending: false }).limit(limit);
  // `lt` no fim (exclusivo) evita perder o último instante do período.
  if (periodo) q = q.gte('created_at', periodo.inicio.toISOString()).lt('created_at', periodo.fim.toISOString());
  const rows = unwrap<Array<Record<string, unknown>>>(await q) ?? [];
  return rows.map((r) => ({
    id: String(r.id), numero: String(r.numero), tipo: String(r.tipo), unidadeId: String(r.unidade_id),
    observacao: (r.observacao as string) ?? null, createdAt: String(r.created_at),
    referenciaTipo: (r.referencia_tipo as string) ?? null, referenciaId: (r.referencia_id as string) ?? null, operacaoId: (r.operacao_id as string) ?? null,
    operadorNome: primeiro(r.operador as { nome?: string })?.nome ?? '—', itens: mapItens(r.itens),
    documento: primeiro(r.documento as { id: string; storage_key: string; nome_original: string }) ?? null,
  }));
}

/** Contagem de movimentações no mês corrente (indicador). */
export async function contarMovimentacoesMes(): Promise<number> {
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
  const { count, error } = await db.from('concremrh_estoque_movimentacoes').select('id', { count: 'exact', head: true }).gte('created_at', inicio);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export interface MovVariante { numero: string; tipo: string; unidadeId: string; observacao: string | null; createdAt: string; operadorNome: string; quantidade: number; direcao: 'IN' | 'OUT'; saldoAnterior: number; saldoPosterior: number }
/** Movimentações de UMA variante (drawer → aba Movimentações). */
export async function getMovimentacoesPorVariante(varianteId: string, limit = 100): Promise<MovVariante[]> {
  const sel = 'quantidade, direcao, saldo_anterior, saldo_posterior, movimentacao:concremrh_estoque_movimentacoes(numero, tipo, unidade_id, observacao, created_at, operador:concremrh_usuarios_nomes(nome))';
  const rows = unwrap<Array<Record<string, unknown>>>(await db.from('concremrh_estoque_movimentacao_itens').select(sel).eq('variante_id', varianteId).limit(limit)) ?? [];
  return rows.map((r) => {
    const m = (primeiro(r.movimentacao as Record<string, unknown>) ?? {}) as Record<string, unknown>;
    return {
      numero: String(m.numero ?? ''), tipo: String(m.tipo ?? ''), unidadeId: String(m.unidade_id ?? ''),
      observacao: (m.observacao as string) ?? null, createdAt: String(m.created_at ?? ''),
      operadorNome: primeiro(m.operador as { nome?: string })?.nome ?? '—',
      quantidade: Number(r.quantidade), direcao: (r.direcao as 'IN' | 'OUT'),
      saldoAnterior: Number(r.saldo_anterior), saldoPosterior: Number(r.saldo_posterior),
    };
  }).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export interface EntregaVariante { recibo: string; tipo: string; status: string; createdAt: string; funcionarioNome: string; quantidade: number }
/** Entregas que incluem UMA variante (drawer → aba Entregas). */
export async function getEntregasPorVariante(varianteId: string, limit = 100): Promise<EntregaVariante[]> {
  const sel = 'quantidade, entrega:concremrh_estoque_entregas(recibo, tipo, status, created_at, funcionario:concremrh_funcionarios(nome))';
  const rows = unwrap<Array<Record<string, unknown>>>(await db.from('concremrh_estoque_entrega_itens').select(sel).eq('variante_id', varianteId).limit(limit)) ?? [];
  return rows.map((r) => {
    const e = (primeiro(r.entrega as Record<string, unknown>) ?? {}) as Record<string, unknown>;
    return {
      recibo: String(e.recibo ?? ''), tipo: String(e.tipo ?? ''), status: String(e.status ?? ''),
      createdAt: String(e.created_at ?? ''), funcionarioNome: primeiro(e.funcionario as { nome?: string })?.nome ?? '—',
      quantidade: Number(r.quantidade),
    };
  }).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export interface DevolucaoVariante { recibo: string; quantidade: number; condicao: string; destino: string; status: string; createdAt: string }
/** Devoluções de UMA variante (drawer → aba Devoluções). */
export async function getDevolucoesPorVariante(varianteId: string, limit = 100): Promise<DevolucaoVariante[]> {
  const sel = 'quantidade, condicao, destino, status, created_at, entrega:concremrh_estoque_entregas(recibo)';
  const rows = unwrap<Array<Record<string, unknown>>>(await db.from('concremrh_estoque_devolucoes').select(sel).eq('variante_id', varianteId).order('created_at', { ascending: false }).limit(limit)) ?? [];
  return rows.map((r) => ({
    recibo: primeiro(r.entrega as { recibo?: string })?.recibo ?? '—',
    quantidade: Number(r.quantidade), condicao: String(r.condicao), destino: String(r.destino),
    status: String(r.status), createdAt: String(r.created_at),
  }));
}

// ── Mutações (RPCs transacionais; operacao_id gerado no cliente p/ idempotência) ──
export async function registrarEntrada(input: {
  unidadeId: string; dataEntrada: string; itens: ItemInput[];
  fornecedorId?: string | null; observacao?: string | null; documento?: DocumentoEntrada | null;
}): Promise<unknown> {
  return unwrap(await db.rpc('estoque_registrar_entrada', {
    p_operacao_id: novaOperacaoId(), p_unidade_id: input.unidadeId, p_data_entrada: input.dataEntrada,
    p_itens: input.itens, p_fornecedor_id: input.fornecedorId ?? null, p_observacao: input.observacao ?? null,
    p_documento: input.documento ?? null,
  }));
}

export async function registrarEntrega(input: {
  funcionarioId: string; unidadeId: string; tipo: string; itens: ItemInput[]; motivo?: string; valorCompra?: number | null;
}): Promise<unknown> {
  return unwrap(await db.rpc('estoque_registrar_entrega', {
    p_operacao_id: novaOperacaoId(), p_funcionario_id: input.funcionarioId, p_unidade_id: input.unidadeId,
    p_tipo: input.tipo, p_itens: input.itens, p_motivo: input.motivo ?? '', p_valor_compra: input.valorCompra ?? null,
  }));
}

export async function registrarDevolucao(input: {
  entregaId: string; varianteId: string; unidadeId: string; quantidade: number; condicao: string; destino: string; motivo?: string;
}): Promise<unknown> {
  return unwrap(await db.rpc('estoque_registrar_devolucao', {
    p_operacao_id: novaOperacaoId(), p_entrega_id: input.entregaId, p_variante_id: input.varianteId,
    p_unidade_id: input.unidadeId, p_quantidade: input.quantidade, p_condicao: input.condicao, p_destino: input.destino, p_motivo: input.motivo ?? '',
  }));
}

export async function registrarTroca(input: {
  entregaOriginalId: string; unidadeId: string; varianteDevolvida: string; varianteNova: string; quantidade: number; motivo: string;
}): Promise<unknown> {
  return unwrap(await db.rpc('estoque_registrar_troca', {
    p_operacao_id: novaOperacaoId(), p_entrega_original_id: input.entregaOriginalId, p_unidade_id: input.unidadeId,
    p_variante_devolvida: input.varianteDevolvida, p_variante_nova: input.varianteNova, p_quantidade: input.quantidade, p_motivo: input.motivo,
  }));
}

export async function ajustarSaldo(input: { varianteId: string; unidadeId: string; saldoContado: number; motivo: string }): Promise<unknown> {
  return unwrap(await db.rpc('estoque_ajustar_saldo', {
    p_operacao_id: novaOperacaoId(), p_variante_id: input.varianteId, p_unidade_id: input.unidadeId,
    p_saldo_contado: input.saldoContado, p_motivo: input.motivo,
  }));
}

export async function cancelarEntrega(input: { entregaId: string; motivo: string }): Promise<unknown> {
  return unwrap(await db.rpc('estoque_cancelar_entrega', { p_operacao_id: novaOperacaoId(), p_entrega_id: input.entregaId, p_motivo: input.motivo }));
}

export async function estornarDevolucao(input: { devolucaoId: string; unidadeId: string; motivo: string }): Promise<unknown> {
  return unwrap(await db.rpc('estoque_estornar_devolucao', {
    p_operacao_id: novaOperacaoId(), p_devolucao_id: input.devolucaoId, p_unidade_id: input.unidadeId, p_motivo: input.motivo,
  }));
}
