// Relatório de Horas Extras — gerador de HTML. PURO (string entra, string sai).
//
// FONTE ÚNICA: este arquivo produz o HTML que a tela mostra na prévia, o que o
// usuário baixa como .html e o que é impresso em PDF. Não existe um segundo
// gerador para o PDF — se existisse, os dois documentos divergiriam com o
// tempo, que é exatamente o que a política do relatório proíbe.
//
// O PDF sai da impressão do próprio navegador (Chromium/Edge), com as regras
// @page abaixo. Em um SPA não há Chromium headless disponível no servidor; usar
// jsPDF criaria o tal segundo gerador, então a impressão do próprio HTML é o
// caminho que preserva a regra.
//
// Tipografia: IBM Plex Sans/Mono vêm do Google Fonts com pilha de fallback
// declarada. O documento continua legível e com números alinhados
// (tabular-nums) se a fonte não carregar — é a diferença em relação a embutir
// os woff2 em base64, que somaria centenas de KB a cada arquivo gerado.

import { formatMin } from './tempo';
import { FAIXA_LABEL, type Faixa, type LimitesFaixa } from './faixas';
import {
  anexoQuadroCompleto, contarFaixas, dataBR, dataCurta, detalheOcorrencias,
  ehSabado, matrizDepartamentoDia, nomeDiaSemana, nomeDiaSemanaCurto,
  porDepartamento, porDia, rankingFuncionarios, resumoExecutivo,
} from './agregacoes';
import { rotuloPeriodo, type FiltrosOvertime } from './filtros';
import type { Lancamento } from './pontoTipos';

export type VarianteRelatorio = 'completo' | 'reporte_ocorrencias' | 'reporte_ranking';

export const VARIANTE_LABEL: Record<VarianteRelatorio, string> = {
  completo: 'Completo (8 seções)',
  reporte_ocorrencias: 'Reporte de ocorrências acima do limite',
  reporte_ranking: 'Ranking de funcionários',
};

export interface OrigemRelatorio {
  /** Nome do arquivo importado que deu origem aos dados. */
  arquivoNome: string | null;
  /** Data de emissão em dd/mm/aaaa. */
  emitidoEm: string;
  /** Quantidade de departamentos no recorte, para a linha "Base". */
  departamentos: number;
}

export interface ParametrosRelatorio {
  variante: VarianteRelatorio;
  lancamentos: Lancamento[];
  filtros: FiltrosOvertime;
  /** Filtros em texto (ver filtros.descreverFiltros). */
  descricaoFiltros: string[];
  limites: LimitesFaixa;
  origem: OrigemRelatorio;
  /** Rótulo do departamento quando o recorte é de um só. */
  departamentoUnico?: string | null;
  /** URL do logo oficial. Ausente = marca em texto. */
  logoUrl?: string | null;
  rodape?: string;
  /** Resumo da conciliação da(s) importação(ões) de origem. */
  notaConciliacao?: string | null;
}

// ---------------------------------------------------------------- utilidades

