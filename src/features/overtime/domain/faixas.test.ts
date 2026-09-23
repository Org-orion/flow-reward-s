import { describe, it, expect } from 'vitest';
import {
  classificarFaixa, ehOcorrenciaAcimaDoLimite, limitesValidos, LIMITES_PADRAO,
} from './faixas';

describe('semáforo das horas extras', () => {
  it('usa os limites padrão da política (2h e 2h30)', () => {
    expect(LIMITES_PADRAO).toEqual({ verdeMaxMin: 120, amareloMaxMin: 150 });
  });

  it('classifica cada faixa pelas bordas', () => {
    expect(classificarFaixa(1)).toBe('verde');
    expect(classificarFaixa(120)).toBe('verde');        // 02:00 ainda é verde
    expect(classificarFaixa(121)).toBe('amarelo');      // 02:01 já é amarelo
    expect(classificarFaixa(150)).toBe('amarelo');      // 02:30 ainda é amarelo
    expect(classificarFaixa(151)).toBe('vermelho');     // 02:31 é vermelho
    expect(classificarFaixa(192)).toBe('vermelho');     // 03:12, o maior do dia real
  });

  // Zero não é "verde": verde significa extra dentro do limite. Misturar os dois
  // inflaria a contagem de quem fez hora extra em centenas de lançamentos.
  it('zero, negativo e valor inválido caem em sem_extra', () => {
    expect(classificarFaixa(0)).toBe('sem_extra');
    expect(classificarFaixa(-10)).toBe('sem_extra');
    expect(classificarFaixa(Number.NaN)).toBe('sem_extra');
  });

  it('respeita limites personalizados pelo administrador', () => {
    const l = { verdeMaxMin: 60, amareloMaxMin: 90 };
    expect(classificarFaixa(60, l)).toBe('verde');
    expect(classificarFaixa(61, l)).toBe('amarelo');
    expect(classificarFaixa(91, l)).toBe('vermelho');
  });

  it('ocorrência acima do limite é amarelo ou vermelho', () => {
    expect(ehOcorrenciaAcimaDoLimite('amarelo')).toBe(true);
    expect(ehOcorrenciaAcimaDoLimite('vermelho')).toBe(true);
    expect(ehOcorrenciaAcimaDoLimite('verde')).toBe(false);
    expect(ehOcorrenciaAcimaDoLimite('sem_extra')).toBe(false);
  });

  it('recusa limites incoerentes (verde precisa caber no amarelo)', () => {
    expect(limitesValidos({ verdeMaxMin: 120, amareloMaxMin: 150 })).toBe(true);
    expect(limitesValidos({ verdeMaxMin: 150, amareloMaxMin: 120 })).toBe(false);
    expect(limitesValidos({ verdeMaxMin: 0, amareloMaxMin: 150 })).toBe(false);
    expect(limitesValidos({ verdeMaxMin: 1.5, amareloMaxMin: 150 })).toBe(false);
  });
});
