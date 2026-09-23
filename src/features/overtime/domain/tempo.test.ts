import { describe, it, expect } from 'vitest';
import { parseHoraMin, parseHoraMinOuZero, formatMin, ehHorarioDeRelogio, somaMin } from './tempo';

describe('tempo em minutos inteiros', () => {
  it('lê hh:mm comum', () => {
    expect(parseHoraMin('02:30')).toBe(150);
    expect(parseHoraMin('00:00')).toBe(0);
    expect(parseHoraMin('06:16')).toBe(376);
  });

  // As linhas de TOTAL do Secullum passam de 24h; limitar a 23 quebraria a
  // conciliação logo na primeira fábrica grande.
  it('aceita horas acima de 24 (linhas de total)', () => {
    expect(parseHoraMin('1426:28')).toBe(1426 * 60 + 28);
    expect(parseHoraMin('504:43')).toBe(504 * 60 + 43);
  });

  it('recusa o que não é hora', () => {
    expect(parseHoraMin('FALTA')).toBeNull();
    expect(parseHoraMin('')).toBeNull();
    expect(parseHoraMin(null)).toBeNull();
    expect(parseHoraMin('2:70')).toBeNull();     // minuto inválido
    expect(parseHoraMin('12:5')).toBeNull();     // minuto com 1 dígito
  });

  it('vazio vira zero apenas onde isso é a regra do campo', () => {
    expect(parseHoraMinOuZero('')).toBe(0);
    expect(parseHoraMinOuZero('01:05')).toBe(65);
  });

  it('formata sem teto de 24h e sem perder o zero à esquerda', () => {
    expect(formatMin(150)).toBe('02:30');
    expect(formatMin(0)).toBe('00:00');
    expect(formatMin(1426 * 60 + 28)).toBe('1426:28');
    expect(formatMin(-65)).toBe('-01:05');
  });

  it('ida e volta preserva o valor', () => {
    for (const s of ['00:00', '02:30', '08:48', '265:50', '3800:18']) {
      expect(formatMin(parseHoraMin(s)!)).toBe(s);
    }
  });

  it('distingue batida de relógio de total acumulado', () => {
    expect(ehHorarioDeRelogio('23:59')).toBe(true);
    expect(ehHorarioDeRelogio('24:00')).toBe(false);
    expect(ehHorarioDeRelogio('265:50')).toBe(false);
  });

  it('soma de lista vazia é zero, não NaN', () => {
    expect(somaMin([])).toBe(0);
    expect(somaMin([60, 30, 1])).toBe(91);
  });
});
