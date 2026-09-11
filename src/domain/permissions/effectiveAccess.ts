// Motor PURO de acesso efetivo. Sem React, sem Supabase — só regras.
// Espelhado no AuthContext (que apenas o consome) e testado em
// effectiveAccess.test.ts.
//
// COMPATIBILIDADE (regra central da implantação incremental):
//   Usuário LEGADO  = sem configuração granular (`grants === null`).
//                     Comporta-se EXATAMENTE como hoje: seção libera tudo.
//   Usuário GRANULAR = tem perfil de acesso e/ou exceções.
//                     Nas seções que já possuem recursos granulares declarados
//                     (GRANULAR_SECTIONS), as concessões MANDAM e as `secoes`
//                     são ignoradas. Nas outras seções, continua valendo `secoes`
//                     — é isso que permite migrar módulo a módulo sem regressão.

import {
  GRANULAR_SECTIONS, actionGrant, fieldGrant, resourceDef, resourcesOfSection,
  type FieldAction, type PermissionAction,
} from '@/config/permissions';

/** Configuração granular persistida (perfil de acesso + exceções do usuário). */
export interface GranularConfig {
  /** Concessões herdadas do perfil de acesso. null/undefined = sem perfil. */
  perfilPermissoes?: string[] | null;
  /** Concessões extras deste usuário (somam ao perfil). */
  mais?: string[] | null;
  /** Concessões retiradas deste usuário. VENCEM sobre o perfil e sobre `mais`. */
  menos?: string[] | null;
}

/** A configuração existe? (vazia mas presente já conta: é "granular com nada".) */
export function hasGranularConfig(c: GranularConfig | null | undefined): boolean {
  if (!c) return false;
  return c.perfilPermissoes != null || c.mais != null || c.menos != null;
}

/** Conjunto efetivo = (perfil ∪ mais) \ menos. */
export function resolveGrants(c: GranularConfig | null | undefined): Set<string> {
  const out = new Set<string>();
  for (const g of c?.perfilPermissoes ?? []) out.add(g);
  for (const g of c?.mais ?? []) out.add(g);
  for (const g of c?.menos ?? []) out.delete(g);
  return out;
}

/** Estado de acesso de um usuário, já resolvido. */
export interface AccessState {
  perfil: string;                 // 'admin' = acesso total (ignora o resto)
  secoes: string[];
  /** null = usuário legado (sem configuração granular). */
  grants: Set<string> | null;
}

export function buildAccessState(
  perfil: string,
  secoes: string[] | null | undefined,
  config: GranularConfig | null | undefined,
): AccessState {
  return {
    perfil,
    secoes: Array.isArray(secoes) ? secoes : [],
    grants: hasGranularConfig(config) ? resolveGrants(config) : null,
  };
}

const isAdmin = (a: AccessState) => a.perfil === 'admin';
const isGranularSection = (section: string) => GRANULAR_SECTIONS.includes(section);

/**
 * Acesso à SEÇÃO (mesma semântica do antigo canAccess). Para seções já
 * granulares, ter a seção não basta: é preciso poder VER algum recurso dela.
 */
export function accessCanSection(a: AccessState, section: string): boolean {
  if (isAdmin(a)) return true;
  if (a.grants && isGranularSection(section)) {
    return resourcesOfSection(section).some(r => a.grants!.has(actionGrant(r.key, 'ver')));
  }
  return a.secoes.includes(section);
}

/** Pode executar a ação no recurso? Recurso desconhecido → nega (fail-closed). */
export function accessCan(a: AccessState, resource: string, action: PermissionAction): boolean {
  if (isAdmin(a)) return true;
  const def = resourceDef(resource);
  if (!def) return false;
  if (!a.grants) return a.secoes.includes(def.section);   // legado: seção libera tudo
  return a.grants.has(actionGrant(resource, action));
}

/**
 * Pode ver/editar o CAMPO? Campo não declarado no registro não é controlado —
 * segue a ação equivalente do recurso.
 */
export function accessCanField(a: AccessState, resource: string, field: string, action: FieldAction): boolean {
  if (isAdmin(a)) return true;
  const def = resourceDef(resource);
  if (!def) return false;
  if (!a.grants) return a.secoes.includes(def.section);   // legado: seção libera tudo
  const controlado = def.fields?.some(f => f.key === field && f.actions.includes(action));
  if (!controlado) return a.grants.has(actionGrant(resource, action as PermissionAction));
  // Campo controlado exige a ação no recurso E a concessão do campo.
  return a.grants.has(actionGrant(resource, action as PermissionAction))
    && a.grants.has(fieldGrant(resource, field, action));
}

/** O usuário consegue editar ALGUM campo do recurso? (habilita a barra de salvar.) */
export function accessCanEditAnyField(a: AccessState, resource: string): boolean {
  if (isAdmin(a)) return true;
  const def = resourceDef(resource);
  if (!def) return false;
  if (!def.fields?.length) return accessCan(a, resource, 'editar');
  return def.fields.some(f => f.actions.includes('editar') && accessCanField(a, resource, f.key, 'editar'));
}
