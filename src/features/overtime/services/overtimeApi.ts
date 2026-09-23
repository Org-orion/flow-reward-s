import { supabase } from '@/integrations/supabase/client';
import { classificarFaixa, LIMITES_PADRAO, type LimitesFaixa } from '../domain/faixas';
import { rotuloDepartamento } from '../domain/departamentos';
import type { ArquivoPonto, Lancamento, LancamentoBruto } from '../domain/pontoTipos';
import type { ResultadoConciliacao } from '../domain/conciliacao';

/**
 * Camada de acesso a dados do módulo Horas Extras. As tabelas
 * `concremrh_ponto_*` não estão no types.ts gerado → `(supabase as any)`, mesmo
 * padrão de inventoryApi. A gravação passa pela RPC transacional
 * `concremrh_ponto_importar`; as leituras respeitam a RLS da seção
 * `horas_extras`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function unwrap<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// ---------------------------------------------------------------- tipos

export interface DepartamentoRow {
  id: string;
  codigo_origem: string;
  nome_exibicao: string;
  ativo: boolean;
}

export interface ImportacaoRow {
  id: string;
  arquivo_nome: string;
  layout: 'A' | 'B';
  data_referencia_inicio: string;
  data_referencia_fim: string;
  qtd_registros: number;
  total_extras_min: number;
  conciliacao_ok: boolean;
  conciliacao_detalhe: Record<string, unknown>;
  forcada: boolean;
  usuario_id: string | null;
  substituiu_importacao_id: string | null;
  created_at: string;
  /** Preenchido pela view de nomes (não expõe a tabela de usuários). */
  responsavel?: string | null;
}

export interface ConfigRow {
  id: string;
  faixa_verde_max_min: number;
  faixa_amarela_max_min: number;
  jornadas: Record<string, string>;
  destinatarios_email: string[];
  logo_url: string | null;
  rodape: string | null;
}

export interface RelatorioRow {
  id: string;
  tipo: string;
  parametros: Record<string, unknown>;
  periodo_inicio: string;
  periodo_fim: string;
  arquivo_nome: string;
  created_at: string;
  enviado_em: string | null;
  responsavel?: string | null;
}

// ---------------------------------------------------------------- config

export async function getConfig(): Promise<ConfigRow | null> {
  const rows = unwrap<ConfigRow[]>(
    await db.from('concremrh_ponto_config').select('*').limit(1),
  );
  return rows?.[0] ?? null;
}

export function limitesDaConfig(config: ConfigRow | null): LimitesFaixa {
  if (!config) return LIMITES_PADRAO;
  return { verdeMaxMin: config.faixa_verde_max_min, amareloMaxMin: config.faixa_amarela_max_min };
}

