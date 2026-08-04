import { describe, it, expect } from 'vitest';
import { computeRewardsPreview, computeBasePreview, type RewardsPreviewInputs } from './rewardsPreview';
import { calcularComissao } from '@/domain/premiacao/calculoPremiacao';
import type { Funcionario } from '@/hooks/useFuncionarios';
import type { FormulaCalculo } from '@/hooks/useFormulasCalculo';
import type { BasePremiacao } from '@/hooks/useBasePremiacao';

const base = (over: Partial<BasePremiacao>): BasePremiacao =>
  ({ id: 'b1', nome: 'KIT 100%', valor_base: 0, tipo: 'kits', ativo: true, created_at: '', updated_at: '', ...over });

const func = (over: Partial<Funcionario>): Funcionario =>
  ({ id: 'f1', nome: 'João', ativo: true, created_at: '', updated_at: '', base_premiacao_id: 'b1', categoria_id: 'c-aux',
     categoria: { nome: 'Auxiliar' }, faixa: { nome: 'Faixa 100%', valor: 1000 }, ...over });

const formula = (over: Partial<FormulaCalculo>): FormulaCalculo =>
  ({ id: 'fx1', nome: 'AUXILIAR - KIT 100%', categoria_id: 'c-aux', base_premiacao_id: 'b1',
     peso_producao_setor: null, peso_epi: 25, peso_faltas: 25, peso_advertencias: 25, peso_dss: 25,
     peso_faturamento: null, peso_itens_nc: null, peso_tratamento_nc: null, peso_hora_maquina: null,
     peso_operacao_segura: null, peso_limpeza: null, multiplicador_kits: null, ativo: true, created_at: '', updated_at: '', ...over });

const emptyInputs = (over: Partial<RewardsPreviewInputs>): RewardsPreviewInputs => ({
  funcionarios: [], formulas: [], bases: [], setores: [], faltasAdvertencias: [], epiRecords: [],
  dssRecords: [], producaoSetor: [], indicadoresSetor: [], indicadoresGerais: [],
  getConfigKits: () => null, getConfigBonusPercentual: () => null, ...over,
});

// Regra percentual real: meta 11.000 kits (R$ 100 na meta) e cada 1.000 kits acima
// valem R$ 100, proporcionalmente. Vigente a partir de junho/2026.
const REGRA_PCT = { metaKits: 11000, bonusMeta: 100, blocoKits: 1000, valorBloco: 100, percentualMaximo: null };
const getPctDeJunho = (competencia: string) => (competencia >= '2026-06' ? REGRA_PCT : null);

describe('computeRewardsPreview — pureza e escopo', () => {
  it('não persiste: é pura e retorna resultados em memória para o escopo', () => {
    const inputs = emptyInputs({
      funcionarios: [func({})], formulas: [formula({})], bases: [base({})],
      indicadoresGerais: [{ competencia: '2026-05-01', realizado: 12000, tipo_indicador: { codigo: 'KITS' } }],
    });
    const preview = computeRewardsPreview({ competencia: '2026-05', baseIds: ['b1'], categoriaIds: [] }, inputs);
    expect(preview.bases).toHaveLength(1);
    expect(preview.bases[0].employees).toHaveLength(1);
    expect(preview.totals.funcionariosCalculados).toBe(1);
  });

  it('KITS: comissão e bônus batem com o motor (regras preservadas)', () => {
    const inputs = emptyInputs({
      funcionarios: [func({})], formulas: [formula({})], bases: [base({})],
      indicadoresGerais: [{ competencia: '2026-05-01', realizado: 12000, tipo_indicador: { codigo: 'KITS' } }],
    });
    const [bp] = computeRewardsPreview({ competencia: '2026-05', baseIds: ['b1'], categoriaIds: [] }, inputs).bases;
    const e = bp.employees[0];
    // Sem faltas/adv/epi/dss → todas as notas 1.0; pesos somam 1.0 → nota geral 1.0.
    expect(e.nota_geral).toBeCloseTo(1.0, 5);
    // Comissão via motor: min 10000, +250/faixa, base 100, 25/faixa → 12000 => 300.
    const comissaoEsperada = calcularComissao(12000, { minimo_kits: 10000, incremento_faixa: 250, bonus_base: 100, bonus_por_faixa: 25 });
    expect(e.valor_kits).toBe(comissaoEsperada);
    expect(e.valor_kits).toBe(300);
    // Multiplicador do nome "KIT 100%" = 1.0 → bônus alcançado = comissão.
    expect(e.bonus_alcancado).toBeCloseTo(300, 5);
    expect(e.trace.length).toBeGreaterThan(0); // memória de cálculo observacional
  });

  it('filtro de categoria restringe os funcionários calculados', () => {
    const inputs = emptyInputs({
      funcionarios: [func({ id: 'f1', categoria_id: 'c-aux' }), func({ id: 'f2', categoria_id: 'c-sup', categoria: { nome: 'Supervisor' } })],
      formulas: [formula({})], bases: [base({})],
      indicadoresGerais: [{ competencia: '2026-05-01', realizado: 12000, tipo_indicador: { codigo: 'KITS' } }],
    });
    const bp = computeBasePreview('b1', { competencia: '2026-05', baseIds: ['b1'], categoriaIds: ['c-aux'] }, inputs);
    expect(bp.employees.map(e => e.id)).toEqual(['f1']);
  });

  it('base sem funcionários é sinalizada (skippedReason), sem lançar', () => {
    const bp = computeBasePreview('b1', { competencia: '2026-05', baseIds: ['b1'], categoriaIds: [] }, emptyInputs({ bases: [base({})] }));
    expect(bp.employees).toHaveLength(0);
    expect(bp.skippedReason).toBeTruthy();
  });

  it('funcionário sem fórmula recebe flag (sem quebrar o cálculo)', () => {
    const inputs = emptyInputs({ funcionarios: [func({})], formulas: [], bases: [base({})] });
    const bp = computeBasePreview('b1', { competencia: '2026-05', baseIds: ['b1'], categoriaIds: [] }, inputs);
    expect(bp.employees[0].flags).toContain('Fórmula não encontrada para a categoria/base');
  });
});

