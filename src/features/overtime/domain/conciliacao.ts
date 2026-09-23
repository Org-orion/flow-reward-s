// Conciliação da importação — PURO.
//
// Regra inegociável: toda importação é conferida contra as linhas SUBTOTAL (por
// departamento) e TOTAL GERAL do PRÓPRIO arquivo. Divergência bloqueia.
//
// Por que conferir contra o próprio arquivo, e não contra um cálculo nosso: o
// sistema não recalcula hora extra. A única pergunta legítima é "eu li tudo o
// que estava lá?" — e quem responde isso é o total que o Secullum imprimiu.

import { somaMin } from './tempo';
import type { ArquivoPonto, LancamentoBruto } from './pontoTipos';

export type EscopoConciliacao = 'departamento' | 'geral';
export type CampoConciliacao = 'extras' | 'normais' | 'faltas' | 'carga' | 'funcionarios';

export const CAMPO_ROTULO: Record<CampoConciliacao, string> = {
  extras: 'Horas extras',
  normais: 'Horas normais',
  faltas: 'Faltas',
  carga: 'Carga horária',
  funcionarios: 'Funcionários',
};

export interface DivergenciaConciliacao {
  escopo: EscopoConciliacao;
  /** Código do departamento, ou 'TOTAL GERAL'. */
  referencia: string;
  campo: CampoConciliacao;
  /** Valor impresso pelo Secullum. */
  esperado: number;
  /** Valor somado a partir das linhas que conseguimos ler. */
  calculado: number;
  /** calculado − esperado. Negativo = deixamos linha para trás. */
  delta: number;
}

export interface ResultadoConciliacao {
  ok: boolean;
  /** Quantas comparações foram feitas de fato. */
  conferencias: number;
  divergencias: DivergenciaConciliacao[];
  /** Departamentos sem linha SUBTOTAL no arquivo — não dá para conferir. */
  semReferencia: string[];
}

/** Campos comparados quando o arquivo traz a linha de total. */
const CAMPOS: { campo: CampoConciliacao; de: (l: LancamentoBruto) => number }[] = [
  { campo: 'extras', de: (l) => l.extrasMin },
  { campo: 'normais', de: (l) => l.normaisMin },
  { campo: 'faltas', de: (l) => l.faltasMin },
  { campo: 'carga', de: (l) => l.cargaMin },
];

function compara(
  escopo: EscopoConciliacao,
  referencia: string,
  campo: CampoConciliacao,
  esperado: number,
  calculado: number,
  fora: DivergenciaConciliacao[],
): void {
  if (esperado !== calculado) {
    fora.push({ escopo, referencia, campo, esperado, calculado, delta: calculado - esperado });
  }
}

/**
 * Confere o arquivo lido contra os seus próprios totais.
 *
 * Um SUBTOTAL zerado em NORMAIS/FALTAS não é comparado: o Secullum imprime
 * célula vazia quando o valor é zero, e vazio já foi lido como zero — comparar
 * seria conferir zero com zero e só gastar linha no relatório.
 */
export function conciliarArquivo(arquivo: ArquivoPonto): ResultadoConciliacao {
  const divergencias: DivergenciaConciliacao[] = [];
  const semReferencia: string[] = [];
  let conferencias = 0;

  const porDepartamento = new Map<string, LancamentoBruto[]>();
  for (const l of arquivo.lancamentos) {
    const lista = porDepartamento.get(l.departamentoCodigo);
    if (lista) lista.push(l);
    else porDepartamento.set(l.departamentoCodigo, [l]);
  }

  const comSubtotal = new Set(arquivo.subtotais.map((s) => s.departamentoCodigo));
  for (const codigo of porDepartamento.keys()) {
    if (!comSubtotal.has(codigo)) semReferencia.push(codigo);
  }

  for (const sub of arquivo.subtotais) {
    const lancs = porDepartamento.get(sub.departamentoCodigo) ?? [];
    for (const { campo, de } of CAMPOS) {
      const esperado = sub[`${campo}Min` as 'extrasMin' | 'normaisMin' | 'faltasMin' | 'cargaMin'];
      conferencias++;
      compara('departamento', sub.departamentoCodigo, campo, esperado, somaMin(lancs.map(de)), divergencias);
    }
    if (sub.funcionarios !== null) {
      conferencias++;
      compara('departamento', sub.departamentoCodigo, 'funcionarios', sub.funcionarios, lancs.length, divergencias);
    }
  }

  const total = arquivo.totalGeral;
  if (total) {
    for (const { campo, de } of CAMPOS) {
      const esperado = total[`${campo}Min` as 'extrasMin' | 'normaisMin' | 'faltasMin' | 'cargaMin'];
      conferencias++;
      compara('geral', 'TOTAL GERAL', campo, esperado, somaMin(arquivo.lancamentos.map(de)), divergencias);
    }
    if (total.funcionarios !== null) {
      conferencias++;
      compara('geral', 'TOTAL GERAL', 'funcionarios', total.funcionarios, arquivo.lancamentos.length, divergencias);
    }
  }

  return { ok: divergencias.length === 0, conferencias, divergencias, semReferencia };
}
