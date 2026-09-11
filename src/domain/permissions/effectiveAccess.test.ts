import { describe, it, expect } from 'vitest';
import {
  buildAccessState, resolveGrants, hasGranularConfig,
  accessCanSection, accessCan, accessCanField, accessCanEditAnyField,
} from './effectiveAccess';

const legado = (secoes: string[], perfil = 'producao') => buildAccessState(perfil, secoes, null);

describe('resolveGrants', () => {
  it('une perfil e exceções e remove as negadas', () => {
    const g = resolveGrants({
      perfilPermissoes: ['producao_setor.ver', 'producao_setor.editar'],
      mais: ['indicadores_setor.ver'],
      menos: ['producao_setor.editar'],
    });
    expect([...g].sort()).toEqual(['indicadores_setor.ver', 'producao_setor.ver']);
  });

  it('menos vence até sobre mais', () => {
    const g = resolveGrants({ mais: ['producao_setor.ver'], menos: ['producao_setor.ver'] });
    expect(g.has('producao_setor.ver')).toBe(false);
  });

  it('detecta ausência de configuração granular', () => {
    expect(hasGranularConfig(null)).toBe(false);
    expect(hasGranularConfig({})).toBe(false);
    expect(hasGranularConfig({ mais: [] })).toBe(true);
  });
});

describe('admin', () => {
  const a = buildAccessState('admin', [], null);
  it('passa em tudo, inclusive campos', () => {
    expect(accessCanSection(a, 'producao')).toBe(true);
    expect(accessCan(a, 'producao_setor', 'editar')).toBe(true);
    expect(accessCanField(a, 'producao_setor', 'meta', 'editar')).toBe(true);
  });
});

describe('usuário legado (sem config granular) — comportamento atual preservado', () => {
  it('seção libera a tela inteira e todos os campos', () => {
    const a = legado(['producao']);
    expect(accessCanSection(a, 'producao')).toBe(true);
    expect(accessCan(a, 'producao_setor', 'editar')).toBe(true);
    expect(accessCanField(a, 'producao_setor', 'meta', 'editar')).toBe(true);
    expect(accessCanField(a, 'producao_setor', 'realizado', 'editar')).toBe(true);
  });

  it('sem a seção, nega tudo', () => {
    const a = legado(['rh']);
    expect(accessCanSection(a, 'producao')).toBe(false);
    expect(accessCan(a, 'producao_setor', 'ver')).toBe(false);
    expect(accessCanField(a, 'producao_setor', 'meta', 'editar')).toBe(false);
  });
});

describe('usuário granular', () => {
  // Caso do print: vê a tela e altera SÓ o realizado (meta fica travada).
  const apontador = buildAccessState('producao', [], {
    perfilPermissoes: [
      'producao_setor.ver',
      'producao_setor.editar',
      'producao_setor.campo.meta.ver',
      'producao_setor.campo.realizado.ver',
      'producao_setor.campo.realizado.editar',
    ],
  });

  it('vê a tela', () => {
    expect(accessCan(apontador, 'producao_setor', 'ver')).toBe(true);
    expect(accessCanSection(apontador, 'producao')).toBe(true);
  });

  it('edita realizado mas NÃO edita meta', () => {
    expect(accessCanField(apontador, 'producao_setor', 'realizado', 'editar')).toBe(true);
    expect(accessCanField(apontador, 'producao_setor', 'meta', 'editar')).toBe(false);
  });

  it('vê meta (leitura concedida) e mesmo assim não a edita', () => {
    expect(accessCanField(apontador, 'producao_setor', 'meta', 'ver')).toBe(true);
    expect(accessCanField(apontador, 'producao_setor', 'meta', 'editar')).toBe(false);
  });

  it('tem algum campo editável (habilita salvar)', () => {
    expect(accessCanEditAnyField(apontador, 'producao_setor')).toBe(true);
  });

  it('não recebe ações não concedidas', () => {
    expect(accessCan(apontador, 'producao_setor', 'criar')).toBe(false);
    expect(accessCan(apontador, 'producao_setor', 'importar')).toBe(false);
    expect(accessCan(apontador, 'indicadores_gerais', 'ver')).toBe(false);
  });

  it('campo controlado exige TAMBÉM a ação no recurso', () => {
    const semEditar = buildAccessState('producao', [], {
      perfilPermissoes: ['producao_setor.ver', 'producao_setor.campo.realizado.editar'],
    });
    expect(accessCanField(semEditar, 'producao_setor', 'realizado', 'editar')).toBe(false);
    expect(accessCanEditAnyField(semEditar, 'producao_setor')).toBe(false);
  });

  it('somente leitura: vê e não edita nada', () => {
    const leitor = buildAccessState('producao', [], {
      perfilPermissoes: ['producao_setor.ver', 'producao_setor.campo.meta.ver', 'producao_setor.campo.realizado.ver'],
    });
    expect(accessCan(leitor, 'producao_setor', 'ver')).toBe(true);
    expect(accessCanEditAnyField(leitor, 'producao_setor')).toBe(false);
  });

  it('em seção granular as concessões mandam e `secoes` é ignorada', () => {
    const comSecaoSemGrant = buildAccessState('producao', ['producao'], { perfilPermissoes: ['indicadores_gerais.ver'] });
    expect(accessCanSection(comSecaoSemGrant, 'producao')).toBe(true); // via indicadores_gerais
    expect(accessCan(comSecaoSemGrant, 'producao_setor', 'ver')).toBe(false);

    const soSecao = buildAccessState('producao', ['producao'], { perfilPermissoes: [] });
    expect(accessCanSection(soSecao, 'producao')).toBe(false);
  });

  // Todas as seções do registro atual já são granulares. Este ramo protege
  // seções futuras (declaradas em ALL_SECTIONS antes de terem recursos):
  // nelas, `secoes` continua sendo a fonte de verdade.
  it('em seção AINDA não granular, `secoes` continua valendo', () => {
    const a = buildAccessState('producao', ['secao_futura'], { perfilPermissoes: ['producao_setor.ver'] });
    expect(accessCanSection(a, 'secao_futura')).toBe(true);
    expect(accessCanSection(a, 'outra_secao_futura')).toBe(false);
  });

  it('com todas as seções já granulares, `secoes` não concede nada por si só', () => {
    const a = buildAccessState('producao', ['cadastros', 'estoque'], { perfilPermissoes: ['producao_setor.ver'] });
    expect(accessCanSection(a, 'cadastros')).toBe(false);
    expect(accessCanSection(a, 'estoque')).toBe(false);
    expect(accessCanSection(a, 'producao')).toBe(true);
  });

  it('recurso desconhecido é negado (fail-closed)', () => {
    expect(accessCan(apontador, 'recurso_inexistente', 'ver')).toBe(false);
    expect(accessCanField(apontador, 'recurso_inexistente', 'x', 'editar')).toBe(false);
  });

  it('campo não declarado no registro segue a ação do recurso', () => {
    expect(accessCanField(apontador, 'producao_setor', 'observacoes', 'editar')).toBe(true);
  });
});
