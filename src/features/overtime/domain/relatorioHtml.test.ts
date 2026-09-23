import { describe, it, expect } from 'vitest';
import { esc, gerarRelatorioHtml, tituloRelatorio, type ParametrosRelatorio } from './relatorioHtml';
import { classificarFaixa, LIMITES_PADRAO } from './faixas';
import { parseHoraMin } from './tempo';
import { FILTROS_VAZIOS } from './filtros';
import type { Lancamento } from './pontoTipos';

function lanc(nome: string, dep: string, data: string, extras: string, matricula = nome): Lancamento {
  const extrasMin = parseHoraMin(extras) ?? 0;
  return {
    matricula, nome, departamentoCodigo: dep, departamentoNome: dep === 'FABRICA 1' ? 'Fábrica 1' : 'Fábrica de Móveis',
    data, ent1: '07:00', sai1: '12:00', ent2: '13:00', sai2: '18:25', ent3: null, sai3: null,
    statusAfastamento: null, normaisMin: 528, faltasMin: 0, extrasMin, cargaMin: 528,
    faixa: classificarFaixa(extrasMin),
  };
}

const DADOS = [
  lanc('ALEX DA SILVA', 'FABRICA 1', '2026-09-22', '03:12', '1001'),
  lanc('IURI CARVALHO', 'FABRICA 1', '2026-09-22', '02:30', '1002'),
  lanc('HEBERT PASSOS', 'FABRICA 1', '2026-09-22', '01:00', '1003'),
  lanc('DIEGO SOUSA', 'MOVEIS', '2026-09-22', '02:19', '1004'),
];

const BASE: ParametrosRelatorio = {
  variante: 'completo',
  lancamentos: DADOS,
  filtros: { ...FILTROS_VAZIOS, inicio: '2026-09-22', fim: '2026-09-22' },
  descricaoFiltros: [],
  limites: LIMITES_PADRAO,
  origem: { arquivoNome: 'Ponto_Diario_11.xlsx', emitidoEm: '23/09/2026', departamentos: 2 },
};

describe('escape de HTML', () => {
  // Nome de funcionário vem do arquivo; um "&" ou "<" solto quebraria a página.
  it('neutraliza os caracteres que quebram a marcação', () => {
    expect(esc('Bar & Cia <b>')).toBe('Bar &amp; Cia &lt;b&gt;');
    expect(esc(`aspas " e '`)).toBe('aspas &quot; e &#39;');
    expect(esc(null)).toBe('');
  });

  it('dado do arquivo sai escapado no documento', () => {
    const html = gerarRelatorioHtml({
      ...BASE,
      lancamentos: [lanc('<script>alert(1)</script>', 'FABRICA 1', '2026-09-22', '02:30', '9')],
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('documento completo', () => {
  const html = gerarRelatorioHtml(BASE);

  it('é um HTML autocontido', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain('<style>');
    expect(html.trim().endsWith('</html>')).toBe(true);
  });

  it('traz as oito seções numeradas', () => {
    for (const n of ['01', '02', '03', '04', '05', '06', '07', '08']) {
      expect(html).toContain(`<span class="secao-num">${n}</span>`);
    }
    expect(html).toContain('Resumo executivo');
    expect(html).toContain('Consolidado por departamento');
    expect(html).toContain('Anexo — quadro completo por funcionário e dia');
  });

  it('o cabeçalho identifica data, fonte, base e emissão', () => {
    expect(html).toContain('Grupo Concrem');
    expect(html).toContain('22/09/2026');
    expect(html).toContain('Secullum RH — Ponto Diário');
    expect(html).toContain('Ponto_Diario_11.xlsx');
    expect(html).toContain('23/09/2026');
  });

  it('mostra os valores como vieram, sem recalcular', () => {
    expect(html).toContain('03:12');
    expect(html).toContain('02:30');
    expect(html).toContain('ALEX DA SILVA');
  });

  // A política do relatório proíbe qualquer indicador derivado.
  it('não traz percentual, média nem projeção', () => {
    // Só o texto visível: a marcação tem larguras em % que não são conteúdo.
    const corpo = html.slice(html.indexOf('<body>')).replace(/<[^>]*>/g, ' ');
    expect(corpo).not.toMatch(/\d+(?:[.,]\d+)?\s*%/);
    expect(corpo).not.toMatch(/\bm[ée]dia\b/i);
    expect(corpo).not.toMatch(/\bproje[çc][ãa]o\b/i);
    expect(corpo).not.toMatch(/\bmeta\b/i);
  });

  it('as regras de impressão em A4 estão no documento', () => {
    expect(html).toContain('@page{size:A4 portrait;margin:11mm 10mm 12mm}');
    expect(html).toContain('thead{display:table-header-group}');
    expect(html).toContain('tfoot{display:table-row-group}');
    expect(html).toContain('page-break-inside:avoid');
  });

  it('usa a paleta e a tipografia da identidade', () => {
    expect(html).toContain('#f4f1ec');   // creme
    expect(html).toContain('#1c3a29');   // verde escuro
    expect(html).toContain('#c8871a');   // âmbar
    expect(html).toContain('IBM Plex Sans');
    expect(html).toContain('tabular-nums');
  });

  it('declara os filtros aplicados no cabeçalho', () => {
    const comFiltro = gerarRelatorioHtml({ ...BASE, descricaoFiltros: ['Departamentos: Fábrica 1'] });
    expect(comFiltro).toContain('Departamentos: Fábrica 1');
  });
});

describe('variantes', () => {
  it('o reporte de ocorrências traz só indicadores e a relação nominal', () => {
    const html = gerarRelatorioHtml({ ...BASE, variante: 'reporte_ocorrencias' });
    expect(html).toContain('Detalhamento das ocorrências');
    expect(html).not.toContain('Anexo — quadro completo');
    expect(html).not.toContain('Consolidado por departamento');
  });

  it('o reporte de ranking traz só indicadores e o ranking', () => {
    const html = gerarRelatorioHtml({ ...BASE, variante: 'reporte_ranking' });
    expect(html).toContain('ranking');
    expect(html).not.toContain('Anexo — quadro completo');
  });

  it('o recorte de um departamento aparece no título', () => {
    expect(tituloRelatorio({ variante: 'completo', departamentoUnico: 'Fábrica de Móveis' }))
      .toBe('Relatório de Horas Extras — Fábrica de Móveis');
    expect(tituloRelatorio({ variante: 'completo', departamentoUnico: null }))
      .toBe('Relatório de Horas Extras');
  });

  // Um dia só ou um departamento só continua com as 8 seções: a seção vira
  // linha única, mas não some — quem lê espera sempre a mesma estrutura.
  it('um único dia mantém as oito seções', () => {
    const html = gerarRelatorioHtml({ ...BASE, lancamentos: [DADOS[0]] });
    for (const n of ['01', '02', '03', '04', '05', '06', '07', '08']) {
      expect(html).toContain(`<span class="secao-num">${n}</span>`);
    }
  });

  it('recorte sem nenhum lançamento não quebra o documento', () => {
    const html = gerarRelatorioHtml({ ...BASE, lancamentos: [] });
    expect(html).toContain('<span class="secao-num">08</span>');
    expect(html).toContain('Nenhum lançamento no recorte.');
  });
});
