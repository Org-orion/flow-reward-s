// Nome dos arquivos gerados — PURO.
//
// O nome é a única etiqueta que sobrevive ao e-mail e à pasta compartilhada.
// Ele precisa dizer o período e o recorte sem depender de abrir o documento.

import type { VarianteRelatorio } from './relatorioHtml';

/** Remove acento e pontuação; mantém só letras, números e sublinhado. */
export function higienizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const partes = (iso: string): [string, string, string] => {
  const [a, m, d] = iso.split('-');
  return [d, m, a];
};

/**
 * Trecho de data. Dia único → `DD-MM-AAAA`. Intervalo no mesmo mês →
 * `DDaDD-MM-AAAA`. Meses diferentes → `DD-MM-AAAA_a_DD-MM-AAAA`, porque
 * `14a03-09-2026` seria ambíguo.
 */
export function trechoData(inicio: string, fim: string): string {
  if (!inicio && !fim) return 'sem-periodo';
  if (!fim || inicio === fim) {
    const [d, m, a] = partes(inicio);
    return `${d}-${m}-${a}`;
  }
  const [d1, m1, a1] = partes(inicio);
  const [d2, m2, a2] = partes(fim);
  if (m1 === m2 && a1 === a2) return `${d1}a${d2}-${m1}-${a1}`;
  return `${d1}-${m1}-${a1}_a_${d2}-${m2}-${a2}`;
}

export interface NomeRelatorioParams {
  variante: VarianteRelatorio;
  inicio: string;
  fim: string;
  /** Rótulo do departamento quando o recorte é de um só. */
  departamentoUnico?: string | null;
  extensao: 'pdf' | 'html';
}

/** Nome do arquivo conforme a convenção do RH. */
export function nomeRelatorio(p: NomeRelatorioParams): string {
  const data = trechoData(p.inicio, p.fim);

  if (p.variante === 'reporte_ocorrencias') {
    return `Reporte_Ocorrencias_Acima_Limite_${data}.${p.extensao}`;
  }
  if (p.variante === 'reporte_ranking') {
    return `Reporte_Ranking_Horas_Extras_${data}.${p.extensao}`;
  }
  if (p.departamentoUnico) {
    return `Relatorio_Horas_Extras_${higienizar(p.departamentoUnico)}_${data}.${p.extensao}`;
  }
  return `Relatorio_Horas_Extras_Concrem_${data}.${p.extensao}`;
}

/** Nome do Excel exportado a partir dos dados filtrados. */
export function nomeExportacaoDados(inicio: string, fim: string): string {
  return `Horas_Extras_Dados_${trechoData(inicio, fim)}.xlsx`;
}
