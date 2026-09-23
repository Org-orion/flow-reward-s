import { describe, it, expect } from 'vitest';
import { conciliarArquivo } from './conciliacao';
import { lerArquivoPonto } from './pontoParser';
import { planilhaLayoutB, type DepartamentoFixture } from './__fixtures__/pontoFixtures';

/** Dois funcionários somando 03:30 de extra, 17:36 de normais e 17:36 de carga. */
const DEP: DepartamentoFixture = {
  codigo: 'FABRICA 1',
  subtotal: { funcionarios: '2', normais: '17:36', extras: '03:30', carga: '17:36' },
  funcionarios: [
    { matricula: '1', nome: 'ALEX', ent1: '06:00', sai1: '12:00', normais: '08:48', extras: '02:10', carga: '08:48' },
    { matricula: '2', nome: 'BIA', ent1: '07:00', sai1: '12:00', normais: '08:48', extras: '01:20', carga: '08:48' },
  ],
};

const arquivoOk = lerArquivoPonto(planilhaLayoutB({
  departamentos: [DEP],
  totalGeral: { funcionarios: '2', normais: '17:36', extras: '03:30', carga: '17:36' },
}));

describe('conciliação com os totais do próprio arquivo', () => {
  it('confere quando a soma bate com SUBTOTAL e TOTAL GERAL', () => {
    const r = conciliarArquivo(arquivoOk);
    expect(r.ok).toBe(true);
    expect(r.divergencias).toEqual([]);
    expect(r.conferencias).toBeGreaterThan(0);
    expect(r.semReferencia).toEqual([]);
  });

  // Este é o caso que a conciliação existe para pegar: uma linha deixada para
  // trás some do relatório sem qualquer sintoma visível.
  it('acusa horas extras a menos quando um lançamento não foi lido', () => {
    const arquivo = lerArquivoPonto(planilhaLayoutB({
      departamentos: [{ ...DEP, funcionarios: [DEP.funcionarios[0]] }],
      totalGeral: { funcionarios: '2', normais: '17:36', extras: '03:30', carga: '17:36' },
    }));
    const r = conciliarArquivo(arquivo);
    expect(r.ok).toBe(false);

    const extras = r.divergencias.find((d) => d.escopo === 'departamento' && d.campo === 'extras')!;
    expect(extras.esperado).toBe(210);          // 03:30
    expect(extras.calculado).toBe(130);         // 02:10
    expect(extras.delta).toBe(-80);

    const contagem = r.divergencias.find((d) => d.campo === 'funcionarios')!;
    expect(contagem).toMatchObject({ esperado: 2, calculado: 1, delta: -1 });
  });

  it('acusa divergência também no TOTAL GERAL', () => {
    const arquivo = lerArquivoPonto(planilhaLayoutB({
      departamentos: [DEP],
      totalGeral: { funcionarios: '2', normais: '17:36', extras: '04:00', carga: '17:36' },
    }));
    const r = conciliarArquivo(arquivo);
    expect(r.ok).toBe(false);
    expect(r.divergencias.some((d) => d.escopo === 'geral' && d.campo === 'extras')).toBe(true);
  });

  // Sem SUBTOTAL não há o que conferir — e isso precisa ficar visível, e não
  // passar como "conciliou".
  it('lista o departamento sem linha de conferência', () => {
    const arquivo = lerArquivoPonto(planilhaLayoutB({
      departamentos: [{ codigo: 'FABRICA 1', funcionarios: DEP.funcionarios }],
    }));
    const r = conciliarArquivo(arquivo);
    expect(r.semReferencia).toEqual(['FABRICA 1']);
    expect(r.conferencias).toBe(0);
  });

  it('conta uma conferência por campo e por escopo', () => {
    const r = conciliarArquivo(arquivoOk);
    // 4 campos de hora + contagem, por departamento e no total geral.
    expect(r.conferencias).toBe(10);
  });
});
