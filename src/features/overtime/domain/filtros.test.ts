import { describe, it, expect } from 'vitest';
import {
  aplicarFiltros, descreverFiltros, periodoDoAtalho, rotuloPeriodo, temFiltroAtivo,
  FILTROS_VAZIOS, type FiltrosOvertime,
} from './filtros';
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

const DADOS = [
  lanc('ALEX DA SILVA', 'FABRICA 1', '2026-09-22', '03:12', '1001'),
  lanc('IURI CARVALHO', 'FABRICA 1', '2026-09-22', '02:30', '1002'),
  lanc('HEBERT PASSOS', 'FABRICA 1', '2026-09-26', '01:00', '1003'),
  lanc('DIEGO SOUSA', 'MOVEIS', '2026-09-22', '00:00', '1004'),
];

const com = (p: Partial<FiltrosOvertime>): FiltrosOvertime => ({ ...FILTROS_VAZIOS, ...p });

describe('filtros do painel e do relatório', () => {
  it('sem filtro, nada é descartado', () => {
    expect(aplicarFiltros(DADOS, FILTROS_VAZIOS)).toHaveLength(4);
    expect(temFiltroAtivo(FILTROS_VAZIOS)).toBe(false);
  });

  it('filtra por departamento', () => {
    expect(aplicarFiltros(DADOS, com({ departamentos: ['MOVEIS'] })).map((l) => l.nome)).toEqual(['DIEGO SOUSA']);
  });

  it('filtra por faixa', () => {
    expect(aplicarFiltros(DADOS, com({ faixas: ['vermelho'] })).map((l) => l.nome)).toEqual(['ALEX DA SILVA']);
  });

  it('o interruptor de ocorrências pega amarelo e vermelho', () => {
    const r = aplicarFiltros(DADOS, com({ somenteAcimaDoLimite: true }));
    expect(r.map((l) => l.nome)).toEqual(['ALEX DA SILVA', 'IURI CARVALHO']);
  });

  it('filtra por valor mínimo de extra', () => {
    const r = aplicarFiltros(DADOS, com({ minimoExtraMin: 180 }));   // 03:00
    expect(r.map((l) => l.nome)).toEqual(['ALEX DA SILVA']);
  });

  // Isolar sábado é o caso que motivou o filtro: a jornada de 4h faz o sábado
  // produzir extras proporcionalmente maiores.
  it('filtra por dia da semana', () => {
    const sabado = aplicarFiltros(DADOS, com({ diasDaSemana: [6] }));
    expect(sabado.map((l) => l.nome)).toEqual(['HEBERT PASSOS']);
  });

  it('busca por nome ignora acento e caixa, e também casa matrícula', () => {
    expect(aplicarFiltros(DADOS, com({ busca: 'iuri' })).map((l) => l.nome)).toEqual(['IURI CARVALHO']);
    expect(aplicarFiltros(DADOS, com({ busca: '1004' })).map((l) => l.nome)).toEqual(['DIEGO SOUSA']);
  });

  it('filtros combinam por interseção', () => {
    const r = aplicarFiltros(DADOS, com({ departamentos: ['FABRICA 1'], somenteAcimaDoLimite: true, minimoExtraMin: 180 }));
    expect(r.map((l) => l.nome)).toEqual(['ALEX DA SILVA']);
  });
});

describe('descrição dos filtros', () => {
  it('descreve o que está aplicado, para o cabeçalho do relatório', () => {
    const texto = descreverFiltros(
      com({ departamentos: ['FABRICA 1'], somenteAcimaDoLimite: true, minimoExtraMin: 150, diasDaSemana: [6] }),
      (c) => (c === 'FABRICA 1' ? 'Fábrica 1' : c),
    );
    expect(texto).toEqual([
      'Departamentos: Fábrica 1',
      'Somente ocorrências acima do limite',
      'Extra mínimo: 02:30',
      'Dias da semana: Sábado',
    ]);
  });

  it('sem filtro, não descreve nada', () => {
    expect(descreverFiltros(FILTROS_VAZIOS)).toEqual([]);
  });
});

describe('período', () => {
  it('dia único não vira intervalo', () => {
    expect(rotuloPeriodo('2026-09-22', '2026-09-22')).toBe('22/09/2026');
    expect(rotuloPeriodo('2026-09-14', '2026-09-19')).toBe('14/09/2026 a 19/09/2026');
  });

  const hoje = new Date(2026, 8, 23);   // quarta, 23/09/2026

  it('ontem', () => {
    expect(periodoDoAtalho('ontem', hoje)).toEqual({ inicio: '2026-09-22', fim: '2026-09-22' });
  });

  it('últimos 7 dias inclui hoje', () => {
    expect(periodoDoAtalho('ultimos7', hoje)).toEqual({ inicio: '2026-09-17', fim: '2026-09-23' });
  });

  // A semana comercial da Concrem começa na segunda (sábado é dia útil de 4h).
  it('semana atual começa na segunda', () => {
    expect(periodoDoAtalho('semana_atual', hoje)).toEqual({ inicio: '2026-09-21', fim: '2026-09-23' });
  });

  it('mês atual começa no dia 1', () => {
    expect(periodoDoAtalho('mes_atual', hoje)).toEqual({ inicio: '2026-09-01', fim: '2026-09-23' });
  });

  it('segunda-feira é o começo da própria semana', () => {
    expect(periodoDoAtalho('semana_atual', new Date(2026, 8, 21))).toEqual({ inicio: '2026-09-21', fim: '2026-09-21' });
  });
});
