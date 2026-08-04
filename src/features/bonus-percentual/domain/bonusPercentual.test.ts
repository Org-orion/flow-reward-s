import { describe, it, expect } from 'vitest';
import { calcularComissao } from '@/domain/premiacao/calculoPremiacao';
import { computeBonusPercentual, kitsExemplo } from './bonusPercentualCalculo';
import { validateBonusPercentual } from './bonusPercentualValidation';
import { canEditBonusPercentual, canDeleteBonusPercentual, bonusPercentualProtectionReason } from './bonusPercentualProtecao';
import { diffBonusPercentualParams } from './bonusPercentualComparacao';
import { buildEscalaPercentual, ESCALA_MULTIPLOS } from './bonusPercentualEscala';

// Regra real informada pelo RH: meta 11.000 kits (R$ 100 ao bater),
// e a cada 1.000 kits acima da meta, R$ 100 — proporcional.
const REGRA = { metaKits: 11000, bonusMeta: 100, blocoKits: 1000, valorBloco: 100, percentualMaximo: null };

describe('computeBonusPercentual — percentual é a grandeza primária', () => {
  it('abaixo da meta → 0% e nenhum bônus (nem o da meta)', () => {
    const b = computeBonusPercentual(10999, REGRA);
    expect(b.atingiuMeta).toBe(false);
    expect(b.excedente).toBe(0);
    expect(b.percentual).toBe(0);
    expect(b.bonusMetaAplicado).toBe(0);
    expect(b.bonusTotal).toBe(0);
  });

  it('exatamente na meta → 0% de adicional, só o bônus da meta', () => {
    const b = computeBonusPercentual(11000, REGRA);
    expect(b.atingiuMeta).toBe(true);
    expect(b.percentual).toBe(0);
    expect(b.adicional).toBe(0);
    expect(b.bonusTotal).toBe(100);
  });

  it('1 bloco completo → 100% → R$ 100 de adicional', () => {
    const b = computeBonusPercentual(12000, REGRA);
    expect(b.percentual).toBe(100);
    expect(b.adicional).toBe(100);
    expect(b.bonusTotal).toBe(200);
  });

  it('bloco parcial conta proporcionalmente (não há degrau)', () => {
    const meio = computeBonusPercentual(11500, REGRA);
    expect(meio.percentual).toBe(50);
    expect(meio.adicional).toBe(50);
    expect(meio.bonusTotal).toBe(150);

    const quaseCheio = computeBonusPercentual(11999, REGRA);
    expect(quaseCheio.percentual).toBeCloseTo(99.9, 10);
    expect(quaseCheio.adicional).toBeCloseTo(99.9, 10);
  });

  it('exemplo do RH: 13.500 kits → 250% → R$ 250 de adicional (total R$ 350)', () => {
    const b = computeBonusPercentual(13500, REGRA);
    expect(b.excedente).toBe(2500);
    expect(b.percentual).toBe(250);
    expect(b.adicional).toBe(250);
    expect(b.bonusTotal).toBe(350);
    // blocosCompletos é informativo e NÃO governa o valor
    expect(b.blocosCompletos).toBe(2);
  });

  it('sem teto → percentual cresce sem limite', () => {
    const b = computeBonusPercentual(11000 + 1000 * 100, REGRA);
    expect(b.percentual).toBe(10000);
    expect(b.bonusTotal).toBe(100 + 10000);
  });

  it('percentual máximo é APLICADO como teto', () => {
    const cfg = { ...REGRA, percentualMaximo: 300 };
    const dentro = computeBonusPercentual(13500, cfg);
    expect(dentro.tetoAplicado).toBe(false);
    expect(dentro.percentualAplicado).toBe(250);

    const acima = computeBonusPercentual(20000, cfg);
    expect(acima.percentual).toBe(900);
    expect(acima.tetoAplicado).toBe(true);
    expect(acima.percentualAplicado).toBe(300);
    expect(acima.adicional).toBe(300);
    expect(acima.bonusTotal).toBe(400);
  });

  it('bloco zero não divide por zero', () => {
    const b = computeBonusPercentual(13500, { ...REGRA, blocoKits: 0 });
    expect(b.percentual).toBe(0);
    expect(b.adicional).toBe(0);
    expect(b.bonusTotal).toBe(100);
  });

  it('kits negativo ou inválido é tratado como zero', () => {
    expect(computeBonusPercentual(-5, REGRA).bonusTotal).toBe(0);
    expect(computeBonusPercentual(Number.NaN, REGRA).bonusTotal).toBe(0);
  });

  it('exemplo padrão usa bloco fracionado (250%) para evidenciar a proporcionalidade', () => {
    const kits = kitsExemplo(REGRA);
    expect(kits).toBe(13500);
    expect(computeBonusPercentual(kits, REGRA).percentual).toBe(250);
  });
});

describe('diferença em relação ao motor de faixas (degrau)', () => {
  const faixas = { minimo_kits: 11000, incremento_faixa: 1000, bonus_base: 100, bonus_por_faixa: 100 };
  it('500 kits acima da meta: faixas paga só a base; percentual paga 50%', () => {
    expect(calcularComissao(11500, faixas)).toBe(100);
    expect(computeBonusPercentual(11500, REGRA).bonusTotal).toBe(150);
  });
  it('em blocos exatos os dois modelos coincidem', () => {
    expect(calcularComissao(14000, faixas)).toBe(400);
    expect(computeBonusPercentual(14000, REGRA).bonusTotal).toBe(400);
  });
});

