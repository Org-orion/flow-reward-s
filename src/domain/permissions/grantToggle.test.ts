import { describe, it, expect } from 'vitest';
import { toggleGrant, toggleResource, diffExcecoes } from './grantToggle';

const s = (set: Set<string>) => [...set].sort();

describe('toggleGrant — ações', () => {
  it('marcar uma ação marca "ver" junto', () => {
    const r = toggleGrant([], 'producao_setor.criar', true);
    expect(r.has('producao_setor.ver')).toBe(true);
    expect(r.has('producao_setor.criar')).toBe(true);
  });

  it('marcar "editar" libera ver+editar de todos os campos controlados', () => {
    const r = toggleGrant([], 'producao_setor.editar', true);
    expect(s(r)).toEqual([
      'producao_setor.campo.meta.editar',
      'producao_setor.campo.meta.ver',
      'producao_setor.campo.realizado.editar',
      'producao_setor.campo.realizado.ver',
      'producao_setor.editar',
      'producao_setor.ver',
    ]);
  });

  it('desmarcar "editar" trava a edição dos campos mas mantém a leitura', () => {
    const base = toggleGrant([], 'producao_setor.editar', true);
    const r = toggleGrant(base, 'producao_setor.editar', false);
    expect(s(r)).toEqual([
      'producao_setor.campo.meta.ver',
      'producao_setor.campo.realizado.ver',
      'producao_setor.ver',
    ]);
  });

  it('desmarcar "ver" zera o recurso inteiro', () => {
    const base = toggleGrant(toggleGrant([], 'producao_setor.editar', true), 'producao_setor.importar', true);
    const r = toggleGrant(base, 'producao_setor.ver', false);
    expect(s(r)).toEqual([]);
  });

  it('não afeta outros recursos', () => {
    const base = toggleGrant(['indicadores_gerais.ver'], 'producao_setor.editar', true);
    const r = toggleGrant(base, 'producao_setor.ver', false);
    expect(s(r)).toEqual(['indicadores_gerais.ver']);
  });
});

describe('toggleGrant — campos', () => {
  it('o caso do print: editar tudo e depois travar só a meta', () => {
    let g = toggleGrant([], 'producao_setor.editar', true);
    g = toggleGrant(g, 'producao_setor.campo.meta.editar', false);
    expect(s(g)).toEqual([
      'producao_setor.campo.meta.ver',
      'producao_setor.campo.realizado.editar',
      'producao_setor.campo.realizado.ver',
      'producao_setor.editar',
      'producao_setor.ver',
    ]);
  });

  it('marcar a edição de um campo garante a visão dele e o editar do recurso', () => {
    const r = toggleGrant([], 'producao_setor.campo.realizado.editar', true);
    expect(s(r)).toEqual([
      'producao_setor.campo.realizado.editar',
      'producao_setor.campo.realizado.ver',
      'producao_setor.editar',
      'producao_setor.ver',
    ]);
  });

  it('esconder um campo também remove a edição dele', () => {
    const base = toggleGrant([], 'producao_setor.editar', true);
    const r = toggleGrant(base, 'producao_setor.campo.meta.ver', false);
    expect(r.has('producao_setor.campo.meta.editar')).toBe(false);
    expect(r.has('producao_setor.campo.realizado.editar')).toBe(true);
  });

  it('ignora concessão malformada ou recurso inexistente', () => {
    expect(s(toggleGrant(['a.ver'], 'lixo', true))).toEqual(['a.ver']);
    expect(s(toggleGrant([], 'nao_existe.ver', true))).toEqual([]);
  });
});

describe('toggleResource', () => {
  it('marca e desmarca tudo do recurso, campos incluídos', () => {
    const all = toggleResource([], 'indicadores_setor', true);
    expect(s(all)).toEqual([
      'indicadores_setor.campo.meta.editar',
      'indicadores_setor.campo.meta.ver',
      'indicadores_setor.campo.realizado.editar',
      'indicadores_setor.campo.realizado.ver',
      'indicadores_setor.editar',
      'indicadores_setor.ver',
    ]);
    expect(s(toggleResource(all, 'indicadores_setor', false))).toEqual([]);
  });

  it('não mexe em outros recursos', () => {
    const r = toggleResource(['producao_historico.ver'], 'indicadores_setor', true);
    expect(r.has('producao_historico.ver')).toBe(true);
  });
});

describe('diffExcecoes', () => {
  it('separa o que foi somado e o que foi retirado do perfil', () => {
    const d = diffExcecoes(
      ['producao_setor.ver', 'producao_setor.editar'],
      ['producao_setor.ver', 'indicadores_gerais.ver'],
    );
    expect(d).toEqual({ mais: ['indicadores_gerais.ver'], menos: ['producao_setor.editar'] });
  });

  it('sem diferença devolve listas vazias', () => {
    expect(diffExcecoes(['a.ver'], ['a.ver'])).toEqual({ mais: [], menos: [] });
  });
});
