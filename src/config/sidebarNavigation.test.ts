import { describe, it, expect } from 'vitest';
import type { SectionKey } from '@/contexts/AuthContext';
import {
  navigationByModule, resolveSidebarModule, moduleHome,
  isItemActive, isGroupActive, filterNavigation, activeGroupIds,
} from './sidebarNavigation';
import { resourceDef } from './permissions';

const ctxAdmin = { isAdmin: true, canAccess: () => true, can: () => true, isGranular: false };
const ctxNone = { isAdmin: false, canAccess: () => false, can: () => false, isGranular: false };
// Usuário LEGADO: `can(recurso)` equivale a ter a seção do recurso — é
// exatamente o que o motor faz (ver domain/permissions/effectiveAccess.ts), e
// aqui usamos o registro real para não duplicar o mapa recurso→seção.
const ctxSome = (secs: SectionKey[]) => ({
  isAdmin: false,
  canAccess: (s: SectionKey) => secs.includes(s),
  can: (resource: string) => {
    const section = resourceDef(resource)?.section;
    return !!section && secs.includes(section as SectionKey);
  },
  isGranular: false,
});

/** Usuário GRANULAR: só enxerga as telas cujos recursos foram concedidos. */
const ctxGranular = (recursos: string[]) => ({
  isAdmin: false,
  canAccess: () => true,
  can: (resource: string) => recursos.includes(resource),
  isGranular: true,
});

const byId = (items: { id: string }[]) => items.map((i) => i.id);

describe('resolveSidebarModule — fonte única do módulo', () => {
  it('detecta cargos-salários por prefixo, senão premiações', () => {
    expect(resolveSidebarModule('/cargos-salarios')).toBe('cargos-salarios');
    expect(resolveSidebarModule('/cargos-salarios/cargos')).toBe('cargos-salarios');
    expect(resolveSidebarModule('/premiacoes')).toBe('premiacoes');
    expect(resolveSidebarModule('/premiacoes/funcionarios')).toBe('premiacoes');
    expect(resolveSidebarModule('/cadastros/usuarios')).toBe('premiacoes');
  });
  it('tem home para cada módulo', () => {
    expect(moduleHome['cargos-salarios']).toBe('/cargos-salarios');
    expect(moduleHome.premiacoes).toBe('/premiacoes');
  });
});

describe('isItemActive — exato para raízes, prefixo para filhos', () => {
  const dash = { id: 'd', title: 'D', icon: {} as never, href: '/premiacoes', exactActive: true };
  const func = { id: 'f', title: 'F', icon: {} as never, href: '/premiacoes/funcionarios' };
  it('raiz exata não ativa em subrota', () => {
    expect(isItemActive(dash, '/premiacoes')).toBe(true);
    expect(isItemActive(dash, '/premiacoes/funcionarios')).toBe(false);
  });
  it('folha ativa por prefixo de segmento', () => {
    expect(isItemActive(func, '/premiacoes/funcionarios')).toBe(true);
    expect(isItemActive(func, '/premiacoes/funcionarios/123')).toBe(true);
    expect(isItemActive(func, '/premiacoes/funcionarios-x')).toBe(false); // não confunde prefixo textual
  });
});

describe('isGroupActive + activeGroupIds', () => {
  const nav = navigationByModule.premiacoes;
  it('grupo ativo quando filho está ativo', () => {
    const cadastros = nav.find((i) => i.id === 'cadastros')!;
    expect(isGroupActive(cadastros, '/premiacoes/cadastros/setores')).toBe(true);
    expect(isGroupActive(cadastros, '/premiacoes/funcionarios')).toBe(false);
  });
  it('activeGroupIds retorna o grupo que contém a rota', () => {
    expect(activeGroupIds(nav, '/premiacoes/cadastros/faixas')).toEqual(['cadastros']);
    expect(activeGroupIds(nav, '/premiacoes/dss')).toEqual(['sesmt']);
    expect(activeGroupIds(nav, '/premiacoes')).toEqual([]);
  });
});