describe('validateBonusPercentual', () => {
  const base = { vigenciaInicio: '2026-08', metaKits: 11000, bonusMeta: 100, blocoKits: 1000, valorBloco: 100, percentualMaximo: null };
  it('válida e sem avisos', () => {
    const v = validateBonusPercentual(base);
    expect(v.valid).toBe(true);
    expect(v.warnings).toHaveLength(0);
  });
  it('vigência inválida', () => expect(validateBonusPercentual({ ...base, vigenciaInicio: '2026-13' }).valid).toBe(false));
  it('meta e bloco devem ser > 0', () => {
    expect(validateBonusPercentual({ ...base, metaKits: 0 }).valid).toBe(false);
    expect(validateBonusPercentual({ ...base, blocoKits: 0 }).valid).toBe(false);
  });
  it('valores não podem ser negativos', () => {
    expect(validateBonusPercentual({ ...base, valorBloco: -1 }).valid).toBe(false);
    expect(validateBonusPercentual({ ...base, bonusMeta: -1 }).valid).toBe(false);
  });
  it('percentual máximo: null ok; > 0 ok com aviso; 0 inválido', () => {
    expect(validateBonusPercentual({ ...base, percentualMaximo: 300 }).valid).toBe(true);
    expect(validateBonusPercentual({ ...base, percentualMaximo: 300 }).warnings.length).toBeGreaterThan(0);
    expect(validateBonusPercentual({ ...base, percentualMaximo: 0 }).valid).toBe(false);
  });
  it('bloco maior que a meta gera aviso', () => {
    expect(validateBonusPercentual({ ...base, blocoKits: 20000 }).warnings.length).toBeGreaterThan(0);
  });
  it('valor por bloco zero gera aviso (percentual sem efeito em R$)', () => {
    expect(validateBonusPercentual({ ...base, valorBloco: 0 }).valid).toBe(true);
    expect(validateBonusPercentual({ ...base, valorBloco: 0 }).warnings.length).toBeGreaterThan(0);
  });
});

// A regra remunera: vale o mesmo padrão das Configurações Kits.
describe('proteção por estado e utilização', () => {
  const usado = { competencias: 2, resultados: 77, utilizada: true };
  const naoUsado = { competencias: 0, resultados: 0, utilizada: false };

  it('programada e não utilizada → editável/excluível', () => {
    expect(canEditBonusPercentual('programada', naoUsado)).toBe(true);
    expect(canDeleteBonusPercentual('programada', naoUsado)).toBe(true);
    expect(bonusPercentualProtectionReason('programada', naoUsado)).toBeNull();
  });
  it('já utilizada em processamentos → protegida', () => {
    expect(canEditBonusPercentual('programada', usado)).toBe(false);
    expect(bonusPercentualProtectionReason('programada', usado)).toContain('nova vigência');
  });
  it('vigente → protegida (altera valores futuros)', () => {
    expect(canEditBonusPercentual('atual', naoUsado)).toBe(false);
    expect(bonusPercentualProtectionReason('atual', naoUsado)).toContain('vigente');
  });
  it('histórica → protegida', () => {
    expect(canEditBonusPercentual('historica', naoUsado)).toBe(false);
    expect(bonusPercentualProtectionReason('historica', naoUsado)).toContain('nova vigência');
  });
});

describe('buildEscalaPercentual', () => {
  it('cada múltiplo de bloco vira um ponto kits → percentual → valor', () => {
    const escala = buildEscalaPercentual(REGRA);
    expect(escala).toHaveLength(ESCALA_MULTIPLOS.length);
    expect(escala.map(p => p.kits)).toEqual([11000, 11500, 12000, 13500, 16000, 21000]);
    expect(escala.map(p => p.breakdown.percentualAplicado)).toEqual([0, 50, 100, 250, 500, 1000]);
    expect(escala.map(p => p.breakdown.bonusTotal)).toEqual([100, 150, 200, 350, 600, 1100]);
  });
  it('respeita o teto quando configurado', () => {
    const escala = buildEscalaPercentual({ ...REGRA, percentualMaximo: 300 });
    expect(escala.map(p => p.breakdown.percentualAplicado)).toEqual([0, 50, 100, 250, 300, 300]);
    expect(escala.filter(p => p.breakdown.tetoAplicado)).toHaveLength(2);
  });
});

describe('diffBonusPercentualParams', () => {
  const a = { metaKits: 11000, bonusMeta: 100, blocoKits: 1000, valorBloco: 100, percentualMaximo: null };
  const b = { metaKits: 12000, bonusMeta: 100, blocoKits: 1000, valorBloco: 150, percentualMaximo: 500 };
  it('delta absoluto e percentual dos parâmetros', () => {
    const diff = diffBonusPercentualParams(a, b);
    expect(diff.find(d => d.key === 'metaKits')).toMatchObject({ a: 11000, b: 12000, deltaAbs: 1000, deltaPct: 9.1, changed: true });
    expect(diff.find(d => d.key === 'blocoKits')!.changed).toBe(false);
    expect(diff.find(d => d.key === 'valorBloco')!.deltaAbs).toBe(50);
    expect(diff.find(d => d.key === 'percentualMaximo')).toMatchObject({ a: null, b: 500, deltaAbs: null, changed: true });
  });
});