/** Escapa para HTML. Todo dado vindo do arquivo passa por aqui. */
export function esc(valor: unknown): string {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const n = (v: number): string => String(v);
const tracoSeZero = (v: number): string => (v > 0 ? String(v) : '—');

const CLASSE_FAIXA: Record<Faixa, string> = {
  verde: 'f-verde',
  amarelo: 'f-amarelo',
  vermelho: 'f-vermelho',
  sem_extra: 'f-neutra',
};

/** Valor da célula do anexo: o extra, ou o código de afastamento. */
function celulaAnexo(l: Lancamento | undefined): { texto: string; classe: string } {
  if (!l) return { texto: '', classe: 'f-vazia' };
  if (l.extrasMin > 0) return { texto: formatMin(l.extrasMin), classe: CLASSE_FAIXA[l.faixa] };
  if (l.statusAfastamento) return { texto: l.statusAfastamento, classe: 'f-codigo' };
  return { texto: '00:00', classe: 'f-neutra' };
}

const batida = (v: string | null): string => (v ? esc(v) : '');

// ---------------------------------------------------------------- estilo

const CSS = `
:root{
  --creme:#f4f1ec; --papel:#fffdf9; --verde:#1c3a29; --verde-medio:#2e7d4f;
  --ambar:#c8871a; --linha:#ddd7cc; --tinta:#23241f;
  --verde-bg:#e6efe6; --verde-tx:#1c3a29; --verde-barra:#2e7d4f;
  --amarelo-bg:#fbf0d5; --amarelo-tx:#7a5410; --amarelo-barra:#d9a520;
  --vermelho-bg:#f9e1dd; --vermelho-tx:#7d2318; --vermelho-barra:#c0392b;
  --neutro-bg:#efece6; --neutro-tx:#8b8578;
  --sans:"IBM Plex Sans","Segoe UI",system-ui,-apple-system,Arial,sans-serif;
  --mono:"IBM Plex Mono","Cascadia Mono",Consolas,"Courier New",monospace;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--creme);color:var(--tinta);font-family:var(--sans);font-size:11px;line-height:1.45}
.folha{max-width:200mm;margin:0 auto;padding:11mm 10mm 12mm;background:var(--papel)}
.num,.mono{font-family:var(--mono);font-variant-numeric:tabular-nums}
table .num{font-family:var(--mono);font-variant-numeric:tabular-nums}

/* ---- cabeçalho ---- */
.cabecalho{display:flex;gap:14px;align-items:flex-start;padding-bottom:12px;border-bottom:2px solid var(--verde)}
.marca-logo{width:46px;height:46px;object-fit:contain;flex:0 0 auto}
.marca-texto{flex:1 1 auto;min-width:0}
.marca-nome{font-size:15px;font-weight:700;letter-spacing:.18em;color:var(--verde);text-transform:uppercase}
.marca-sub{font-size:9px;letter-spacing:.14em;color:#6b6a60;text-transform:uppercase;margin-top:2px}
.titulo{font-size:22px;font-weight:700;color:var(--verde);margin:8px 0 2px}
.subtitulo{font-size:11px;color:#5d5c53}
.ficha{flex:0 0 auto;font-size:10px;color:#5d5c53;text-align:left;min-width:54mm}
.ficha div{margin-bottom:2px}
.ficha b{color:var(--tinta)}

/* ---- seções ---- */
.secao{margin-top:22px;page-break-inside:auto}
.secao-titulo{display:flex;align-items:baseline;gap:8px;font-size:12px;font-weight:700;letter-spacing:.12em;
  text-transform:uppercase;color:var(--verde);border-bottom:1px solid var(--linha);padding-bottom:5px;margin-bottom:10px}
.secao-num{font-family:var(--mono);font-size:10px;color:var(--ambar);letter-spacing:.06em}
.nota{font-size:10px;color:#5d5c53;margin-top:8px}

/* ---- indicadores ---- */
.indicadores{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.ind{background:var(--papel);border:1px solid var(--linha);border-top:3px solid var(--verde-medio);padding:9px 11px}
.ind.amarelo{border-top-color:var(--amarelo-barra)}
.ind.vermelho{border-top-color:var(--vermelho-barra)}
.ind-rotulo{font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:#6b6a60;line-height:1.3}
.ind-valor{font-family:var(--mono);font-variant-numeric:tabular-nums;font-size:22px;font-weight:600;color:var(--verde);margin:3px 0 1px}
.ind.amarelo .ind-valor{color:var(--amarelo-tx)}
.ind.vermelho .ind-valor{color:var(--vermelho-tx)}
.ind-obs{font-size:9px;color:#6b6a60}

/* ---- cartões de faixa ---- */
.cartoes{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.cartao{padding:8px 11px;border-left:4px solid var(--linha);background:var(--neutro-bg)}
.cartao h4{margin:0 0 3px;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase}
.cartao p{margin:0;font-size:10px}
.cartao.verde{background:var(--verde-bg);border-left-color:var(--verde-barra)}
.cartao.verde h4{color:var(--verde-tx)}
.cartao.amarelo{background:var(--amarelo-bg);border-left-color:var(--amarelo-barra)}
.cartao.amarelo h4{color:var(--amarelo-tx)}
.cartao.vermelho{background:var(--vermelho-bg);border-left-color:var(--vermelho-barra)}
.cartao.vermelho h4{color:var(--vermelho-tx)}
.cartao.neutro{background:var(--neutro-bg);border-left-color:#c9c4b8;margin-top:10px}
.cartao.neutro h4{color:#6b6a60}

/* ---- tabelas ---- */
.rolagem{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:10px}
thead{display:table-header-group}
tfoot{display:table-row-group}
th{background:var(--verde);color:var(--creme);font-size:8.5px;letter-spacing:.09em;text-transform:uppercase;
  font-weight:600;text-align:left;padding:6px 7px;white-space:nowrap}
td{padding:5px 7px;border-bottom:1px solid #eae5db;vertical-align:top}
tbody tr:nth-child(even) td{background:#faf8f4}
tr{page-break-inside:avoid}
.r{text-align:right}.c{text-align:center}
tfoot td{background:#f0ebe0;border-top:2px solid var(--verde);border-bottom:none;font-weight:700}
.sub-td{background:#f3efe6 !important;font-weight:700;color:var(--verde)}
.grupo-titulo{margin:16px 0 6px;font-size:11px;font-weight:700;color:var(--verde)}
.grupo-titulo span{font-family:var(--mono);font-weight:400;color:#6b6a60;font-size:9.5px;margin-left:6px}

/* ---- pílulas de faixa ---- */
.pill{display:inline-block;padding:1px 6px;border-radius:2px;font-family:var(--mono);
  font-variant-numeric:tabular-nums;font-size:9.5px;border-left:3px solid transparent}
.f-verde{background:var(--verde-bg);color:var(--verde-tx);border-left-color:var(--verde-barra)}
.f-amarelo{background:var(--amarelo-bg);color:var(--amarelo-tx);border-left-color:var(--amarelo-barra)}
.f-vermelho{background:var(--vermelho-bg);color:var(--vermelho-tx);border-left-color:var(--vermelho-barra)}
.f-neutra{background:var(--neutro-bg);color:var(--neutro-tx)}
.f-codigo{background:var(--neutro-bg);color:var(--neutro-tx);font-size:8.5px;letter-spacing:.04em}
.f-vazia{background:transparent;color:#bdb8ad}
.cel-vermelha{background:var(--vermelho-bg) !important}

.rodape{margin-top:26px;padding-top:9px;border-top:1px solid var(--linha);font-size:9px;color:#6b6a60}
.rodape p{margin:0 0 2px}
.vazio{padding:14px;background:var(--neutro-bg);color:#6b6a60;font-size:10.5px;text-align:center}

@media (max-width:760px){
  .folha{padding:14px 16px}
  .cabecalho{flex-wrap:wrap}
  .indicadores{grid-template-columns:repeat(2,1fr)}
  .cartoes{grid-template-columns:1fr}
  .ficha{min-width:0;width:100%}
}

@media print{
  @page{size:A4 portrait;margin:11mm 10mm 12mm}
  body{background:#fff}
  .folha{max-width:none;margin:0;padding:0;background:#fff}
  .rolagem{overflow:visible}
  .secao{page-break-inside:auto}
  .secao-titulo{page-break-after:avoid}
  .grupo-titulo{page-break-after:avoid}
  .ind,.cartao,.pill,.sub-td,tfoot td,th,.cel-vermelha{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
`;

// ---------------------------------------------------------------- blocos

function blocoCabecalho(p: ParametrosRelatorio, titulo: string, subtitulo: string): string {
  const { origem } = p;
  const periodo = rotuloPeriodo(p.filtros.inicio, p.filtros.fim);
  const rotuloData = p.filtros.inicio === p.filtros.fim && p.filtros.inicio
    ? `${periodo} (${nomeDiaSemana(p.filtros.inicio)}-feira)`.replace('sábado-feira', 'sábado').replace('domingo-feira', 'domingo')
    : periodo;

  const logo = p.logoUrl
    ? `<img class="marca-logo" src="${esc(p.logoUrl)}" alt="">`
    : '';

  return `<header class="cabecalho">
  ${logo}
  <div class="marca-texto">
    <div class="marca-nome">Grupo Concrem</div>
    <div class="marca-sub">Controladoria · Recursos Humanos</div>
    <h1 class="titulo">${esc(titulo)}</h1>
    <p class="subtitulo">${esc(subtitulo)}</p>
  </div>
  <div class="ficha">
    <div><b>Data:</b> ${esc(rotuloData)}</div>
    <div><b>Fonte:</b> Secullum RH — Ponto Diário</div>
    <div><b>Base:</b> ${esc(origem.arquivoNome ?? 'base histórica do sistema')} · ${n(origem.departamentos)} departamento(s)</div>
    <div><b>Emissão:</b> ${esc(origem.emitidoEm)}</div>
    ${p.departamentoUnico ? `<div><b>Departamento:</b> ${esc(p.departamentoUnico)}</div>` : ''}
    ${p.descricaoFiltros.length ? `<div><b>Filtros:</b> ${esc(p.descricaoFiltros.join(' · '))}</div>` : ''}
  </div>
</header>`;
}

function secao(numero: string, titulo: string, conteudo: string): string {
  return `<section class="secao">
  <h2 class="secao-titulo"><span class="secao-num">${esc(numero)}</span>${esc(titulo)}</h2>
  ${conteudo}
</section>`;
}

const vazio = (msg: string): string => `<p class="vazio">${esc(msg)}</p>`;

// -------------------------------------------------- 01 · resumo executivo

function secaoResumo(p: ParametrosRelatorio): string {
  const r = resumoExecutivo(p.lancamentos);
  const lim = formatMin(p.limites.verdeMaxMin);
  const limVermelho = formatMin(p.limites.amareloMaxMin);
  const umDia = r.dias <= 1;

  const indicadores = `<div class="indicadores">
  <div class="ind">
    <div class="ind-rotulo">Horas extras do período</div>
    <div class="ind-valor">${formatMin(r.extrasMin)}</div>
    <div class="ind-obs">${n(r.lancamentos)} lançamentos de ponto</div>
  </div>
  <div class="ind amarelo">
    <div class="ind-rotulo">Ocorrências acima de ${esc(lim)}</div>
    <div class="ind-valor">${n(r.ocorrencias)}</div>
    <div class="ind-obs">${formatMin(r.extrasNasOcorrenciasMin)} de horas extras</div>
  </div>
  <div class="ind amarelo">
    <div class="ind-rotulo">Funcionários acima de ${esc(lim)}</div>
    <div class="ind-valor">${n(r.funcionariosAcima)}</div>
    <div class="ind-obs">de ${n(r.funcionarios)} no período</div>
  </div>
  <div class="ind vermelho">
    <div class="ind-rotulo">Ocorrências acima de ${esc(limVermelho)}</div>
    <div class="ind-valor">${n(r.faixas.vermelho)}</div>
    <div class="ind-obs">faixa vermelha</div>
  </div>
</div>`;

  const qa: [string, string][] = [
    ['Quantos lançamentos de ponto o período contempla?', `${n(r.lancamentos)} lançamentos`],
    ['Quantos funcionários e departamentos estão no período?', `${n(r.funcionarios)} funcionários · ${n(r.departamentos)} departamentos`],
    ['Qual o total de horas extras apuradas?', formatMin(r.extrasMin)],
    [`Quantas ocorrências ultrapassaram ${lim} de extra?`, `${n(r.ocorrencias)} ocorrências`],
    [`Quantos funcionários distintos ultrapassaram ${lim}?`, `${n(r.funcionariosAcima)} funcionários`],
    ['Quantas horas extras estão concentradas nessas ocorrências?', `${formatMin(r.extrasNasOcorrenciasMin)} de ${formatMin(r.extrasMin)}`],
    [`Quantas ocorrências na faixa amarela (${formatMin(p.limites.verdeMaxMin + 1)} a ${limVermelho})?`, `${n(r.faixas.amarelo)} ocorrências`],
    [`Quantas ocorrências na faixa vermelha (acima de ${limVermelho})?`, `${n(r.faixas.vermelho)} ocorrências`],
    ['Qual o maior valor de extra registrado?', r.maiorExtra
      ? `${formatMin(r.maiorExtra.extrasMin)} — ${r.maiorExtra.nome} (${r.maiorExtra.departamentoNome}), ${dataBR(r.maiorExtra.data)}`
      : 'Nenhum extra no período'],
    ['Qual departamento concentra o maior volume de horas extras?', r.deptoMaiorVolume
      ? `${r.deptoMaiorVolume.nome} — ${formatMin(r.deptoMaiorVolume.extrasMin)}` : '—'],
    [`Qual departamento tem mais ocorrências acima de ${lim}?`, r.deptoMaisOcorrencias
      ? `${r.deptoMaisOcorrencias.nome} — ${n(r.deptoMaisOcorrencias.ocorrencias)} ocorrências` : '—'],
    ['Qual departamento concentra mais ocorrências na faixa vermelha?', r.deptoMaisVermelhas
      ? `${r.deptoMaisVermelhas.nome} — ${n(r.deptoMaisVermelhas.vermelhas)} ocorrências` : '—'],
  ];
  if (!umDia) {
    qa.push(['Qual dia teve mais ocorrências acima do limite?', r.diaMaisOcorrencias
      ? `${dataBR(r.diaMaisOcorrencias.data)} — ${n(r.diaMaisOcorrencias.ocorrencias)} ocorrências` : '—']);
  }

  const tabela = `<div class="rolagem" style="margin-top:12px"><table>
  <thead><tr><th style="width:56%">Pergunta</th><th>Resposta</th></tr></thead>
  <tbody>${qa.map(([q, a]) => `<tr><td>${esc(q)}</td><td class="num">${esc(a)}</td></tr>`).join('')}</tbody>
</table></div>`;

  return secao('01', 'Resumo executivo', indicadores + tabela);
}

// -------------------------------------------- 02 · critério de classificação

function secaoCriterio(p: ParametrosRelatorio): string {
  const c = contarFaixas(p.lancamentos);
  const temSabado = p.lancamentos.some((l) => ehSabado(l.data));

  const cartoes = `<div class="cartoes">
  <div class="cartao verde">
    <h4>Verde — até ${esc(formatMin(p.limites.verdeMaxMin))}</h4>
    <p>Extra diário dentro do limite de referência. ${n(c.verde)} ocorrências.</p>
  </div>
  <div class="cartao amarelo">
    <h4>Amarelo — ${esc(formatMin(p.limites.verdeMaxMin + 1))} a ${esc(formatMin(p.limites.amareloMaxMin))}</h4>
    <p>Excedente que exige acompanhamento da chefia imediata. ${n(c.amarelo)} ocorrências.</p>
  </div>
  <div class="cartao vermelho">
    <h4>Vermelho — acima de ${esc(formatMin(p.limites.amareloMaxMin))}</h4>
    <p>Excedente crítico, fora do limite legal de 2h diárias. ${n(c.vermelho)} ocorrências.</p>
  </div>
</div>
<div class="cartao neutro">
  <h4>Sem extra</h4>
  <p>Lançamento sem horas extras, com afastamento (falta, férias, atestado, INSS, licença, folga) ou sem registro de batida. ${n(c.sem_extra)} lançamentos.</p>
</div>`;

  const nota = `<p class="nota">A classificação é aplicada sobre a coluna <b>EXTRAS</b> do ponto diário, exatamente como
  apurada pelo Secullum PontoWeb — nenhum valor foi recalculado. Jornada de referência do grupo: 8h de segunda a sexta
  e 4h no sábado (44h semanais); o setor Administração segue a jornada de 8h48 em cinco dias.${
  temSabado ? ' O período inclui sábado, cuja jornada é de 4h — por isso os sábados apresentam extras proporcionalmente maiores.' : ''}${
  p.notaConciliacao ? ` ${esc(p.notaConciliacao)}` : ''}</p>`;

  return secao('02', 'Critério de classificação', cartoes + nota);
}

// ------------------------------------- 03 · consolidado por departamento

function secaoDepartamentos(p: ParametrosRelatorio): string {
  const linhas = porDepartamento(p.lancamentos);
  if (!linhas.length) return secao('03', 'Consolidado por departamento', vazio('Nenhum lançamento no recorte.'));
  const r = resumoExecutivo(p.lancamentos);

  const corpo = linhas.map((d) => `<tr>
  <td><b>${esc(d.nome)}</b></td>
  <td class="r num">${n(d.funcionarios)}</td>
  <td class="r num">${n(d.lancamentos)}</td>
  <td class="r num">${formatMin(d.extrasMin)}</td>
  <td class="r num">${n(d.semExtra)}</td>
  <td class="r num">${n(d.verdes)}</td>
  <td class="r num">${n(d.amarelas)}</td>
  <td class="r num">${n(d.vermelhas)}</td>
  <td class="r num"><b>${n(d.ocorrencias)}</b></td>
  <td class="r num">${n(d.funcionariosAcima)}</td>
  <td class="r num">${formatMin(d.extrasNasOcorrenciasMin)}</td>
</tr>`).join('');

  const tabela = `<div class="rolagem"><table>
  <thead><tr>
    <th>Departamento</th><th class="r">Funcion.</th><th class="r">Lançam.</th><th class="r">Horas extras</th>
    <th class="r">Sem extra</th><th class="r">Verde</th><th class="r">Amarelo</th><th class="r">Vermelho</th>
    <th class="r">Ocorr. +limite</th><th class="r">Func. +limite</th><th class="r">Horas nas ocorr.</th>
  </tr></thead>
  <tbody>${corpo}</tbody>
  <tfoot><tr>
    <td>Total geral</td>
    <td class="r num">${n(r.funcionarios)}</td>
    <td class="r num">${n(r.lancamentos)}</td>
    <td class="r num">${formatMin(r.extrasMin)}</td>
    <td class="r num">${n(r.faixas.sem_extra)}</td>
    <td class="r num">${n(r.faixas.verde)}</td>
    <td class="r num">${n(r.faixas.amarelo)}</td>
    <td class="r num">${n(r.faixas.vermelho)}</td>
    <td class="r num">${n(r.ocorrencias)}</td>
    <td class="r num">${n(r.funcionariosAcima)}</td>
    <td class="r num">${formatMin(r.extrasNasOcorrenciasMin)}</td>
  </tr></tfoot>
</table></div>
<p class="nota">${p.notaConciliacao
    ? esc(p.notaConciliacao)
    : 'Os totais reproduzem a soma dos lançamentos gravados na importação, que por sua vez foi conferida contra as linhas SUBTOTAL e TOTAL GERAL do arquivo de origem.'}</p>`;

  return secao('03', 'Consolidado por departamento', tabela);
}

// ------------------------------------------- 04 · horas extras por dia

function secaoDias(p: ParametrosRelatorio): string {
  const linhas = porDia(p.lancamentos);
  if (!linhas.length) return secao('04', 'Horas extras por dia', vazio('Nenhum lançamento no recorte.'));
  const r = resumoExecutivo(p.lancamentos);

  const corpo = linhas.map((d) => `<tr>
  <td class="num">${esc(dataBR(d.data))}</td>
  <td>${esc(d.diaSemana)}</td>
  <td class="r num">${n(d.lancamentosComExtra)}</td>
  <td class="r num">${formatMin(d.extrasMin)}</td>
  <td class="r num">${n(d.ocorrencias)}</td>
  <td class="r num">${formatMin(d.extrasNasOcorrenciasMin)}</td>
  <td class="r num">${n(d.vermelhas)}</td>
</tr>`).join('');

  return secao('04', 'Horas extras por dia', `<div class="rolagem"><table>
  <thead><tr>
    <th>Dia</th><th>Semana</th><th class="r">Lançam. com extra</th><th class="r">Horas extras</th>
    <th class="r">Ocorr. acima do limite</th><th class="r">Horas nas ocorr.</th><th class="r">Faixa vermelha</th>
  </tr></thead>
  <tbody>${corpo}</tbody>
  <tfoot><tr>
    <td colspan="2">Total</td>
    <td class="r num">${n(p.lancamentos.filter((l) => l.extrasMin > 0).length)}</td>
    <td class="r num">${formatMin(r.extrasMin)}</td>
    <td class="r num">${n(r.ocorrencias)}</td>
    <td class="r num">${formatMin(r.extrasNasOcorrenciasMin)}</td>
    <td class="r num">${n(r.faixas.vermelho)}</td>
  </tr></tfoot>
</table></div>`);
}

// -------------------------------------- 05 · matriz departamento × dia

function secaoMatriz(p: ParametrosRelatorio): string {
  const m = matrizDepartamentoDia(p.lancamentos);
  if (!m.departamentos.length) {
    return secao('05', 'Ocorrências acima do limite — departamento × dia', vazio('Nenhum lançamento no recorte.'));
  }

  const cabecalhoDias = m.dias.map((d) =>
    `<th class="r">${esc(dataCurta(d))}<br><span style="opacity:.75">${esc(nomeDiaSemanaCurto(d))}</span></th>`).join('');

  const corpo = m.departamentos.map((dep) => {
    const celulas = m.dias.map((dia) => {
      const c = m.celulas.get(`${dep.codigo}|${dia}`);
      if (!c) return '<td class="r"><span class="pill f-vazia">—</span></td>';
      const classe = c.temVermelha ? 'f-vermelho' : 'f-amarelo';
      return `<td class="r${c.temVermelha ? ' cel-vermelha' : ''}"><span class="pill ${classe}">${n(c.ocorrencias)} · ${formatMin(c.extrasMin)}</span></td>`;
    }).join('');
    return `<tr><td><b>${esc(dep.nome)}</b></td>${celulas}<td class="r num">${n(dep.totalOcorrencias)}</td><td class="r num">${formatMin(dep.totalExtrasMin)}</td></tr>`;
  }).join('');

  return secao('05', 'Ocorrências acima do limite — departamento × dia', `<div class="rolagem"><table>
  <thead><tr><th>Departamento</th>${cabecalhoDias}<th class="r">Total ocorr.</th><th class="r">Total horas</th></tr></thead>
  <tbody>${corpo}</tbody>
  <tfoot><tr>
    <td>Total</td>
    ${m.dias.map((dia) => {
      let ocorr = 0; let min = 0;
      for (const dep of m.departamentos) {
        const c = m.celulas.get(`${dep.codigo}|${dia}`);
        if (c) { ocorr += c.ocorrencias; min += c.extrasMin; }
      }
      return `<td class="r num">${ocorr ? `${ocorr} · ${formatMin(min)}` : '—'}</td>`;
    }).join('')}
    <td class="r num">${n(m.totalOcorrencias)}</td>
    <td class="r num">${formatMin(m.totalExtrasMin)}</td>
  </tr></tfoot>
</table></div>
<p class="nota">Cada célula traz <b>ocorrências · horas extras</b> apenas dos lançamentos acima do limite de referência.
Célula em vermelho indica presença de pelo menos uma ocorrência acima de ${esc(formatMin(p.limites.amareloMaxMin))}.</p>`);
}

// ------------------------------------------------- 06 · ranking

function secaoRanking(p: ParametrosRelatorio, numero = '06'): string {
  const linhas = rankingFuncionarios(p.lancamentos);
  const lim = formatMin(p.limites.verdeMaxMin);
  const titulo = `Funcionários com extra acima de ${lim} — ranking`;
  if (!linhas.length) return secao(numero, titulo, vazio('Nenhum funcionário ultrapassou o limite no recorte.'));

  const totalMin = linhas.reduce((s, l) => s + l.extrasNasOcorrenciasMin, 0);
  const maior = linhas.reduce((a, b) => (b.maiorExtraMin > a.maiorExtraMin ? b : a));

  const corpo = linhas.map((l) => `<tr>
  <td class="r num">${n(l.posicao)}</td>
  <td>${esc(l.nome)}</td>
  <td>${esc(l.departamentoNome)}</td>
  <td class="r num">${n(l.ocorrencias)}</td>
  <td class="r num">${tracoSeZero(l.amarelas)}</td>
  <td class="r num">${tracoSeZero(l.vermelhas)}</td>
  <td class="r num">${formatMin(l.extrasNasOcorrenciasMin)}</td>
  <td class="r"><span class="pill ${l.maiorExtraMin > p.limites.amareloMaxMin ? 'f-vermelho' : 'f-amarelo'}">${formatMin(l.maiorExtraMin)}</span></td>
  <td class="r num">${esc(dataBR(l.diaDoMaior))}</td>
</tr>`).join('');

  return secao(numero, titulo, `<p class="nota" style="margin:0 0 8px">${n(linhas.length)} funcionários com extra acima de ${esc(lim)} em ${esc(rotuloPeriodo(p.filtros.inicio, p.filtros.fim))}, ordenados pelas horas acumuladas.</p>
<div class="rolagem"><table>
  <thead><tr>
    <th class="r">#</th><th>Funcionário</th><th>Departamento</th><th class="r">Ocorr.</th>
    <th class="r">Amarelo</th><th class="r">Vermelho</th><th class="r">Horas nas ocorr.</th>
    <th class="r">Maior extra</th><th class="r">Dia do maior</th>
  </tr></thead>
  <tbody>${corpo}</tbody>
  <tfoot><tr>
    <td colspan="3">Total — ${n(linhas.length)} funcionários</td>
    <td class="r num">${n(linhas.reduce((s, l) => s + l.ocorrencias, 0))}</td>
    <td class="r num">${n(linhas.reduce((s, l) => s + l.amarelas, 0))}</td>
    <td class="r num">${n(linhas.reduce((s, l) => s + l.vermelhas, 0))}</td>
    <td class="r num">${formatMin(totalMin)}</td>
    <td class="r num">maior: ${formatMin(maior.maiorExtraMin)}</td>
    <td></td>
  </tr></tfoot>
</table></div>`);
}

// -------------------------------------- 07 · detalhamento das ocorrências

function secaoDetalhamento(p: ParametrosRelatorio, numero = '07'): string {
  const grupos = detalheOcorrencias(p.lancamentos);
  const titulo = 'Detalhamento das ocorrências acima do limite — por departamento, dia e funcionário';
  if (!grupos.length) return secao(numero, titulo, vazio('Nenhuma ocorrência acima do limite no recorte.'));

  const blocos = grupos.map((g) => {
    const tres = g.temTerceiroPar;
    const cabecalho = `<tr>
      <th>Data</th><th>Funcionário</th>
      <th class="r">Ent. 1</th><th class="r">Saí. 1</th><th class="r">Ent. 2</th><th class="r">Saí. 2</th>
      ${tres ? '<th class="r">Ent. 3</th><th class="r">Saí. 3</th>' : ''}
      <th class="r">Extras</th><th>Faixa</th>
    </tr>`;
    const colspan = tres ? 8 : 6;

    const corpo = g.dias.map((dia) => {
      const sub = `<tr><td class="sub-td" colspan="${colspan}">${esc(dataBR(dia.data))} — ${esc(dia.diaSemana)}</td>
        <td class="sub-td r num">${formatMin(dia.extrasMin)}</td>
        <td class="sub-td num">${n(dia.itens.length)} ocorr.</td></tr>`;
      const itens = dia.itens.map((l) => `<tr>
        <td class="num">${esc(dataCurta(l.data))}</td>
        <td>${esc(l.nome)}</td>
        <td class="r num">${batida(l.ent1)}</td>
        <td class="r num">${batida(l.sai1)}</td>
        <td class="r num">${batida(l.ent2)}</td>
        <td class="r num">${batida(l.sai2)}</td>
        ${tres ? `<td class="r num">${batida(l.ent3)}</td><td class="r num">${batida(l.sai3)}</td>` : ''}
        <td class="r num"><b>${formatMin(l.extrasMin)}</b></td>
        <td><span class="pill ${CLASSE_FAIXA[l.faixa]}">${esc(FAIXA_LABEL[l.faixa].toUpperCase())}</span></td>
      </tr>`).join('');
      return sub + itens;
    }).join('');

    return `<h3 class="grupo-titulo">${esc(g.nome)}<span>${n(g.ocorrencias)} ocorrências · ${formatMin(g.extrasMin)} · ${n(g.funcionarios)} funcionários</span></h3>
<div class="rolagem"><table><thead>${cabecalho}</thead><tbody>${corpo}</tbody></table></div>`;
  }).join('');

  return secao(numero, titulo, blocos);
}

// ---------------------------------------- 08 · anexo funcionário × dia

function secaoAnexo(p: ParametrosRelatorio): string {
  const blocos = anexoQuadroCompleto(p.lancamentos);
  const titulo = 'Anexo — quadro completo por funcionário e dia';
  if (!blocos.length) return secao('08', titulo, vazio('Nenhum lançamento no recorte.'));

  const corpo = blocos.map((b) => {
    const cabDias = b.dias.map((d) =>
      `<th class="r">${esc(dataCurta(d))}<br><span style="opacity:.75">${esc(nomeDiaSemanaCurto(d))}</span></th>`).join('');

    const linhas = b.linhas.map((l) => {
      const celulas = b.dias.map((d) => {
        const c = celulaAnexo(l.porDia.get(d));
        return `<td class="r">${c.texto ? `<span class="pill ${c.classe}">${esc(c.texto)}</span>` : ''}</td>`;
      }).join('');
      return `<tr><td>${esc(l.nome)}</td>${celulas}<td class="r num">${formatMin(l.totalMin)}</td><td class="r num">${tracoSeZero(l.ocorrencias)}</td></tr>`;
    }).join('');

    const totaisDia = b.dias.map((d) => `<td class="r num">${formatMin(b.totaisPorDia.get(d) ?? 0)}</td>`).join('');

    return `<h3 class="grupo-titulo">${esc(b.nome)}<span>${n(b.funcionarios)} funcionários · ${formatMin(b.extrasMin)} de horas extras</span></h3>
<div class="rolagem"><table>
  <thead><tr><th>Funcionário</th>${cabDias}<th class="r">Total</th><th class="r">Ocorr.</th></tr></thead>
  <tbody>${linhas}</tbody>
  <tfoot><tr><td>Total ${esc(b.nome)}</td>${totaisDia}<td class="r num">${formatMin(b.extrasMin)}</td><td class="r num">${n(b.ocorrencias)}</td></tr></tfoot>
</table></div>`;
  }).join('');

  return secao('08', titulo, `<p class="nota" style="margin:0 0 8px">Todos os lançamentos do período, por departamento.
Cada célula traz o valor da coluna EXTRAS com a cor da faixa; afastamentos e dias sem batida aparecem com o código correspondente.</p>${corpo}`);
}

// ---------------------------------------------------------------- documento

function rodape(p: ParametrosRelatorio, titulo: string): string {
  return `<footer class="rodape">
  <p>Grupo Concrem · Controladoria / RH — ${esc(titulo)} · ${esc(rotuloPeriodo(p.filtros.inicio, p.filtros.fim))}</p>
  <p>Fonte: Secullum RH — Ponto Diário${p.origem.arquivoNome ? ` · arquivo ${esc(p.origem.arquivoNome)}` : ''} · valores da coluna EXTRAS sem recálculo</p>
  ${p.rodape ? `<p>${esc(p.rodape)}</p>` : ''}
</footer>`;
}

/** Título do documento conforme a variante e o recorte. */
export function tituloRelatorio(p: Pick<ParametrosRelatorio, 'variante' | 'departamentoUnico'>): string {
  if (p.variante === 'reporte_ranking') return 'Ranking de Horas Extras';
  if (p.variante === 'reporte_ocorrencias') return 'Reporte de Ocorrências Acima do Limite';
  return p.departamentoUnico ? `Relatório de Horas Extras — ${p.departamentoUnico}` : 'Relatório de Horas Extras';
}

/** Documento HTML completo e autocontido (abre offline, sem o app). */
export function gerarRelatorioHtml(p: ParametrosRelatorio): string {
  const titulo = tituloRelatorio(p);
  const subtitulo = p.variante === 'completo'
    ? 'Ponto por departamento — foco em jornadas acima do limite de referência'
    : p.variante === 'reporte_ranking'
      ? 'Relação nominal ordenada pelas horas extras acumuladas'
      : 'Relação nominal das ocorrências acima do limite, por departamento e dia';

  const miolo = p.variante === 'completo'
    ? [
        secaoResumo(p), secaoCriterio(p), secaoDepartamentos(p), secaoDias(p),
        secaoMatriz(p), secaoRanking(p), secaoDetalhamento(p), secaoAnexo(p),
      ].join('\n')
    : p.variante === 'reporte_ranking'
      ? [secaoResumo(p), secaoRanking(p, '02')].join('\n')
      : [secaoResumo(p), secaoDetalhamento(p, '02')].join('\n');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)} — ${esc(rotuloPeriodo(p.filtros.inicio, p.filtros.fim))}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;600;700&display=swap">
<style>${CSS}</style>
</head>
<body>
<main class="folha">
${blocoCabecalho(p, titulo, subtitulo)}
${miolo}
${rodape(p, titulo)}
</main>
</body>
</html>`;
}
