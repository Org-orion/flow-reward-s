import { describe, it, expect } from 'vitest';
import { buildProductionFieldAccess, productionColumnCount } from './productionFieldAccess';

const q = (ver: string[], editar: string[]) => ({
  podeVerCampo: (f: string) => ver.includes(f),
  podeEditarCampo: (f: string) => editar.includes(f),
});

describe('buildProductionFieldAccess', () => {
  it('acesso total: tudo visível e editável, 7 colunas', () => {
    const a = buildProductionFieldAccess(q(['meta', 'realizado'], ['meta', 'realizado']));
    expect(a).toEqual({
      verMeta: true, editarMeta: true, verRealizado: true, editarRealizado: true,
      verDerivados: true, podeEditarAlgum: true,
    });
    expect(productionColumnCount(a)).toBe(7);
  });

  it('caso do print: vê as duas, edita só o realizado', () => {
    const a = buildProductionFieldAccess(q(['meta', 'realizado'], ['realizado']));
    expect(a.editarMeta).toBe(false);
    expect(a.editarRealizado).toBe(true);
    expect(a.verDerivados).toBe(true);
    expect(a.podeEditarAlgum).toBe(true);
    expect(productionColumnCount(a)).toBe(7);
  });

  it('não edita campo que não vê', () => {
    const a = buildProductionFieldAccess(q(['realizado'], ['meta', 'realizado']));
    expect(a.editarMeta).toBe(false);
    expect(a.editarRealizado).toBe(true);
  });

  it('esconde as derivadas quando falta uma das colunas (evita vazar o valor)', () => {
    const a = buildProductionFieldAccess(q(['realizado'], ['realizado']));
    expect(a.verDerivados).toBe(false);
    expect(productionColumnCount(a)).toBe(4); // Setor, Realizado, Situação, Ações
  });

  it('somente leitura total', () => {
    const a = buildProductionFieldAccess(q(['meta', 'realizado'], []));
    expect(a.podeEditarAlgum).toBe(false);
  });

  it('sem nenhum campo: só as colunas fixas', () => {
    const a = buildProductionFieldAccess(q([], []));
    expect(a.podeEditarAlgum).toBe(false);
    expect(productionColumnCount(a)).toBe(3);
  });
});
