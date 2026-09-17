// Relatório de HISTÓRICO DE MOVIMENTAÇÃO (PDF). Substitui a exportação CSV.
//
// Reaproveita jsPDF/jspdf-autotable e o mesmo desenho de cabeçalho/rodapé dos
// relatórios de DSS e EPI, para o documento sair com a mesma cara dos demais.
//
// Decisões do documento:
//   • Paisagem — são 10 colunas; em retrato a tabela ficaria ilegível.
//   • Uma linha por ITEM (não por movimentação), igual ao CSV que ele substitui:
//     é o nível em que saldo anterior/posterior fazem sentido.
//   • O cabeçalho declara PERÍODO e FILTROS aplicados. Sem isso o papel não se
//     explica: dois relatórios com totais diferentes pareceriam contraditórios.
//   • Sem `operacaoId` (UUID interno, inútil impresso); a coluna Observação fica
//     por último e quebra linha, porque é onde vive a justificativa do ajuste.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDateTimeBR } from '@/lib/dateTime';
import { formatNumberBR } from '@/lib/formatters';
import { getCurrentDateTimeInBrasilia, getCurrentDateInBrasilia } from '@/lib/dateTime';
import { tipoMeta, ORIGEM_LABEL, type Direcao } from '../components/movements/movementMeta';
import { resumoFiltrosMov, periodoRotuloMov, type MovFiltroOpcoes } from './movementFilters';
import type { MovDetalhada } from '../services/inventoryApi';
import type { MovFiltros } from '../hooks/useInventoryMovements';
import type { VarInfo } from '../hooks/useInventoryMovements';

const W = 297;   // A4 paisagem
const H = 210;

function drawHeader(doc: jsPDF, title: string, subtitle?: string): number {
  doc.setFillColor(0, 70, 40);
  doc.rect(0, 0, W, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('CONCREM — ' + title, W / 2, 12, { align: 'center' });
  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, W / 2, 19, { align: 'center' });
  }
  doc.setFillColor(52, 168, 83);
  doc.rect(0, 24, W, 1.5, 'F');
  return 32;
}

function drawFooter(doc: jsPDF) {
  const [dataGeracao, horaGeracao] = getCurrentDateTimeInBrasilia().split(', ');
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(`Gerado em ${dataGeracao} às ${horaGeracao} · Horário de Brasília`, 8, H - 6);
    doc.text(`Página ${i} de ${pages}`, W - 8, H - 6, { align: 'right' });
  }
}

export interface MovementReportStats {
  total: number; entradas: number; saidas: number; ajustes: number; estornos: number; pecas: number;
}
export interface MovementReportFluxo { pecasIn: number; pecasOut: number; liquido: number }

export interface MovementReportParams {
  movs: MovDetalhada[];
  filtros: MovFiltros;
  busca: string;
  opcoes: MovFiltroOpcoes;
  stats: MovementReportStats;
  fluxo: MovementReportFluxo;
  varInfo: Map<string, VarInfo>;
  unidadeNome: Map<string, string>;
}

const SINAL: Record<Direcao | string, string> = { IN: '+', OUT: '−' };

/** Linhas da tabela — uma por item de cada movimentação. PURA (testável). */
export function buildMovementReportRows(p: Pick<MovementReportParams, 'movs' | 'varInfo' | 'unidadeNome'>): string[][] {
  const linhas: string[][] = [];
  for (const mv of p.movs) {
    for (const it of mv.itens) {
      const v = p.varInfo.get(it.varianteId);
      linhas.push([
        formatDateTimeBR(mv.createdAt),
        mv.numero,
        tipoMeta(mv.tipo).label,
        p.unidadeNome.get(mv.unidadeId) ?? '—',
        v ? `${v.nome}${v.codigo ? ` (${v.codigo})` : ''}` : '—',
        `${SINAL[it.direcao] ?? ''}${formatNumberBR(it.quantidade)}`,
        `${formatNumberBR(it.saldoAnterior)} → ${formatNumberBR(it.saldoPosterior)}`,
        mv.referenciaTipo ? (ORIGEM_LABEL[mv.referenciaTipo] ?? mv.referenciaTipo) : '—',
        mv.operadorNome,
        mv.observacao ?? '',
      ]);
    }
  }
  return linhas;
}

/** Gera e baixa o PDF do histórico de movimentação já filtrado. */
export function generateMovementHistoryReport(p: MovementReportParams): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let y = drawHeader(doc, 'HISTÓRICO DE MOVIMENTAÇÃO', periodoRotuloMov(p.filtros));

  // Resumo do que está no documento.
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `${p.stats.total} movimentação(ões) · ${formatNumberBR(p.stats.pecas)} peça(s) · `
    + `${p.stats.entradas} entrada(s) · ${p.stats.saidas} saída(s) · `
    + `${p.stats.ajustes} ajuste(s) · ${p.stats.estornos} estorno(s)`,
    10, y,
  );
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Fluxo do período: +${formatNumberBR(p.fluxo.pecasIn)} entraram · −${formatNumberBR(p.fluxo.pecasOut)} saíram · `
    + `líquido ${p.fluxo.liquido >= 0 ? '+' : '−'}${formatNumberBR(Math.abs(p.fluxo.liquido))} peça(s)`,
    10, y + 5,
  );

  // Filtros aplicados — é o que torna o papel autoexplicativo.
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  const filtros = doc.splitTextToSize(`Filtros: ${resumoFiltrosMov(p.filtros, p.opcoes, p.busca)}`, W - 20) as string[];
  doc.text(filtros, 10, y + 11);
  y += 13 + (filtros.length - 1) * 4;

  const linhas = buildMovementReportRows(p);

  autoTable(doc, {
    startY: y,
    head: [['Data/hora', 'Número', 'Tipo', 'Local', 'Item', 'Qtd', 'Saldo', 'Origem', 'Responsável', 'Observação']],
    body: linhas.length ? linhas : [['—', '—', '—', '—', 'Nenhuma movimentação no filtro', '—', '—', '—', '—', '']],
    headStyles: { fillColor: [0, 100, 50], fontSize: 8, textColor: [255, 255, 255] },
    styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
    alternateRowStyles: { fillColor: [245, 247, 245] },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 24 },
      2: { cellWidth: 24 },
      3: { cellWidth: 28 },
      4: { cellWidth: 52 },
      5: { cellWidth: 16, halign: 'right' },
      6: { cellWidth: 26, halign: 'right' },
      7: { cellWidth: 20 },
      8: { cellWidth: 30 },
      9: { cellWidth: 'auto' },
    },
    margin: { left: 8, right: 8 },
  });

  drawFooter(doc);

  const sufixo = p.filtros.periodo === 'mes_ref' && p.filtros.mesRef
    ? p.filtros.mesRef
    : getCurrentDateInBrasilia();
  doc.save(`historico_movimentacao_${sufixo}.pdf`);
}
