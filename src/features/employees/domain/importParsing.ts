// Leitura de planilha de funcionários — PURO.
//
// Extraído de useEmployeeImport para ser compartilhado com a importação de
// ATUALIZAÇÃO. Os apelidos de coluna precisam viver em UM lugar só: aceitar
// "cargo" como função em um importador e não no outro faria o mesmo arquivo
// funcionar num e falhar no outro, sem explicação para quem usa.
import * as XLSX from 'xlsx';

/** Normaliza texto para comparação (sem acento, sem pontuação, maiúsculo). */
export const normalize = (s?: string) =>
  (s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s]+/g, ' ').replace(/\s+/g, ' ').toUpperCase();

/** Normaliza o NOME DA COLUNA para casar com os apelidos aceitos. */
export const normalizeKey = (value: string) =>
  value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '');

/** Data em ISO (YYYY-MM-DD) a partir de Date, serial do Excel, ISO ou dd/mm/aaaa. */
export const parseDateISO = (value: unknown): string | null => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear(), m = String(value.getMonth() + 1).padStart(2, '0'), d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed?.y && parsed?.m && parsed?.d) {
      return `${String(parsed.y).padStart(4, '0')}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }
  const str = String(value).trim();
  if (!str) return null;
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
};

/** Índice nome normalizado → id. */
export const mapByNome = (lista: { id: string; nome: string }[]) => {
  const m = new Map<string, string>();
  lista.forEach((i) => m.set(normalize(i.nome), i.id));
  return m;
};

/** Campos brutos lidos de uma linha, já resolvidos pelos apelidos aceitos. */
export interface LinhaPlanilha {
  cod: string;
  nome: string;
  dataAdmissao: string | null;
  status: string;
  empresaId: string; empresaNome: string;
  setorId: string; setorNome: string;
  funcaoId: string; funcaoNome: string;
  categoriaId: string; categoriaNome: string;
  baseId: string; baseNome: string;
  faixaId: string; faixaNome: string;
  localDssId: string; localDssNome: string;
}

/**
 * Lê uma linha da planilha aceitando os apelidos de coluna usados na prática
 * (ex.: função pode vir como "funcao", "função" ou "cargo"; código pode vir
 * como "cod_funcionario", "matricula" ou "cpf").
 */
export function lerLinhaPlanilha(row: Record<string, unknown>): LinhaPlanilha {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) r[normalizeKey(k)] = v;
  const str = (v: unknown) => String(v ?? '').trim();

  return {
    cod: str(r.cod_funcionario || r.codigo_funcionario || r.codigo || r.matricula || r.cpf || r.cod),
    nome: str(r.nome || r.nome_funcionario || r.funcionario),
    dataAdmissao: parseDateISO(r.data_admissao || r.admissao || r.data_de_admissao),
    status: str(r.status || r.status_funcional),
    empresaId: str(r.empresa_id),
    empresaNome: str(r.empresa_nome || r.empresa || r.nome_empresa || r.empresas),
    setorId: str(r.setor_id),
    setorNome: str(r.setor_nome || r.setor),
    funcaoId: str(r.funcao_id),
    funcaoNome: str(r.funcao_nome || r.funcao || r.cargo),
    categoriaId: str(r.categoria_id),
    categoriaNome: str(r.categoria_nome || r.categoria),
    baseId: str(r.base_premiacao_id),
    baseNome: str(r.base_premiacao_nome || r.base_premiacao || r.base),
    faixaId: str(r.faixa_id),
    faixaNome: str(r.faixa_nome || r.faixa),
    localDssId: str(r.local_dss_id),
    localDssNome: str(r.local_dss_nome || r.local_dss || r.local),
  };
}

/** Índices de cadastro mestre usados para resolver nome → id. */
export interface IndicesRef {
  empresas: Map<string, string>;
  setores: Map<string, string>;
  funcoes: Map<string, string>;
  categorias: Map<string, string>;
  bases: Map<string, string>;
  faixas: Map<string, string>;
  locaisDSS: Map<string, string>;
}

export interface ReferenciaResolvida {
  id: string | null;
  /** Nome veio na planilha mas não existe no cadastro mestre. */
  naoEncontrado: boolean;
}

/** Resolve uma referência: id explícito tem prioridade; senão, busca pelo nome. */
export function resolverRef(id: string, nome: string, indice: Map<string, string>): ReferenciaResolvida {
  if (id) return { id, naoEncontrado: false };
  if (!nome) return { id: null, naoEncontrado: false };
  const achado = indice.get(normalize(nome));
  return { id: achado ?? null, naoEncontrado: !achado };
}
