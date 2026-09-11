import { describe, it, expect } from 'vitest';
import { ALL_SECTIONS } from '@/contexts/AuthContext';
import {
  PERMISSION_RESOURCES, GRANULAR_SECTIONS, ACTION_LABEL, resourceDef, resourcesOfSection,
  actionGrant, fieldGrant, parseGrant, isKnownGrant, allGrantsOfResource, allKnownGrants, grantLabel,
  sectionsFromGrants,
} from './permissions';
import { navigationByModule } from './sidebarNavigation';

/** Integridade do registro — barato de rodar, evita registro inconsistente. */
describe('registro de permissões', () => {
  it('não tem chave repetida', () => {
    const keys = PERMISSION_RESOURCES.map(r => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('chaves não usam ponto (o ponto separa a concessão)', () => {
    for (const r of PERMISSION_RESOURCES) {
      expect(r.key).not.toContain('.');
      for (const f of r.fields ?? []) expect(f.key).not.toContain('.');
    }
  });

  it('todo recurso pode ser visto (Ver é a base das demais ações)', () => {
    for (const r of PERMISSION_RESOURCES) expect(r.actions).toContain('ver');
  });

  it('nenhum recurso repete ação e todas têm rótulo', () => {
    for (const r of PERMISSION_RESOURCES) {
      expect(new Set(r.actions).size).toBe(r.actions.length);
      for (const a of r.actions) expect(ACTION_LABEL[a]).toBeTruthy();
    }
  });

  it('recurso com campo controlado permite editar ou já é somente leitura coerente', () => {
    for (const r of PERMISSION_RESOURCES) {
      const campos = r.fields ?? [];
      if (campos.some(f => f.actions.includes('editar'))) {
        // Editar campo exige a ação de escrita do recurso (regra do motor).
        expect(r.actions.some(a => a === 'editar')).toBe(true);
      }
      for (const f of campos) {
        expect(f.actions.length).toBeGreaterThan(0);
        expect(new Set(f.actions).size).toBe(f.actions.length);
      }
    }
  });

  it('toda seção usada existe no domínio de auth', () => {
    for (const r of PERMISSION_RESOURCES) {
      expect(ALL_SECTIONS).toContain(r.section as never);
    }
    for (const s of GRANULAR_SECTIONS) expect(ALL_SECTIONS).toContain(s as never);
  });

  it('resourceDef e resourcesOfSection são coerentes com a lista', () => {
    for (const r of PERMISSION_RESOURCES) expect(resourceDef(r.key)).toBe(r);
    expect(resourceDef('nao_existe')).toBeUndefined();
    const producao = resourcesOfSection('producao').map(r => r.key);
    expect(producao).toEqual(['producao_setor', 'producao_historico', 'indicadores_setor', 'indicadores_gerais']);
  });

  it('a ordem de exibição não repete dentro do mesmo grupo', () => {
    const porGrupo = new Map<string, number[]>();
    for (const r of PERMISSION_RESOURCES) {
      const k = `${r.module}|${r.group}`;
      porGrupo.set(k, [...(porGrupo.get(k) ?? []), r.order]);
    }
    for (const [grupo, ordens] of porGrupo) {
      expect(new Set(ordens).size, `ordem repetida em ${grupo}`).toBe(ordens.length);
    }
  });
});

describe('concessões', () => {
  it('ida e volta de ação e de campo', () => {
    expect(parseGrant(actionGrant('producao_setor', 'editar')))
      .toEqual({ kind: 'acao', resource: 'producao_setor', action: 'editar' });
    expect(parseGrant(fieldGrant('producao_setor', 'meta', 'ver')))
      .toEqual({ kind: 'campo', resource: 'producao_setor', field: 'meta', action: 'ver' });
  });

  it('formato inválido é reconhecido como tal', () => {
    expect(parseGrant('lixo').kind).toBe('invalida');
    expect(parseGrant('a.b.c').kind).toBe('invalida');            // 3 partes não é formato válido
    expect(parseGrant('a.naocampo.b.c').kind).toBe('invalida');   // marcador `campo` obrigatório
  });

  it('isKnownGrant aceita só o que existe no registro', () => {
    expect(isKnownGrant('producao_setor.editar')).toBe(true);
    expect(isKnownGrant('producao_setor.campo.meta.editar')).toBe(true);
    expect(isKnownGrant('producao_setor.processar')).toBe(false);          // ação não declarada
    expect(isKnownGrant('producao_historico.campo.meta.ver')).toBe(false); // campo não declarado
    expect(isKnownGrant('nao_existe.ver')).toBe(false);
    expect(isKnownGrant('lixo')).toBe(false);
  });

  it('todas as concessões do registro são válidas e sem repetição', () => {
    const todas = allKnownGrants();
    expect(new Set(todas).size).toBe(todas.length);
    for (const g of todas) expect(isKnownGrant(g)).toBe(true);
  });

  it('allGrantsOfResource cobre ações e campos', () => {
    const def = resourceDef('producao_setor')!;
    const g = allGrantsOfResource(def);
    expect(g).toContain('producao_setor.ver');
    expect(g).toContain('producao_setor.campo.realizado.editar');
    expect(g.length).toBe(def.actions.length + (def.fields ?? []).reduce((s, f) => s + f.actions.length, 0));
  });

  it('grantLabel é legível e não vaza a chave crua', () => {
    expect(grantLabel('producao_setor.editar')).toBe('Produção por Setor — Editar');
    expect(grantLabel('producao_setor.campo.meta.editar')).toBe('Produção por Setor — Editar campo "Meta"');
    expect(grantLabel('lixo')).toBe('lixo'); // desconhecida: devolve o valor original
  });
});

// O banco autoriza por SEÇÃO (policies `has_secao`), não por tela. Se as seções
// implicadas pelas concessões não forem persistidas, a tela abre e a gravação é
// recusada pelo servidor — foi o bug real do "Cannot coerce the result to a
// single JSON object" ao editar funcionário.
describe('sectionsFromGrants — ponte entre a árvore e o RLS', () => {
  it('deriva a seção de cada recurso concedido', () => {
    expect(sectionsFromGrants(['funcionarios.editar'])).toEqual(['rh']);
    expect(sectionsFromGrants(['producao_setor.ver', 'producao_historico.ver'])).toEqual(['producao']);
  });

  it('junta seções distintas sem repetir', () => {
    expect(sectionsFromGrants([
      'funcionarios.ver', 'dss.criar', 'cad_setores.editar', 'funcionarios.editar',
    ])).toEqual(['cadastros', 'rh', 'sesmt']);
  });

  it('funciona com concessões de CAMPO', () => {
    expect(sectionsFromGrants(['producao_setor.campo.meta.ver'])).toEqual(['producao']);
  });

  it('ignora concessão malformada ou de recurso inexistente', () => {
    expect(sectionsFromGrants(['lixo', 'nao_existe.ver', 'a.b.c'])).toEqual([]);
  });

  it('conjunto vazio não implica seção alguma', () => {
    expect(sectionsFromGrants([])).toEqual([]);
  });

  it('toda seção derivada existe no registro', () => {
    const todas = sectionsFromGrants(allKnownGrants());
    expect(todas).toEqual([...GRANULAR_SECTIONS].sort());
  });
});

describe('registro x navegação da sidebar', () => {
  /** Todo `resource` citado na sidebar precisa existir — senão o item desaparece
   *  para todo usuário granular sem ninguém perceber. */
  it('todo resource da sidebar existe no registro', () => {
    const percorrer = (itens: { resource?: string; children?: unknown[] }[]): string[] =>
      itens.flatMap(i => [
        ...(i.resource ? [i.resource] : []),
        ...percorrer((i.children ?? []) as { resource?: string; children?: unknown[] }[]),
      ]);
    const usados = Object.values(navigationByModule).flatMap(m => percorrer(m));
    expect(usados.length).toBeGreaterThan(30);
    for (const r of usados) expect(resourceDef(r), `resource desconhecido: ${r}`).toBeDefined();
  });
});