// A virada de modelo é definida pela VIGÊNCIA cadastrada, não por data fixa no código.
describe('seleção do modelo de kits (faixas × percentual)', () => {
  const inputsPara = (competencia: string, kits: number) => emptyInputs({
    funcionarios: [func({})], formulas: [formula({})], bases: [base({})],
    indicadoresGerais: [{ competencia: `${competencia}-01`, realizado: kits, tipo_indicador: { codigo: 'KITS' } }],
    getConfigKits: () => ({
      id: 'k1', vigencia_inicio: '2000-01', minimo_kits: 11000, incremento_faixa: 1000,
      bonus_base: 100, bonus_por_faixa: 100, ativo: true, created_at: '', updated_at: '',
    }),
    getConfigBonusPercentual: getPctDeJunho,
  });

  it('maio/2026 (antes da vigência) → faixas: bloco incompleto não paga', () => {
    const bp = computeBasePreview('b1', { competencia: '2026-05', baseIds: ['b1'], categoriaIds: [] }, inputsPara('2026-05', 11500));
    expect(bp.employees[0].valor_kits).toBe(100);
    expect(bp.employees[0].trace.find(t => t.key === 'kits_modelo')?.entrada).toBe('Faixas (degrau)');
  });

  it('junho/2026 (a partir da vigência) → percentual: 500 kits acima da meta pagam 50%', () => {
    const bp = computeBasePreview('b1', { competencia: '2026-06', baseIds: ['b1'], categoriaIds: [] }, inputsPara('2026-06', 11500));
    expect(bp.employees[0].valor_kits).toBe(150);
    expect(bp.employees[0].trace.find(t => t.key === 'kits_percentual')?.entrada).toContain('50,0%');
  });

  it('junho/2026 com 13.500 kits → 250% e R$ 350 (exemplo do RH)', () => {
    const bp = computeBasePreview('b1', { competencia: '2026-06', baseIds: ['b1'], categoriaIds: [] }, inputsPara('2026-06', 13500));
    const e = bp.employees[0];
    expect(e.valor_kits).toBe(350);
    expect(e.bonus_alcancado).toBeCloseTo(350, 5); // nota geral 1.0 e multiplicador 100%
    expect(e.trace.find(t => t.key === 'kits_percentual')?.entrada).toContain('250,0%');
  });

  it('abaixo da meta em junho → nada, nem o bônus da meta', () => {
    const bp = computeBasePreview('b1', { competencia: '2026-06', baseIds: ['b1'], categoriaIds: [] }, inputsPara('2026-06', 10999));
    expect(bp.employees[0].valor_kits).toBe(0);
    expect(bp.employees[0].trace.find(t => t.key === 'kits_percentual')?.entrada).toContain('Meta não atingida');
  });

  it('o multiplicador do nome da base continua se aplicando sobre o total percentual', () => {
    const inputs = { ...inputsPara('2026-06', 13500), bases: [base({ nome: 'KIT 50%' })] };
    const bp = computeBasePreview('b1', { competencia: '2026-06', baseIds: ['b1'], categoriaIds: [] }, inputs);
    expect(bp.employees[0].valor_kits).toBe(350);      // comissão registrada é a cheia
    expect(bp.employees[0].bonus_alcancado).toBeCloseTo(175, 5); // 350 × 0,5
  });

  it('base que não é de kits ignora a regra percentual', () => {
    const inputs = { ...inputsPara('2026-06', 13500), bases: [base({ nome: 'PRODUCAO' })] };
    const bp = computeBasePreview('b1', { competencia: '2026-06', baseIds: ['b1'], categoriaIds: [] }, inputs);
    expect(bp.employees[0].valor_kits).toBeUndefined();
  });
});
