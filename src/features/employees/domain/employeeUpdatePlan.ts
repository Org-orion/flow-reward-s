// Plano de ATUALIZAÇÃO de cadastro a partir de planilha — PURO.
//
// O importador existente só INSERE: quando o código já está no banco, ele marca
// a linha como duplicada e pula. Este módulo resolve o caso oposto — completar
// o cadastro de quem já existe.
//
// REGRA CENTRAL (segurança do dado): por padrão só preenche campo VAZIO. Um
// valor que já está no cadastro nunca é trocado em silêncio; divergências são
// listadas para o operador e só entram se ele ligar a substituição
// explicitamente. Sem isso, um arquivo desatualizado sobrescreveria, sem aviso,
// dados corretos de centenas de funcionários.

import type { Funcionario } from '@/hooks/useFuncionarios';

/** Campos de cadastro que a planilha pode completar. */
export type CampoAtualizavel =
  | 'empresa_id' | 'setor_id' | 'funcao_id' | 'categoria_id'
  | 'base_premiacao_id' | 'faixa_id' | 'local_dss_id'
  | 'data_admissao' | 'nome' | 'status';

export const CAMPO_ROTULO: Record<CampoAtualizavel, string> = {
  empresa_id: 'Empresa',
  setor_id: 'Setor',
  funcao_id: 'Função',
  categoria_id: 'Categoria',
  base_premiacao_id: 'Base de Premiação',
  faixa_id: 'Faixa',
  local_dss_id: 'Local DSS',
  data_admissao: 'Data de admissão',
  nome: 'Nome',
  status: 'Status',
};

/**
 * Ordem de exibição. Os sete primeiros são os que a tela conta como "cadastro
 * incompleto" (ver employeeCompletion) — por isso vêm antes.
 */
export const CAMPOS_ATUALIZAVEIS: CampoAtualizavel[] = [
  'empresa_id', 'setor_id', 'funcao_id', 'categoria_id',
  'base_premiacao_id', 'faixa_id', 'local_dss_id',
  'data_admissao', 'nome', 'status',
];

/** Valores vindos da planilha, já resolvidos para id (ou null quando ausentes). */
export type ValoresDoArquivo = Partial<Record<CampoAtualizavel, string | null>>;

export type TipoMudanca = 'preenche' | 'diverge';

export interface Mudanca {
  campo: CampoAtualizavel;
  rotulo: string;
  /** Valor atual no cadastro (null = vazio). */
  de: string | null;
  /** Valor que a planilha traz. */
  para: string;
  tipo: TipoMudanca;
}

export interface PlanoAtualizacao {
  /** Campos que serão gravados. Vazio = nada a fazer nesta linha. */
  patch: Partial<Record<CampoAtualizavel, string>>;
  /** Campos vazios que serão preenchidos. */
  preenchimentos: Mudanca[];
  /** Campos cujo valor do arquivo difere do cadastro. */
  divergencias: Mudanca[];
}

const vazio = (v: unknown): boolean => v === null || v === undefined || String(v).trim() === '';

/** Lê o valor atual do funcionário para um campo, normalizando vazio para null. */
function valorAtual(f: Funcionario, campo: CampoAtualizavel): string | null {
  // Setor tem duas representações no cadastro: `setor_id` e `setor_ids[]`. Se
  // qualquer uma estiver preenchida, o setor NÃO está vazio — tratar só o
  // `setor_id` faria o importador "preencher" quem já tem setor via lista.
  if (campo === 'setor_id') {
    const multi = (f as { setor_ids?: string[] | null }).setor_ids;
    if (Array.isArray(multi) && multi.length > 0) return multi[0];
    return vazio(f.setor_id) ? null : String(f.setor_id);
  }
  const v = (f as unknown as Record<string, unknown>)[campo];
  return vazio(v) ? null : String(v);
}

export interface OpcoesPlano {
  /** true = também troca valores já preenchidos que divergem do arquivo. */
  sobrescrever: boolean;
}

/**
 * Monta o plano de atualização de UM funcionário.
 *
 * `patch` só contém o que de fato muda: campo ausente na planilha não zera o
 * cadastro, e campo igual ao que já está gravado não gera escrita.
 */
export function planejarAtualizacao(
  atual: Funcionario,
  doArquivo: ValoresDoArquivo,
  opcoes: OpcoesPlano = { sobrescrever: false },
): PlanoAtualizacao {
  const patch: Partial<Record<CampoAtualizavel, string>> = {};
  const preenchimentos: Mudanca[] = [];
  const divergencias: Mudanca[] = [];

  for (const campo of CAMPOS_ATUALIZAVEIS) {
    const novo = doArquivo[campo];
    if (vazio(novo)) continue;                 // planilha não trouxe: não mexe
    const para = String(novo).trim();
    const de = valorAtual(atual, campo);

    if (de === null) {
      patch[campo] = para;
      preenchimentos.push({ campo, rotulo: CAMPO_ROTULO[campo], de: null, para, tipo: 'preenche' });
      continue;
    }
    if (de === para) continue;                 // já está igual: nada a gravar

    divergencias.push({ campo, rotulo: CAMPO_ROTULO[campo], de, para, tipo: 'diverge' });
    if (opcoes.sobrescrever) patch[campo] = para;
  }

  return { patch, preenchimentos, divergencias };
}

/** Há algo a gravar? */
export function temMudanca(plano: PlanoAtualizacao): boolean {
  return Object.keys(plano.patch).length > 0;
}
