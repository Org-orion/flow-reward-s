import { describe, it, expect } from 'vitest';
import {
  MES_ANO_MIN, MES_ANO_MAX, isMesRefValido, mesRefRange, anosDisponiveis, mesRefAtual,
} from './movementPeriod';

describe('isMesRefValido', () => {
  it('aceita competências dentro da faixa ofertada', () => {
    expect(isMesRefValido('2025-01')).toBe(true);
    expect(isMesRefValido('2030-12')).toBe(true);
    expect(isMesRefValido('2026-09')).toBe(true);
  });

  it('recusa fora da faixa', () => {
    expect(isMesRefValido('2024-12')).toBe(false);
    expect(isMesRefValido('2031-01')).toBe(false);
  });

  it('recusa mês inexistente e formato errado', () => {
    expect(isMesRefValido('2026-00')).toBe(false);
    expect(isMesRefValido('2026-13')).toBe(false);
    expect(isMesRefValido('2026-1')).toBe(false);   // sem zero à esquerda
    expect(isMesRefValido('09-2026')).toBe(false);
    expect(isMesRefValido('')).toBe(false);
    expect(isMesRefValido('lixo')).toBe(false);
  });
});

describe('mesRefRange', () => {
  it('cobre o mês inteiro com fim EXCLUSIVO', () => {
    const r = mesRefRange('2026-09')!;
    expect(r.inicio).toEqual(new Date(2026, 8, 1));
    expect(r.fim).toEqual(new Date(2026, 9, 1));
  });

  it('vira o ano corretamente em dezembro', () => {
    const r = mesRefRange('2026-12')!;
    expect(r.inicio).toEqual(new Date(2026, 11, 1));
    expect(r.fim).toEqual(new Date(2027, 0, 1));
  });

  it('trata fevereiro de ano bissexto sem perder o dia 29', () => {
    const r = mesRefRange('2028-02')!;
    // 29/02/2028 23:59 tem de cair DENTRO da faixa.
    const ultimoInstante = new Date(2028, 1, 29, 23, 59, 59);
    expect(ultimoInstante.getTime()).toBeGreaterThanOrEqual(r.inicio.getTime());
    expect(ultimoInstante.getTime()).toBeLessThan(r.fim.getTime());
  });

  it('o primeiro instante do mês seguinte fica FORA', () => {
    const r = mesRefRange('2026-09')!;
    expect(new Date(2026, 9, 1).getTime()).toBeGreaterThanOrEqual(r.fim.getTime());
  });

  it('competência inválida devolve null (sem intervalo inventado)', () => {
    expect(mesRefRange('2024-05')).toBeNull();
    expect(mesRefRange('lixo')).toBeNull();
    expect(mesRefRange('')).toBeNull();
  });
});

describe('anosDisponiveis', () => {
  it('vai de 2030 a 2025, do mais recente para o mais antigo', () => {
    expect(anosDisponiveis()).toEqual([2030, 2029, 2028, 2027, 2026, 2025]);
  });

  it('todo ano ofertado produz competências válidas', () => {
    for (const ano of anosDisponiveis()) {
      expect(isMesRefValido(`${ano}-01`)).toBe(true);
      expect(isMesRefValido(`${ano}-12`)).toBe(true);
    }
  });
});

describe('mesRefAtual', () => {
  it('usa o mês corrente quando dentro da faixa', () => {
    expect(mesRefAtual(new Date(2026, 8, 17))).toBe('2026-09');
    expect(mesRefAtual(new Date(2025, 0, 1))).toBe('2025-01');
  });

  it('limita aos extremos da faixa', () => {
    expect(mesRefAtual(new Date(2024, 5, 10))).toBe(`${MES_ANO_MIN}-06`);
    expect(mesRefAtual(new Date(2033, 2, 3))).toBe(`${MES_ANO_MAX}-03`);
  });

  it('sempre devolve competência válida', () => {
    for (const d of [new Date(2020, 0, 1), new Date(2026, 11, 31), new Date(2040, 6, 15)]) {
      expect(isMesRefValido(mesRefAtual(d))).toBe(true);
    }
  });
});
