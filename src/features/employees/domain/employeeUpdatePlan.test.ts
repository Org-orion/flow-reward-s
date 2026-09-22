import { describe, it, expect } from 'vitest';
import { planejarAtualizacao, temMudanca, CAMPOS_ATUALIZAVEIS, CAMPO_ROTULO } from './employeeUpdatePlan';
import type { Funcionario } from '@/hooks/useFuncionarios';

const func = (over: Partial<Funcionario> = {}): Funcionario => ({
  id: 'f1', nome: 'Fulano', cpf: '0001', ativo: true,
  empresa_id: null, setor_id: null, funcao_id: null, categoria_id: null,
  base_premiacao_id: null, faixa_id: null, local_dss_id: null,
  data_admissao: null, status: 'Ativo',
  ...over,
} as unknown as Funcionario);

describe('planejarAtualizacao — preencher vazios', () => {
  it('preenche campo vazio e registra o preenchimento', () => {
    const p = planejarAtualizacao(func(), { setor_id: 's1' });
    expect(p.patch).toEqual({ setor_id: 's1' });
    expect(p.preenchimentos).toEqual([
      { campo: 'setor_id', rotulo: 'Setor', de: null, para: 's1', tipo: 'preenche' },
    ]);
    expect(p.divergencias).toEqual([]);
    expect(temMudanca(p)).toBe(true);
  });

  it('preenche vários campos de uma vez', () => {
    const p = planejarAtualizacao(func(), { setor_id: 's1', funcao_id: 'fu1', faixa_id: 'fx1' });
    expect(Object.keys(p.patch).sort()).toEqual(['faixa_id', 'funcao_id', 'setor_id']);
    expect(p.preenchimentos).toHaveLength(3);
  });

  it('campo ausente na planilha NÃO zera o cadastro', () => {
    const p = planejarAtualizacao(func({ setor_id: 's1' } as Partial<Funcionario>), { funcao_id: 'fu1' });
    expect(p.patch).toEqual({ funcao_id: 'fu1' });
    expect(p.patch).not.toHaveProperty('setor_id');
  });

  it('string vazia ou só espaços na planilha é ignorada', () => {
    const p = planejarAtualizacao(func(), { setor_id: '', funcao_id: '   ', categoria_id: null });
    expect(p.patch).toEqual({});
    expect(temMudanca(p)).toBe(false);
  });

  it('valor igual ao que já está gravado não vira escrita', () => {
    const p = planejarAtualizacao(func({ setor_id: 's1' } as Partial<Funcionario>), { setor_id: 's1' });
    expect(p.patch).toEqual({});
    expect(p.preenchimentos).toEqual([]);
    expect(p.divergencias).toEqual([]);
  });
});

describe('planejarAtualizacao — divergências', () => {
  const atual = func({ setor_id: 's1', funcao_id: 'fu1' } as Partial<Funcionario>);

  it('por padrão NÃO sobrescreve: só relata', () => {
    const p = planejarAtualizacao(atual, { setor_id: 's2' });
    expect(p.patch).toEqual({});
    expect(p.divergencias).toEqual([
      { campo: 'setor_id', rotulo: 'Setor', de: 's1', para: 's2', tipo: 'diverge' },
    ]);
    expect(temMudanca(p)).toBe(false);
  });

  it('com sobrescrever ligado, grava a divergência', () => {
    const p = planejarAtualizacao(atual, { setor_id: 's2' }, { sobrescrever: true });
    expect(p.patch).toEqual({ setor_id: 's2' });
    expect(p.divergencias).toHaveLength(1);
  });

  it('mistura: preenche o vazio e relata a divergência sem gravá-la', () => {
    const p = planejarAtualizacao(atual, { setor_id: 's2', categoria_id: 'c1' });
    expect(p.patch).toEqual({ categoria_id: 'c1' });
    expect(p.preenchimentos.map(m => m.campo)).toEqual(['categoria_id']);
    expect(p.divergencias.map(m => m.campo)).toEqual(['setor_id']);
  });
});

describe('planejarAtualizacao — setor com lista (setor_ids)', () => {
  // O cadastro guarda setor em duas formas. Ignorar `setor_ids` faria o
  // importador achar que quem tem setor pela lista está sem setor.
  it('quem tem setor_ids NÃO é tratado como vazio', () => {
    const atual = func({ setor_id: null, setor_ids: ['s9'] } as unknown as Partial<Funcionario>);
    const p = planejarAtualizacao(atual, { setor_id: 's2' });
    expect(p.patch).toEqual({});
    expect(p.divergencias.map(m => m.de)).toEqual(['s9']);
  });

  it('setor_ids vazio conta como vazio e é preenchido', () => {
    const atual = func({ setor_id: null, setor_ids: [] } as unknown as Partial<Funcionario>);
    const p = planejarAtualizacao(atual, { setor_id: 's2' });
    expect(p.patch).toEqual({ setor_id: 's2' });
  });

  it('setor_ids igual ao do arquivo não gera escrita', () => {
    const atual = func({ setor_id: null, setor_ids: ['s2'] } as unknown as Partial<Funcionario>);
    const p = planejarAtualizacao(atual, { setor_id: 's2' });
    expect(temMudanca(p)).toBe(false);
  });
});

describe('integridade do registro de campos', () => {
  it('todo campo atualizável tem rótulo legível', () => {
    for (const c of CAMPOS_ATUALIZAVEIS) {
      expect(CAMPO_ROTULO[c], c).toBeTruthy();
    }
  });

  it('os sete campos de completude vêm primeiro', () => {
    expect(CAMPOS_ATUALIZAVEIS.slice(0, 7)).toEqual([
      'empresa_id', 'setor_id', 'funcao_id', 'categoria_id',
      'base_premiacao_id', 'faixa_id', 'local_dss_id',
    ]);
  });

  it('planilha sem nenhum campo conhecido não produz mudança', () => {
    expect(temMudanca(planejarAtualizacao(func(), {}))).toBe(false);
  });
});
