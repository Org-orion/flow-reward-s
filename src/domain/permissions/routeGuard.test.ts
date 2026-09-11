import { describe, it, expect } from 'vitest';
import { decidirAcessoRota, type RouteGuardInput } from './routeGuard';

const base = (over: Partial<RouteGuardInput> = {}): RouteGuardInput => ({
  loading: false,
  autenticado: true,
  perfil: 'producao',
  isGranular: false,
  canAccess: () => true,
  can: () => true,
  ...over,
});

describe('estados básicos', () => {
  it('carregando vem antes de tudo', () => {
    expect(decidirAcessoRota(base({ loading: true, autenticado: false })).kind).toBe('carregando');
  });
  it('sem perfil vai para o login', () => {
    expect(decidirAcessoRota(base({ autenticado: false })).kind).toBe('login');
  });
  it('nada a restringir libera', () => {
    expect(decidirAcessoRota(base()).kind).toBe('liberado');
  });
});

describe('gate por perfil (legado)', () => {
  it('redireciona quem não está na lista', () => {
    const d = decidirAcessoRota(base({ allowedPerfis: ['admin', 'rh'] }));
    expect(d.kind).toBe('redirecionar');
  });
  it('libera quem está na lista', () => {
    expect(decidirAcessoRota(base({ allowedPerfis: ['admin', 'rh', 'producao'] })).kind).toBe('liberado');
  });
  it('usuário LEGADO continua barrado pelo perfil mesmo com resource na rota', () => {
    const d = decidirAcessoRota(base({ allowedPerfis: ['admin', 'rh'], resource: 'funcionarios', isGranular: false }));
    expect(d.kind).toBe('redirecionar');
  });
});

describe('o gate por perfil cede ao granular — mas só com resource na rota', () => {
  // Foi o bug real: perfil `producao` recebeu `funcionarios.ver`, mas a rota
  // tinha allowedPerfis=['admin','rh'] e redirecionava antes de olhar a permissão.
  it('granular COM resource entra mesmo fora de allowedPerfis', () => {
    const d = decidirAcessoRota(base({
      allowedPerfis: ['admin', 'rh'], resource: 'funcionarios', isGranular: true,
      can: (r) => r === 'funcionarios',
    }));
    expect(d.kind).toBe('liberado');
  });

  it('granular COM resource sem a concessão é NEGADO (não redirecionado)', () => {
    const d = decidirAcessoRota(base({
      allowedPerfis: ['admin', 'rh'], resource: 'funcionarios', isGranular: true,
      can: () => false,
    }));
    expect(d).toEqual({ kind: 'negado', motivo: 'recurso' });
  });

  // A trava de segurança: rota SEM resource não cede nunca.
  it('granular SEM resource continua barrado pelo perfil (Hub, Usuários e Acessos)', () => {
    const d = decidirAcessoRota(base({ allowedPerfis: ['admin'], isGranular: true }));
    expect(d.kind).toBe('redirecionar');
  });

  it('nenhum usuário granular entra em Usuários e Acessos por falta de regra', () => {
    for (const perfil of ['rh', 'sesmt', 'producao', 'custom']) {
      const d = decidirAcessoRota(base({ perfil, allowedPerfis: ['admin'], isGranular: true }));
      expect(d.kind, `perfil ${perfil}`).toBe('redirecionar');
    }
    // admin passa por estar na lista
    expect(decidirAcessoRota(base({ perfil: 'admin', allowedPerfis: ['admin'], isGranular: true })).kind)
      .toBe('liberado');
  });
});

describe('gate por seção', () => {
  it('nega quando a seção não é acessível', () => {
    const d = decidirAcessoRota(base({ section: 'estoque', canAccess: () => false }));
    expect(d).toEqual({ kind: 'negado', motivo: 'secao' });
  });
  it('a seção é avaliada ANTES do recurso', () => {
    const d = decidirAcessoRota(base({
      section: 'estoque', resource: 'est_entradas', isGranular: true,
      canAccess: () => false, can: () => false,
    }));
    expect(d).toEqual({ kind: 'negado', motivo: 'secao' });
  });
});

describe('gate por recurso', () => {
  it('não morde usuário legado', () => {
    const d = decidirAcessoRota(base({ resource: 'funcionarios', isGranular: false, can: () => false }));
    expect(d.kind).toBe('liberado');
  });
  it('morde usuário granular sem a concessão', () => {
    const d = decidirAcessoRota(base({ resource: 'funcionarios', isGranular: true, can: () => false }));
    expect(d).toEqual({ kind: 'negado', motivo: 'recurso' });
  });
});
