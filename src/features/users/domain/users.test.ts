import { describe, it, expect } from 'vitest';
import { isKnownSection, sectionLabel, perfilLabel, CREATABLE_PERFIS, KNOWN_SECTIONS } from './permissionDefinitions';
import { deriveUserAccess, userCanAccess, accessSummary } from './userAccess';
import { deriveAuthState } from './userAuthState';
import { normalizeEmail, isValidEmail, isValidNome, emailEmUso } from './userValidation';
import { countActiveAdmins, isLastActiveAdmin, canDeactivate, canActivate, canChangePerfil } from './userSecurityRules';
import { matchesUserFilters, computeUsersContext, countActiveUserFilters } from './userFilters';
import { DEFAULT_USER_FILTERS, type UserRow } from '../types/user.types';

// ---------- permissões / seções ----------
describe('permissionDefinitions', () => {
  it('seções reconhecidas = ALL_SECTIONS (inclui cargos_salarios / "Cargos")', () => {
    expect(KNOWN_SECTIONS).toContain('cargos_salarios');
    expect(isKnownSection('cargos_salarios')).toBe(true);
    expect(isKnownSection('secao_fantasma')).toBe(false);
    expect(sectionLabel('cargos_salarios')).toBe('Cargos e Salários');
    expect(sectionLabel('secao_fantasma')).toBe('secao_fantasma');
  });
  it('perfis criáveis = enum do banco (sem custom)', () => {
    expect(CREATABLE_PERFIS).toEqual(['admin', 'rh', 'sesmt', 'producao']);
    expect(perfilLabel('admin')).toBe('Administrador');
    expect(perfilLabel('custom')).toBe('Personalizado');
  });
});

// ---------- acesso ----------
describe('deriveUserAccess', () => {
  it('admin = acesso total (ignora secoes)', () => {
    const a = deriveUserAccess('admin', []);
    expect(a.kind).toBe('total');
    expect(accessSummary(a)).toBe('Acesso total');
    expect(userCanAccess('admin', [], 'premiacoes')).toBe(true);
  });
  it('não-admin com seções = personalizado; sem seções = sem acesso', () => {
    expect(deriveUserAccess('rh', ['rh', 'dashboard']).kind).toBe('personalizado');
    expect(deriveUserAccess('rh', []).kind).toBe('sem_acesso');
    expect(userCanAccess('rh', ['rh'], 'rh')).toBe(true);
    expect(userCanAccess('rh', ['rh'], 'premiacoes')).toBe(false);
  });
  it('sinaliza seções desconhecidas sem removê-las', () => {
    const a = deriveUserAccess('rh', ['rh', 'modulo_x']);
    expect(a.conhecidas).toEqual(['rh']);
    expect(a.desconhecidas).toEqual(['modulo_x']);
    expect(a.secoes).toContain('modulo_x'); // preservada
  });
  it('resumo com principais + restante', () => {
    expect(accessSummary(deriveUserAccess('rh', ['rh', 'dashboard', 'sesmt', 'producao']))).toBe('RH, Dashboard +2');
  });
});

// ---------- estado de autenticação ----------
describe('deriveAuthState', () => {
  it('supabase: vinculado vs migração pendente', () => {
    expect(deriveAuthState('uid-1', 'supabase').kind).toBe('supabase');
    expect(deriveAuthState(null, 'supabase').kind).toBe('migracao_pendente');
  });
  it('custom: legado', () => {
    expect(deriveAuthState('uid-1', 'custom').kind).toBe('legado');
    expect(deriveAuthState(null, 'custom').kind).toBe('legado');
  });
});

// ---------- validação ----------
describe('userValidation', () => {
  it('email normaliza e valida', () => {
    expect(normalizeEmail('  KAIO@Concrem.COM ')).toBe('kaio@concrem.com');
    expect(isValidEmail('kaio@concrem.com')).toBe(true);
    expect(isValidEmail('kaio@')).toBe(false);
    expect(isValidNome('  ')).toBe(false);
  });
  it('duplicidade case-insensitive, ignora o próprio', () => {
    const us = [{ id: 'a', email: 'Kaio@concrem.com' }];
    expect(emailEmUso('kaio@concrem.com', us)).toBe(true);
    expect(emailEmUso('kaio@concrem.com', us, 'a')).toBe(false);
    expect(emailEmUso('novo@concrem.com', us)).toBe(false);
  });
});

