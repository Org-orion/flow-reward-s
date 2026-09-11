// Regras de MARCAÇÃO da interface de permissões — PURAS.
//
// Existem dependências que não fazem sentido violar, e é melhor a interface
// impedir o estado incoerente do que o motor tratá-lo depois:
//   • Nenhuma ação sem 'ver'      → marcar uma ação marca 'ver'.
//   • Desmarcar 'ver' zera o recurso (não se opera uma tela que não abre).
//   • Marcar 'editar' libera, por padrão, VER e EDITAR todos os campos
//     controlados — o administrador desmarca o que quer travar (é assim que se
//     chega em "vê a meta mas só altera o realizado").
//   • Desmarcar 'editar' trava a edição de todos os campos (a leitura fica).
//   • Um campo editável exige o próprio campo visível.
//   • Desmarcar a visão de um campo também desmarca a edição dele.

import {
  actionGrant, fieldGrant, resourceDef, parseGrant, allGrantsOfResource,
  type PermissionResourceDef,
} from '@/config/permissions';

const fieldsWith = (def: PermissionResourceDef, action: 'ver' | 'editar') =>
  (def.fields ?? []).filter(f => f.actions.includes(action));

/** Aplica uma marcação/desmarcação, propagando as dependências. */
export function toggleGrant(effective: Iterable<string>, grant: string, next: boolean): Set<string> {
  const out = new Set(effective);
  const parsed = parseGrant(grant);
  if (parsed.kind === 'invalida') return out;

  const def = resourceDef(parsed.resource);
  if (!def) return out;

  if (parsed.kind === 'acao') {
    if (next) {
      out.add(grant);
      out.add(actionGrant(def.key, 'ver'));
      if (parsed.action === 'editar') {
        for (const f of fieldsWith(def, 'ver')) out.add(fieldGrant(def.key, f.key, 'ver'));
        for (const f of fieldsWith(def, 'editar')) out.add(fieldGrant(def.key, f.key, 'editar'));
      }
      return out;
    }
    // Desmarcando
    if (parsed.action === 'ver') {
      for (const g of allGrantsOfResource(def)) out.delete(g);
      return out;
    }
    out.delete(grant);
    if (parsed.action === 'editar') {
      for (const f of fieldsWith(def, 'editar')) out.delete(fieldGrant(def.key, f.key, 'editar'));
    }
    return out;
  }

  // Campo
  if (next) {
    out.add(grant);
    out.add(actionGrant(def.key, 'ver'));
    if (parsed.action === 'editar') {
      out.add(fieldGrant(def.key, parsed.field, 'ver'));
      out.add(actionGrant(def.key, 'editar'));
    }
    return out;
  }
  out.delete(grant);
  if (parsed.action === 'ver') out.delete(fieldGrant(def.key, parsed.field, 'editar'));
  return out;
}

/** Marca/desmarca o recurso INTEIRO (atalho de linha na interface). */
export function toggleResource(effective: Iterable<string>, resource: string, next: boolean): Set<string> {
  const out = new Set(effective);
  const def = resourceDef(resource);
  if (!def) return out;
  for (const g of allGrantsOfResource(def)) {
    if (next) out.add(g); else out.delete(g);
  }
  return out;
}

/** Diferença contra o herdado do perfil → exceções a persistir. */
export function diffExcecoes(inherited: Iterable<string>, effective: Iterable<string>): { mais: string[]; menos: string[] } {
  const base = new Set(inherited);
  const eff = new Set(effective);
  const mais = [...eff].filter(g => !base.has(g)).sort();
  const menos = [...base].filter(g => !eff.has(g)).sort();
  return { mais, menos };
}
