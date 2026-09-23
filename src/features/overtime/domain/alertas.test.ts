import { describe, it, expect } from 'vitest';
import { calcularAlertas, funcionariosReincidentes, DIAS_PARA_REINCIDENCIA } from './alertas';
import { classificarFaixa } from './faixas';
import { parseHoraMin } from './tempo';
import type { Lancamento } from './pontoTipos';

function lanc(nome: string, dep: string, data: string, extras: string, matricula = nome): Lancamento {
  const extrasMin = parseHoraMin(extras) ?? 0;
  return {
    matricula, nome, departamentoCodigo: dep, departamentoNome: dep,
    data, ent1: null, sai1: null, ent2: null, sai2: null, ent3: null, sai3: null,
    statusAfastamento: null, normaisMin: 0, faltasMin: 0, extrasMin, cargaMin: 0,
    faixa: classificarFaixa(extrasMin),
  };
}

const tipos = (lancs: Lancamento[]) => calcularAlertas(lancs).map((a) => a.tipo);

describe('alertas automáticos', () => {
  it('conjunto sem nada a apontar não gera alerta', () => {
    expect(calcularAlertas([lanc('ANA', 'FABRICA 1', '2026-09-22', '01:00')])).toEqual([]);
  });

  it('acusa ocorrência acima do limite legal, com o pior caso nomeado', () => {
    const alertas = calcularAlertas([
      lanc('ALEX', 'FABRICA 1', '2026-09-22', '03:12'),
      lanc('BIA', 'FABRICA 1', '2026-09-22', '02:40'),
    ]);
    const a = alertas.find((x) => x.tipo === 'limite_legal')!;
    expect(a.gravidade).toBe('alta');
    expect(a.quantidade).toBe(2);
    expect(a.detalhe).toContain('03:12');
    expect(a.detalhe).toContain('ALEX');
    expect(a.detalhe).toContain('22/09/2026');
  });

  // A jornada de aprendiz não admite hora extra: nem a faixa verde é aceitável.
  it('acusa QUALQUER hora extra em aprendizes, mesmo dentro do verde', () => {
    const alertas = calcularAlertas([lanc('JOAO', 'ADMINISTRATIVO APRENDIZES', '2026-09-22', '00:15')]);
    expect(alertas.map((a) => a.tipo)).toContain('aprendiz');
  });

  it('aprendiz sem extra não gera alerta', () => {
    expect(tipos([lanc('JOAO', 'ADMINISTRATIVO APRENDIZES', '2026-09-22', '00:00')])).not.toContain('aprendiz');
  });

  it('reconhece o departamento de aprendizes sem depender de acento', () => {
    expect(tipos([lanc('JOAO', 'Administrativo Aprendizes', '2026-09-22', '00:30')])).toContain('aprendiz');
  });

  it('acusa divergência de conciliação das importações do período', () => {
    const alertas = calcularAlertas([lanc('ANA', 'FABRICA 1', '2026-09-22', '00:30')], {
      importacoesComDivergencia: [{ dataInicio: '2026-09-22', dataFim: '2026-09-22' }],
    });
    const a = alertas.find((x) => x.tipo === 'conciliacao')!;
    expect(a.gravidade).toBe('alta');
    expect(a.detalhe).toContain('22/09/2026');
  });
});

describe('reincidência', () => {
  const tresDias = ['2026-09-21', '2026-09-22', '2026-09-23']
    .map((d) => lanc('ALEX', 'FABRICA 1', d, '02:20', '1001'));

  it(`acusa a partir de ${DIAS_PARA_REINCIDENCIA} dias com ocorrência`, () => {
    const r = funcionariosReincidentes(tresDias);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ matricula: '1001', nome: 'ALEX', dias: 3 });
  });

  it('dois dias ainda não é reincidência', () => {
    expect(funcionariosReincidentes(tresDias.slice(0, 2))).toEqual([]);
  });

  // Contam DIAS distintos, não lançamentos: o mesmo dia repetido não acumula.
  it('conta dias distintos, não lançamentos', () => {
    const mesmoDia = [
      lanc('BIA', 'FABRICA 1', '2026-09-22', '02:20', '2001'),
      lanc('BIA', 'FABRICA 1', '2026-09-22', '02:30', '2001'),
      lanc('BIA', 'FABRICA 1', '2026-09-22', '02:40', '2001'),
    ];
    expect(funcionariosReincidentes(mesmoDia)).toEqual([]);
  });

  it('extra dentro do verde não conta para reincidência', () => {
    const verdes = ['2026-09-21', '2026-09-22', '2026-09-23']
      .map((d) => lanc('CLARA', 'FABRICA 1', d, '01:00', '3001'));
    expect(funcionariosReincidentes(verdes)).toEqual([]);
  });

  it('ordena do mais reincidente para o menos', () => {
    const outro = ['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23']
      .map((d) => lanc('DINA', 'FABRICA 2', d, '02:10', '4001'));
    const r = funcionariosReincidentes([...tresDias, ...outro]);
    expect(r.map((x) => x.nome)).toEqual(['DINA', 'ALEX']);
  });

  it('o alerta lista os primeiros e resume o restante', () => {
    const muitos = Array.from({ length: 7 }, (_, i) =>
      ['2026-09-21', '2026-09-22', '2026-09-23'].map((d) => lanc(`F${i}`, 'FABRICA 1', d, '02:20', `M${i}`)),
    ).flat();
    const a = calcularAlertas(muitos).find((x) => x.tipo === 'reincidencia')!;
    expect(a.quantidade).toBe(7);
    expect(a.detalhe).toContain('e mais 2');
  });
});
