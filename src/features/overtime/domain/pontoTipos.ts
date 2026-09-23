// Tipos compartilhados da leitura do ponto — PURO, sem dependência de planilha.
import type { Faixa } from './faixas';

export type LayoutPonto = 'A' | 'B';

/** Célula crua da planilha, já convertida para texto pela camada de leitura. */
export type CelulaCrua = string | null | undefined;
export type LinhaCrua = CelulaCrua[];

/** Uma aba da planilha, como a camada de leitura entrega ao parser. */
export interface AbaCrua {
  nome: string;
  linhas: LinhaCrua[];
}

/** Um funcionário em um dia, exatamente como veio do arquivo. */
export interface LancamentoBruto {
  matricula: string;
  nome: string;
  departamentoCodigo: string;
  /** ISO YYYY-MM-DD. */
  data: string;
  ent1: string | null; sai1: string | null;
  ent2: string | null; sai2: string | null;
  ent3: string | null; sai3: string | null;
  /** Rótulo do afastamento (FALTA, FÉRIAS, ...), SEM REGISTRO, ou null. */
  statusAfastamento: string | null;
  normaisMin: number;
  faltasMin: number;
  extrasMin: number;
  cargaMin: number;
  /** Linha de origem (base 1) — usada nas mensagens de erro ao operador. */
  linha: number;
}

/** Linha SUBTOTAL de um departamento, para conferência. */
export interface SubtotalArquivo {
  departamentoCodigo: string;
  funcionarios: number | null;
  normaisMin: number;
  faltasMin: number;
  extrasMin: number;
  cargaMin: number;
}

/** Linha TOTAL GERAL do arquivo, para conferência. */
export interface TotalArquivo {
  funcionarios: number | null;
  normaisMin: number;
  faltasMin: number;
  extrasMin: number;
  cargaMin: number;
}

export interface ArquivoPonto {
  layout: LayoutPonto;
  /** Menor e maior data encontradas (iguais no ponto diário). */
  dataInicio: string;
  dataFim: string;
  lancamentos: LancamentoBruto[];
  subtotais: SubtotalArquivo[];
  totalGeral: TotalArquivo | null;
  /** Códigos na ordem de aparição no arquivo. */
  departamentos: string[];
  /** Observações não bloqueantes (ex.: departamento fora do mapa). */
  avisos: string[];
}

/** Lançamento já resolvido para uso nas telas e relatórios. */
export interface Lancamento {
  id?: string;
  matricula: string;
  nome: string;
  departamentoCodigo: string;
  departamentoNome: string;
  data: string;
  ent1: string | null; sai1: string | null;
  ent2: string | null; sai2: string | null;
  ent3: string | null; sai3: string | null;
  statusAfastamento: string | null;
  normaisMin: number;
  faltasMin: number;
  extrasMin: number;
  cargaMin: number;
  faixa: Faixa;
}

/**
 * Erro de importação com mensagem escrita para o RH, não para quem programa.
 * A tela mostra `message` diretamente.
 */
export class ErroImportacao extends Error {
  constructor(message: string, readonly detalhe?: string) {
    super(message);
    this.name = 'ErroImportacao';
  }
}
