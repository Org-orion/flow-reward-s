import { describe, it, expect } from 'vitest';
import { higienizar, nomeRelatorio, trechoData, nomeExportacaoDados } from './nomeArquivo';

describe('nome dos arquivos gerados', () => {
  it('dia único vira DD-MM-AAAA', () => {
    expect(trechoData('2026-09-22', '2026-09-22')).toBe('22-09-2026');
  });

  it('intervalo no mesmo mês vira DDaDD-MM-AAAA', () => {
    expect(trechoData('2026-09-14', '2026-09-19')).toBe('14a19-09-2026');
  });

  // "14a03-09-2026" não diria de que mês é cada ponta.
  it('intervalo entre meses é escrito por extenso nas duas pontas', () => {
    expect(trechoData('2026-08-14', '2026-09-03')).toBe('14-08-2026_a_03-09-2026');
  });

  it('acento e espaço somem do nome do departamento', () => {
    expect(higienizar('Fábrica 1 — Marcenaria')).toBe('Fabrica_1_Marcenaria');
    expect(higienizar('Administração — Distribuidora')).toBe('Administracao_Distribuidora');
  });

  it('segue a convenção do RH para cada variante', () => {
    expect(nomeRelatorio({ variante: 'completo', inicio: '2026-09-22', fim: '2026-09-22', extensao: 'pdf' }))
      .toBe('Relatorio_Horas_Extras_Concrem_22-09-2026.pdf');

    expect(nomeRelatorio({ variante: 'completo', inicio: '2026-09-14', fim: '2026-09-19', extensao: 'html' }))
      .toBe('Relatorio_Horas_Extras_Concrem_14a19-09-2026.html');

    expect(nomeRelatorio({
      variante: 'completo', inicio: '2026-09-22', fim: '2026-09-22',
      departamentoUnico: 'Fábrica de Móveis', extensao: 'pdf',
    })).toBe('Relatorio_Horas_Extras_Fabrica_de_Moveis_22-09-2026.pdf');

    expect(nomeRelatorio({ variante: 'reporte_ocorrencias', inicio: '2026-09-22', fim: '2026-09-22', extensao: 'pdf' }))
      .toBe('Reporte_Ocorrencias_Acima_Limite_22-09-2026.pdf');

    expect(nomeRelatorio({ variante: 'reporte_ranking', inicio: '2026-09-22', fim: '2026-09-22', extensao: 'pdf' }))
      .toBe('Reporte_Ranking_Horas_Extras_22-09-2026.pdf');
  });

  it('nome da exportação de dados', () => {
    expect(nomeExportacaoDados('2026-09-22', '2026-09-22')).toBe('Horas_Extras_Dados_22-09-2026.xlsx');
  });
});