export async function salvarConfig(id: string, patch: Partial<ConfigRow>): Promise<void> {
  const res = await db
    .from('concremrh_ponto_config')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

// ---------------------------------------------------------------- cadastros

export async function listarDepartamentos(): Promise<DepartamentoRow[]> {
  return unwrap<DepartamentoRow[]>(
    await db.from('concremrh_ponto_departamentos').select('*').order('nome_exibicao'),
  ) ?? [];
}

export async function renomearDepartamento(id: string, nome: string): Promise<void> {
  const res = await db
    .from('concremrh_ponto_departamentos')
    .update({ nome_exibicao: nome, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

// ---------------------------------------------------------------- importações

const SEL_IMPORTACAO = `
  id, arquivo_nome, layout, data_referencia_inicio, data_referencia_fim,
  qtd_registros, total_extras_min, conciliacao_ok, conciliacao_detalhe, forcada,
  usuario_id, substituiu_importacao_id, created_at
`;

/**
 * Resolve o nome de quem operou, em UMA consulta à view de projeção mínima
 * (`concremrh_usuarios_nomes`, só id e nome). A tabela `concremrh_usuarios` é
 * legível apenas por administrador e guarda senha_hash — ela não entra aqui.
 *
 * A busca é feita à parte, e não como embedding do PostgREST, porque
 * relacionamento embutido com VIEW depende de inferência do PostgREST; uma
 * segunda consulta por ids é previsível e continua sem N+1.
 */
async function anexarResponsavel<T extends { usuario_id?: string | null }>(rows: T[]): Promise<(T & { responsavel: string | null })[]> {
  const ids = [...new Set(rows.map((r) => r.usuario_id).filter(Boolean))] as string[];
  const nomes = new Map<string, string>();

  if (ids.length) {
    // Falha aqui NÃO derruba a consulta: o nome é enfeite, a lista é o dado.
    // Se a view não existir no ambiente, a coluna mostra "—" e o resto funciona.
    const { data, error } = await db.from('concremrh_usuarios_nomes').select('id, nome').in('id', ids);
    if (error) console.warn('concremrh_usuarios_nomes indisponível:', error.message);
    else for (const u of (data ?? []) as { id: string; nome: string }[]) nomes.set(u.id, u.nome);
  }

  return rows.map((r) => ({ ...r, responsavel: r.usuario_id ? nomes.get(r.usuario_id) ?? null : null }));
}

export async function listarImportacoes(limite = 100): Promise<ImportacaoRow[]> {
  const rows = unwrap<ImportacaoRow[]>(
    await db.from('concremrh_ponto_importacoes')
      .select(SEL_IMPORTACAO)
      .order('created_at', { ascending: false })
      .limit(limite),
  ) ?? [];
  return anexarResponsavel(rows);
}

/** Importações que cobrem o período — usadas para a nota de conciliação. */
export async function importacoesDoPeriodo(inicio: string, fim: string): Promise<ImportacaoRow[]> {
  const rows = unwrap<ImportacaoRow[]>(
    await db.from('concremrh_ponto_importacoes')
      .select(SEL_IMPORTACAO)
      .lte('data_referencia_inicio', fim)
      .gte('data_referencia_fim', inicio)
      .order('created_at', { ascending: false }),
  ) ?? [];
  return anexarResponsavel(rows);
}

/** Já existe importação cobrindo este período? Usado no aviso de substituição. */
export async function importacaoExistente(inicio: string, fim: string): Promise<ImportacaoRow | null> {
  const rows = await importacoesDoPeriodo(inicio, fim);
  return rows[0] ?? null;
}

export async function excluirImportacao(id: string): Promise<void> {
  const res = await db.from('concremrh_ponto_importacoes').delete().eq('id', id);
  if (res.error) throw new Error(res.error.message);
}

// ---------------------------------------------------------------- gravação

export interface ResultadoImportacao {
  ok: boolean;
  importacao_id: string;
  substituiu: string | null;
  registros: number;
  total_extras_min: number;
}

/**
 * Grava a importação. O payload leva a FAIXA já calculada: ela é derivada e
 * persistida para que o banco possa indexar as ocorrências acima do limite sem
 * reimplementar a regra do semáforo em SQL.
 */
export async function gravarImportacao(params: {
  arquivo: ArquivoPonto;
  arquivoNome: string;
  conciliacao: ResultadoConciliacao;
  forcada: boolean;
  limites: LimitesFaixa;
}): Promise<ResultadoImportacao> {
  const { arquivo, arquivoNome, conciliacao, forcada, limites } = params;

  const lancamentos = arquivo.lancamentos.map((l: LancamentoBruto) => ({
    matricula: l.matricula,
    nome: l.nome,
    departamento: l.departamentoCodigo,
    data: l.data,
    ent1: l.ent1, sai1: l.sai1, ent2: l.ent2, sai2: l.sai2, ent3: l.ent3, sai3: l.sai3,
    status_afastamento: l.statusAfastamento,
    normais_min: l.normaisMin,
    faltas_min: l.faltasMin,
    extras_min: l.extrasMin,
    carga_min: l.cargaMin,
    faixa: classificarFaixa(l.extrasMin, limites),
  }));

  const { data, error } = await db.rpc('concremrh_ponto_importar', {
    p_arquivo_nome: arquivoNome,
    p_layout: arquivo.layout,
    p_inicio: arquivo.dataInicio,
    p_fim: arquivo.dataFim,
    p_conciliacao_ok: conciliacao.ok,
    p_conciliacao_detalhe: {
      conferencias: conciliacao.conferencias,
      divergencias: conciliacao.divergencias,
      sem_referencia: conciliacao.semReferencia,
      avisos: arquivo.avisos,
    },
    p_forcada: forcada,
    p_lancamentos: lancamentos,
  });
  if (error) throw new Error(error.message);
  return data as ResultadoImportacao;
}

// ---------------------------------------------------------------- consulta

interface LancamentoDb {
  id: string;
  data: string;
  ent1: string | null; sai1: string | null;
  ent2: string | null; sai2: string | null;
  ent3: string | null; sai3: string | null;
  status_afastamento: string | null;
  normais_min: number; faltas_min: number; extras_min: number; carga_min: number;
  faixa: Lancamento['faixa'];
  concremrh_ponto_funcionarios: { matricula: string; nome: string } | null;
  concremrh_ponto_departamentos: { codigo_origem: string; nome_exibicao: string } | null;
}

const SEL_LANCAMENTO = `
  id, data, ent1, sai1, ent2, sai2, ent3, sai3, status_afastamento,
  normais_min, faltas_min, extras_min, carga_min, faixa,
  concremrh_ponto_funcionarios(matricula, nome),
  concremrh_ponto_departamentos(codigo_origem, nome_exibicao)
`;

/** PostgREST devolve no máximo 1000 linhas por padrão; um dia tem ~500. */
const PAGINA = 1000;

/**
 * Lançamentos de um período. O recorte por DATA é feito no servidor: trazer o
 * histórico inteiro para o navegador só para filtrar depois não escala e expõe
 * dado pessoal sem necessidade.
 */
export async function listarLancamentos(inicio: string, fim: string): Promise<Lancamento[]> {
  const saida: Lancamento[] = [];
  for (let offset = 0; ; offset += PAGINA) {
    const rows = unwrap<LancamentoDb[]>(
      await db.from('concremrh_ponto_lancamentos')
        .select(SEL_LANCAMENTO)
        .gte('data', inicio)
        .lte('data', fim)
        .order('data')
        .order('extras_min', { ascending: false })
        .range(offset, offset + PAGINA - 1),
    ) ?? [];

    for (const r of rows) saida.push(paraLancamento(r));
    if (rows.length < PAGINA) break;
  }
  return saida;
}

function paraLancamento(r: LancamentoDb): Lancamento {
  const codigo = r.concremrh_ponto_departamentos?.codigo_origem ?? '';
  return {
    id: r.id,
    matricula: r.concremrh_ponto_funcionarios?.matricula ?? '',
    nome: r.concremrh_ponto_funcionarios?.nome ?? '',
    departamentoCodigo: codigo,
    departamentoNome: r.concremrh_ponto_departamentos?.nome_exibicao || rotuloDepartamento(codigo),
    data: r.data,
    ent1: r.ent1, sai1: r.sai1, ent2: r.ent2, sai2: r.sai2, ent3: r.ent3, sai3: r.sai3,
    statusAfastamento: r.status_afastamento,
    normaisMin: r.normais_min,
    faltasMin: r.faltas_min,
    extrasMin: r.extras_min,
    cargaMin: r.carga_min,
    faixa: r.faixa,
  };
}

/** Datas que já têm ponto importado — alimenta os atalhos de período. */
export async function datasDisponiveis(): Promise<{ min: string | null; max: string | null }> {
  const min = unwrap<{ data: string }[]>(
    await db.from('concremrh_ponto_lancamentos').select('data').order('data').limit(1),
  );
  const max = unwrap<{ data: string }[]>(
    await db.from('concremrh_ponto_lancamentos').select('data').order('data', { ascending: false }).limit(1),
  );
  return { min: min?.[0]?.data ?? null, max: max?.[0]?.data ?? null };
}

// ---------------------------------------------------------------- relatórios

/**
 * Registra a geração para auditoria — exigência de LGPD: dado de ponto é dado
 * pessoal, e precisa ficar registrado quem exportou o quê.
 *
 * `usuario_id` NÃO é enviado pelo cliente: a coluna tem default
 * `concremrh_usuario_atual_id()`, resolvido no servidor a partir de auth.uid().
 * Deixar o cliente informar quem ele é tornaria o log falsificável.
 */
export async function registrarRelatorio(params: {
  tipo: string;
  parametros: Record<string, unknown>;
  inicio: string;
  fim: string;
  arquivoNome: string;
}): Promise<void> {
  const res = await db.from('concremrh_ponto_relatorios').insert({
    tipo: params.tipo,
    parametros: params.parametros,
    periodo_inicio: params.inicio,
    periodo_fim: params.fim,
    arquivo_nome: params.arquivoNome,
  });
  if (res.error) throw new Error(res.error.message);
}

export async function listarRelatorios(limite = 50): Promise<RelatorioRow[]> {
  const rows = unwrap<(RelatorioRow & { usuario_id: string | null })[]>(
    await db.from('concremrh_ponto_relatorios')
      .select('id, tipo, parametros, periodo_inicio, periodo_fim, arquivo_nome, created_at, enviado_em, usuario_id')
      .order('created_at', { ascending: false })
      .limit(limite),
  ) ?? [];
  return anexarResponsavel(rows);
}