describe('filterNavigation — reflete permissões existentes', () => {
  it('admin vê tudo, inclusive USUÁRIOS', () => {
    const nav = filterNavigation(navigationByModule.premiacoes, ctxAdmin);
    expect(byId(nav)).toContain('usuarios');
    expect(byId(nav)).toContain('cadastros');
  });
  it('sem permissões: nada de premiações (nem usuarios)', () => {
    const nav = filterNavigation(navigationByModule.premiacoes, ctxNone);
    expect(nav).toHaveLength(0);
  });
  it('acesso limitado mostra só as seções permitidas', () => {
    const nav = filterNavigation(navigationByModule.premiacoes, ctxSome(['rh']));
    expect(byId(nav)).toEqual(['rh']);
    expect(nav[0].children?.length).toBe(2);
  });
  it('USUÁRIOS é adminOnly (oculto para não-admin mesmo com seções)', () => {
    const nav = filterNavigation(navigationByModule.premiacoes, ctxSome(['dashboard', 'cadastros']));
    expect(byId(nav)).not.toContain('usuarios');
    expect(byId(nav)).toEqual(['dashboard', 'cadastros']);
  });
  it('cargos-salários não depende de seção (módulo guardado por rota) e mantém estrutura', () => {
    const nav = filterNavigation(navigationByModule['cargos-salarios'], ctxNone);
    expect(byId(nav)).toEqual(['cs-dashboard', 'cs-cargos', 'cs-func', 'cs-cadastros']);
    expect(nav.find((i) => i.id === 'cs-cadastros')?.children?.[0].href).toBe('/cargos-salarios/cadastros/setores');
  });

  describe('controle-estoque — módulo gateado pela seção estoque', () => {
    it('sem a seção estoque: módulo inteiro oculto', () => {
      expect(filterNavigation(navigationByModule['controle-estoque'], ctxNone)).toHaveLength(0);
      expect(filterNavigation(navigationByModule['controle-estoque'], ctxSome(['rh']))).toHaveLength(0);
    });
    it('com a seção estoque: mostra todos os grupos/itens', () => {
      const nav = filterNavigation(navigationByModule['controle-estoque'], ctxSome(['estoque']));
      expect(byId(nav)).toEqual(['ce-visao-geral', 'ce-grp-estoque', 'ce-grp-operacoes', 'ce-grp-historico', 'ce-cadastros']);
      expect(nav.find((i) => i.id === 'ce-grp-operacoes')?.children?.map((c) => c.id))
        .toEqual(['ce-entradas', 'ce-entregas', 'ce-devolucoes', 'ce-troca']);
    });
    it('admin vê tudo', () => {
      const nav = filterNavigation(navigationByModule['controle-estoque'], ctxAdmin);
      expect(byId(nav)).toContain('ce-cadastros');
      expect(byId(nav)).toContain('ce-grp-estoque');
    });
  });

  describe('usuário granular — filtra tela por tela', () => {
    it('mostra apenas os cadastros concedidos', () => {
      const nav = filterNavigation(navigationByModule.premiacoes, ctxGranular(['cad_setores', 'cad_faixas']));
      expect(byId(nav)).toEqual(['cadastros']);
      expect(nav[0].children?.map((c) => c.id)).toEqual(['cad-setores', 'cad-faixas']);
    });

    it('some com o grupo inteiro quando nenhuma tela dele é concedida', () => {
      const nav = filterNavigation(navigationByModule.premiacoes, ctxGranular(['dss']));
      expect(byId(nav)).toEqual(['sesmt']);
      expect(nav[0].children?.map((c) => c.id)).toEqual(['sesmt-dss']);
    });

    it('sem nenhum recurso concedido, a navegação fica vazia', () => {
      expect(filterNavigation(navigationByModule.premiacoes, ctxGranular([]))).toHaveLength(0);
      expect(filterNavigation(navigationByModule['controle-estoque'], ctxGranular([]))).toHaveLength(0);
    });

    it('em Cargos e Salários, filtra por tela mesmo sem gate de seção', () => {
      const nav = filterNavigation(navigationByModule['cargos-salarios'], ctxGranular(['cs_cargos']));
      expect(byId(nav)).toEqual(['cs-cargos']);
    });
  });
});