// ---------- regras de segurança ----------
describe('userSecurityRules', () => {
  const admins2 = [
    { id: 'a1', perfil: 'admin', ativo: true },
    { id: 'a2', perfil: 'admin', ativo: true },
    { id: 'r1', perfil: 'rh', ativo: true },
  ];
  const admin1 = [
    { id: 'a1', perfil: 'admin', ativo: true },
    { id: 'a2', perfil: 'admin', ativo: false }, // inativo não conta
    { id: 'r1', perfil: 'rh', ativo: true },
  ];
  it('conta admins ativos e detecta último', () => {
    expect(countActiveAdmins(admins2)).toBe(2);
    expect(countActiveAdmins(admin1)).toBe(1);
    expect(isLastActiveAdmin({ id: 'a1', perfil: 'admin', ativo: true }, admin1)).toBe(true);
    expect(isLastActiveAdmin({ id: 'a1', perfil: 'admin', ativo: true }, admins2)).toBe(false);
  });
  it('desativação: bloqueia autodesativação e último admin', () => {
    expect(canDeactivate(admins2[0], admins2, 'a1').allowed).toBe(false); // self
    expect(canDeactivate(admins2[0], admins2, 'a2').allowed).toBe(true);  // outro admin, há 2
    expect(canDeactivate(admin1[0], admin1, 'outro').allowed).toBe(false); // último admin
    expect(canActivate({ id: 'x', perfil: 'rh', ativo: false }).allowed).toBe(true);
  });
  it('mudança de perfil: bloqueia autorrebaixamento e rebaixar último admin', () => {
    expect(canChangePerfil(admins2[0], 'rh', admins2, 'a1').allowed).toBe(false); // self demote
    expect(canChangePerfil(admins2[0], 'rh', admins2, 'a2').allowed).toBe(true);  // outro, há 2 admins
    expect(canChangePerfil(admin1[0], 'rh', admin1, 'outro').allowed).toBe(false); // último admin
    expect(canChangePerfil(admins2[2], 'admin', admins2, 'outro').allowed).toBe(true); // promover é ok
  });
});

// ---------- filtros / contexto ----------
describe('filtros e contexto', () => {
  const mkRow = (over: Partial<UserRow> & { id: string; perfil: string; ativo: boolean }): UserRow => ({
    nome: 'Fulano', email: 'f@c.com', secoes: [], createdAt: null,
    access: deriveUserAccess(over.perfil, over.secoes ?? []),
    authState: deriveAuthState(null, 'custom'), isSelf: false, isLastActiveAdmin: false,
    perfilAcessoId: null, excecoes: { mais: [], menos: [] }, granular: false,
    ...over,
  });
  const admin = mkRow({ id: 'a1', nome: 'Kaio Melo', email: 'kaio@concrem.com', perfil: 'admin', ativo: true, secoes: [] });
  const rh = mkRow({ id: 'r1', nome: 'RH Concrem', email: 'rh@concrem.com', perfil: 'rh', ativo: true, secoes: ['rh', 'dashboard'] });
  const inativo = mkRow({ id: 'x', nome: 'Antigo', email: 'x@c.com', perfil: 'sesmt', ativo: false, secoes: ['modulo_x'] });
  const rows = [admin, rh, inativo];

  it('busca por nome/email/perfil/seção', () => {
    expect(matchesUserFilters(admin, { ...DEFAULT_USER_FILTERS, search: 'kaio' })).toBe(true);
    expect(matchesUserFilters(rh, { ...DEFAULT_USER_FILTERS, search: 'dashboard' })).toBe(true);
    expect(matchesUserFilters(admin, { ...DEFAULT_USER_FILTERS, search: 'administrador' })).toBe(true);
  });
  it('filtros de perfil/status/acesso', () => {
    expect(matchesUserFilters(admin, { ...DEFAULT_USER_FILTERS, perfil: 'admin' })).toBe(true);
    expect(matchesUserFilters(rh, { ...DEFAULT_USER_FILTERS, status: 'inativo' })).toBe(false);
    expect(matchesUserFilters(admin, { ...DEFAULT_USER_FILTERS, acesso: 'total' })).toBe(true);
    expect(matchesUserFilters(inativo, { ...DEFAULT_USER_FILTERS, acesso: 'desconhecida' })).toBe(true);
    expect(countActiveUserFilters({ ...DEFAULT_USER_FILTERS, perfil: 'admin', status: 'ativo' })).toBe(2);
  });
  it('contexto: total/ativos/admins/só-um-admin/desconhecidas', () => {
    const c = computeUsersContext(rows);
    expect(c).toMatchObject({ total: 3, ativos: 2, inativos: 1, administradoresAtivos: 1, soUmAdmin: true, comPermissaoDesconhecida: 1 });
  });
});
