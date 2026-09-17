import { describe, it, expect } from 'vitest';
import { buildMovementReportRows } from './movementReport';
import { descreverFiltrosMov, resumoFiltrosMov, periodoRotuloMov } from './movementFilters';
import type { MovDetalhada } from '../services/inventoryApi';
import type { MovFiltros } from '../hooks/useInventoryMovements';
import type { VarInfo } from '../hooks/useInventoryMovements';

const varInfo = new Map<string, VarInfo>([
  ['v1', { nome: 'Camisa Polo', codigo: 'CP-01', tamanho: 'M', categoria: 'Camisas', custo: 30 }],
  ['v2', { nome: 'Calça Brim', codigo: '', tamanho: 'G', categoria: 'Calças', custo: 50 }],
]);
const unidadeNome = new Map([['u1', 'Almoxarifado Central']]);

const mov = (over: Partial<MovDetalhada> = {}): MovDetalhada => ({
  id: 'm1', numero: 'MOV-001', tipo: 'ENTRADA', unidadeId: 'u1', observacao: null,
  createdAt: '2026-09-17T13:00:00.000Z', referenciaTipo: 'ENTRADA', referenciaId: null, operacaoId: null,
  operadorNome: 'Kaio Melo', documento: null,
  itens: [{ varianteId: 'v1', quantidade: 10, direcao: 'IN', saldoAnterior: 0, saldoPosterior: 10 }],
  ...over,
} as MovDetalhada);

describe('buildMovementReportRows', () => {
  it('gera uma linha por ITEM, não por movimentação', () => {
    const linhas = buildMovementReportRows({
      movs: [mov({
        itens: [
          { varianteId: 'v1', quantidade: 10, direcao: 'IN', saldoAnterior: 0, saldoPosterior: 10 },
          { varianteId: 'v2', quantidade: 4, direcao: 'IN', saldoAnterior: 1, saldoPosterior: 5 },
        ],
      })],
      varInfo, unidadeNome,
    });
    expect(linhas).toHaveLength(2);
  });

  it('marca o sinal conforme a direção', () => {
    const [entrada] = buildMovementReportRows({ movs: [mov()], varInfo, unidadeNome });
    expect(entrada[5]).toBe('+10');

    const [saida] = buildMovementReportRows({
      movs: [mov({ itens: [{ varianteId: 'v1', quantidade: 3, direcao: 'OUT', saldoAnterior: 10, saldoPosterior: 7 }] })],
      varInfo, unidadeNome,
    });
    expect(saida[5]).toBe('−3');
  });

  it('mostra a transição de saldo', () => {
    const [l] = buildMovementReportRows({ movs: [mov()], varInfo, unidadeNome });
    expect(l[6]).toBe('0 → 10');
  });

  it('inclui o código do item entre parênteses, e omite quando não há', () => {
    const [comCodigo] = buildMovementReportRows({ movs: [mov()], varInfo, unidadeNome });
    expect(comCodigo[4]).toBe('Camisa Polo (CP-01)');

    const [semCodigo] = buildMovementReportRows({
      movs: [mov({ itens: [{ varianteId: 'v2', quantidade: 1, direcao: 'IN', saldoAnterior: 0, saldoPosterior: 1 }] })],
      varInfo, unidadeNome,
    });
    expect(semCodigo[4]).toBe('Calça Brim');
  });

  it('não quebra com item ou local desconhecido', () => {
    const [l] = buildMovementReportRows({
      movs: [mov({ unidadeId: 'zzz', itens: [{ varianteId: 'zzz', quantidade: 1, direcao: 'IN', saldoAnterior: 0, saldoPosterior: 1 }] })],
      varInfo, unidadeNome,
    });
    expect(l[3]).toBe('—');
    expect(l[4]).toBe('—');
  });

  it('sem movimentações devolve lista vazia', () => {
    expect(buildMovementReportRows({ movs: [], varInfo, unidadeNome })).toEqual([]);
  });
});

// ---------------------------------------------------------------- filtros
const FILTROS: MovFiltros = {
  periodo: '30d', mesRef: '', tipo: '', direcao: '', unidadeId: '', origem: '',
  varianteId: '', categoria: '', responsavel: '', comNf: false, comObs: false,
};
const OPCOES = {
  unidades: [{ id: 'u1', nome: 'Almoxarifado Central' }],
  variantes: [{ id: 'v1', nome: 'Camisa Polo (CP-01)' }],
};

describe('periodoRotuloMov', () => {
  it('descreve os atalhos rápidos e o histórico completo', () => {
    expect(periodoRotuloMov({ ...FILTROS, periodo: '30d' })).toBe('30 dias');
    expect(periodoRotuloMov({ ...FILTROS, periodo: 'todos' })).toBe('Todo o histórico');
  });

  it('descreve o mês fechado por extenso', () => {
    expect(periodoRotuloMov({ ...FILTROS, periodo: 'mes_ref', mesRef: '2026-09' })).toMatch(/2026/);
  });

  it('avisa quando o mês está vazio em vez de mentir um período', () => {
    expect(periodoRotuloMov({ ...FILTROS, periodo: 'mes_ref', mesRef: '' })).toBe('Mês não selecionado');
  });
});

describe('descreverFiltrosMov', () => {
  it('sem filtro ativo, lista vazia', () => {
    expect(descreverFiltrosMov(FILTROS, OPCOES)).toEqual([]);
  });

  it('resolve nomes de local e item pelos ids', () => {
    const r = descreverFiltrosMov({ ...FILTROS, unidadeId: 'u1', varianteId: 'v1' }, OPCOES);
    expect(r.map(x => x.rotulo)).toEqual(['Local: Almoxarifado Central', 'Item: Camisa Polo (CP-01)']);
  });

  it('cada filtro devolve a chave que o limpa', () => {
    const r = descreverFiltrosMov({ ...FILTROS, comNf: true, responsavel: 'Kaio Melo' }, OPCOES);
    expect(r.map(x => x.chave)).toEqual(['responsavel', 'comNf']);
  });

  it('id desconhecido não vira texto vazio', () => {
    const r = descreverFiltrosMov({ ...FILTROS, unidadeId: 'inexistente' }, OPCOES);
    expect(r[0].rotulo).toBe('Local: inexistente');
  });
});

describe('resumoFiltrosMov — linha do cabeçalho do PDF', () => {
  it('sem filtros diz isso explicitamente', () => {
    expect(resumoFiltrosMov(FILTROS, OPCOES, '')).toBe('Nenhum filtro aplicado');
  });

  it('junta filtros e busca', () => {
    const r = resumoFiltrosMov({ ...FILTROS, comObs: true }, OPCOES, '  polo  ');
    expect(r).toBe('Com observação · Busca: "polo"');
  });

  it('busca só de espaços não conta como filtro', () => {
    expect(resumoFiltrosMov(FILTROS, OPCOES, '   ')).toBe('Nenhum filtro aplicado');
  });
});
