import { describe, it, expect } from 'vitest';
import { normalize, normalizeKey, parseDateISO, mapByNome, lerLinhaPlanilha, resolverRef } from './importParsing';

describe('normalize', () => {
  it('ignora acento, caixa e pontuação', () => {
    expect(normalize('Produção')).toBe(normalize('producao'));
    expect(normalize('  MONTAGEM de KIT ')).toBe('MONTAGEM DE KIT');
    expect(normalize('Auxiliar - Produção')).toBe('AUXILIAR PRODUCAO');
  });
  it('trata vazio', () => {
    expect(normalize(undefined)).toBe('');
    expect(normalize('   ')).toBe('');
  });
});

describe('normalizeKey', () => {
  it('transforma o cabeçalho em chave comparável', () => {
    expect(normalizeKey('Cód. Funcionário')).toBe('cod_funcionario');
    expect(normalizeKey('Data de Admissão')).toBe('data_de_admissao');
    expect(normalizeKey('  SETOR  ')).toBe('setor');
  });
});

describe('parseDateISO', () => {
  it('aceita dd/mm/aaaa e ISO', () => {
    expect(parseDateISO('15/01/2025')).toBe('2025-01-15');
    expect(parseDateISO('2025-01-15')).toBe('2025-01-15');
    expect(parseDateISO('2025-01-15T10:00:00Z')).toBe('2025-01-15');
  });
  it('aceita Date', () => {
    expect(parseDateISO(new Date(2026, 8, 22))).toBe('2026-09-22');
  });
  it('devolve null para vazio ou formato irreconhecível', () => {
    expect(parseDateISO('')).toBeNull();
    expect(parseDateISO(null)).toBeNull();
    expect(parseDateISO('ontem')).toBeNull();
    expect(parseDateISO('15-01-2025')).toBeNull();
  });
});

describe('mapByNome', () => {
  it('indexa por nome normalizado', () => {
    const m = mapByNome([{ id: 's1', nome: 'Montagem de Kit' }, { id: 's2', nome: 'Embalagem' }]);
    expect(m.get(normalize('MONTAGEM DE KIT'))).toBe('s1');
    expect(m.get(normalize('montagem de kit'))).toBe('s1');
  });
});

describe('lerLinhaPlanilha — apelidos de coluna', () => {
  it('aceita os nomes usuais de cada coluna', () => {
    const l = lerLinhaPlanilha({
      'Cód. Funcionário': '1277', 'Nome': 'Abias Oliveira', 'Data de Admissão': '15/01/2025',
      'Empresa': 'Concrem Industrial', 'Setor': 'Montagem de Kit', 'Cargo': 'Auxiliar de Produção',
      'Categoria': 'AUXILIAR', 'Base': 'Produção', 'Faixa': 'A', 'Local': 'Fábrica', 'Status': 'Ativo',
    });
    expect(l.cod).toBe('1277');
    expect(l.nome).toBe('Abias Oliveira');
    expect(l.dataAdmissao).toBe('2025-01-15');
    expect(l.empresaNome).toBe('Concrem Industrial');
    expect(l.setorNome).toBe('Montagem de Kit');
    expect(l.funcaoNome).toBe('Auxiliar de Produção');   // veio como "Cargo"
    expect(l.baseNome).toBe('Produção');
    expect(l.localDssNome).toBe('Fábrica');
  });

  it('aceita matrícula e cpf como código', () => {
    expect(lerLinhaPlanilha({ matricula: '88' }).cod).toBe('88');
    expect(lerLinhaPlanilha({ CPF: '99' }).cod).toBe('99');
  });

  it('aceita id explícito nas referências', () => {
    const l = lerLinhaPlanilha({ setor_id: 'uuid-1', funcao_id: 'uuid-2' });
    expect(l.setorId).toBe('uuid-1');
    expect(l.funcaoId).toBe('uuid-2');
  });

  it('linha sem nada devolve campos vazios, não quebra', () => {
    const l = lerLinhaPlanilha({});
    expect(l.cod).toBe('');
    expect(l.nome).toBe('');
    expect(l.dataAdmissao).toBeNull();
  });
});

describe('resolverRef', () => {
  const setores = mapByNome([{ id: 's1', nome: 'Montagem de Kit' }]);

  it('id explícito tem prioridade sobre o nome', () => {
    expect(resolverRef('uuid-x', 'Montagem de Kit', setores)).toEqual({ id: 'uuid-x', naoEncontrado: false });
  });
  it('resolve pelo nome, ignorando acento e caixa', () => {
    expect(resolverRef('', 'montagem de kit', setores)).toEqual({ id: 's1', naoEncontrado: false });
  });
  it('sinaliza nome que não existe no cadastro', () => {
    expect(resolverRef('', 'Setor Inventado', setores)).toEqual({ id: null, naoEncontrado: true });
  });
  it('coluna ausente não é erro — apenas não resolve', () => {
    expect(resolverRef('', '', setores)).toEqual({ id: null, naoEncontrado: false });
  });
});
