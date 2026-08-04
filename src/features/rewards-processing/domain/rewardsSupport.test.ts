import { describe, it, expect } from 'vitest';
import { competenciaToMes, mesToCompetencia, competenciaShortLabelBR, buildProcessingRows, findExistingProcessing } from './rewardsProcessingScope';
import { buildValidation } from './rewardsValidation';
import { compareBasePreview } from './rewardsComparison';
import { buildIssues, summarizeIssues } from './rewardsIssues';
import { computeBasePreview, type RewardsPreviewInputs } from './rewardsPreview';
import type { ResultadoPremiacao } from '@/hooks/useResultadosPremiacao';
import type { BasePremiacao } from '@/hooks/useBasePremiacao';
import type { Funcionario } from '@/hooks/useFuncionarios';

const bases: BasePremiacao[] = [{ id: 'b1', nome: 'KIT 100%', valor_base: 0, tipo: 'kits', ativo: true, created_at: '', updated_at: '' }];
const mkRes = (over: Partial<ResultadoPremiacao>): ResultadoPremiacao =>
  ({ id: over.id || 'r1', mes_competencia: '2026-05-01', base_premiacao_id: 'b1', funcionario_id: 'f1', nome: 'João',
     nota_epi: 1, nota_faltas: 1, nota_advertencias: 1, nota_dss: 1, nota_geral: 1, bonus_possivel: 100, bonus_alcancado: 100,
     categoria: 'Auxiliar', created_at: '2026-06-01T12:00:00Z', updated_at: '2026-06-01T12:00:00Z', ...over });

const emptyInputs = (over: Partial<RewardsPreviewInputs & { categorias: { id: string; nome: string }[] }>) => ({
  funcionarios: [], formulas: [], bases, setores: [], faltasAdvertencias: [], epiRecords: [],
  dssRecords: [], producaoSetor: [], indicadoresSetor: [], indicadoresGerais: [], getConfigKits: () => null,
  getConfigBonusPercentual: () => null,
  categorias: [], ...over,
});

describe('escopo / competência', () => {
  it('YYYY-MM ↔ YYYY-MM-01 e rótulo curto', () => {
    expect(competenciaToMes('2026-05')).toBe('2026-05-01');
    expect(mesToCompetencia('2026-05-01')).toBe('2026-05');
    expect(competenciaShortLabelBR('2026-05')).toBe('mai/2026');
  });
});

describe('buildProcessingRows — integridade e agrupamento', () => {
  it('agrupa por mês+base; marca incompleto quando falta base/funcionário', () => {
    const rows = buildProcessingRows([
      mkRes({ id: 'a' }), mkRes({ id: 'b', funcionario_id: 'f2', nome: 'Ana' }),
      mkRes({ id: 'c', base_premiacao_id: undefined, funcionario_id: undefined, nome: '' }),
    ], bases);
    const ok = rows.find(r => r.baseId === 'b1')!;
    expect(ok.resultados).toBe(2);
    expect(ok.funcionariosUnicos).toBe(2);
    expect(ok.integridade).toBe('ok');
    const bad = rows.find(r => r.baseNome === 'Sem base')!;
    expect(bad.integridade).toBe('incompleto');
    expect(bad.problemas.length).toBeGreaterThan(0);
  });

  it('findExistingProcessing resume o processamento salvo', () => {
    const ex = findExistingProcessing([mkRes({}), mkRes({ id: 'b', funcionario_id: 'f2' })], bases, '2026-05', 'b1');
    expect(ex?.resultados).toBe(2);
    expect(ex?.valorTotal).toBe(200);
    expect(ex?.categorias).toEqual(['Auxiliar']);
  });
});

describe('buildValidation — bloqueios e atenções', () => {
  it('sem base/competência → bloqueios; canProceed=false', () => {
    const v = buildValidation({ competencia: '', baseIds: [], categoriaIds: [] }, emptyInputs({}));
    expect(v.bloqueios).toBeGreaterThanOrEqual(2);
    expect(v.canProceed).toBe(false);
  });

  it('sem funcionário elegível → bloqueio', () => {
    const v = buildValidation({ competencia: '2026-05', baseIds: ['b1'], categoriaIds: [] }, emptyInputs({}));
    expect(v.groups.flatMap(g => g.items).some(i => i.code === 'func_zero')).toBe(true);
    expect(v.canProceed).toBe(false);
  });

  it('KITS sem indicador de kits → atenção (não bloqueia)', () => {
    const funcionarios: Funcionario[] = [{ id: 'f1', nome: 'João', ativo: true, created_at: '', updated_at: '', base_premiacao_id: 'b1', categoria_id: 'c', faixa_id: 'fa', setor_id: 's1', categoria: { nome: 'Auxiliar' } }];
    const v = buildValidation({ competencia: '2026-05', baseIds: ['b1'], categoriaIds: [] }, emptyInputs({ funcionarios }));
    expect(v.groups.flatMap(g => g.items).some(i => i.code === 'sem_kits' && i.severity === 'atencao')).toBe(true);
    expect(v.canProceed).toBe(true);
  });
});

describe('compareBasePreview', () => {
  it('compara bônus anterior x novo por funcionário', () => {
    const inputs = emptyInputs({
      funcionarios: [{ id: 'f1', nome: 'João', ativo: true, created_at: '', updated_at: '', base_premiacao_id: 'b1', categoria_id: 'c', categoria: { nome: 'Auxiliar' }, faixa: { nome: 'F', valor: 1000 } }],
      formulas: [{ id: 'fx', nome: 'x', categoria_id: 'c', base_premiacao_id: 'b1', peso_producao_setor: null, peso_epi: 100, peso_faltas: null, peso_advertencias: null, peso_dss: null, peso_faturamento: null, peso_itens_nc: null, peso_tratamento_nc: null, peso_hora_maquina: null, peso_operacao_segura: null, peso_limpeza: null, multiplicador_kits: null, ativo: true, created_at: '', updated_at: '' }],
      indicadoresGerais: [{ competencia: '2026-05-01', realizado: 12000, tipo_indicador: { codigo: 'KITS' } }],
    });
    const preview = computeBasePreview('b1', { competencia: '2026-05', baseIds: ['b1'], categoriaIds: [] }, inputs);
    const cmp = compareBasePreview(preview, [mkRes({ bonus_alcancado: 100 })], '2026-05');
    expect(cmp.valorAnterior).toBe(100);
    expect(cmp.rows.find(r => r.funcionarioId === 'f1')?.valorAnterior).toBe(100);
    expect(cmp.diferenca).toBe(cmp.valorNovo - 100);
  });
});

describe('buildIssues', () => {
  it('detecta funcionário sem base e resume', () => {
    const funcionarios: Funcionario[] = [
      { id: 'f1', nome: 'A', ativo: true, created_at: '', updated_at: '', categoria_id: 'c', faixa_id: 'fa', setor_id: 's1' }, // sem base
    ];
    const issues = buildIssues({ funcionarios, bases, formulas: [], resultados: [] });
    expect(issues.some(i => i.code === 'func_sem_base' && i.severity === 'bloqueio')).toBe(true);
    expect(summarizeIssues(issues).bloqueios).toBeGreaterThanOrEqual(1);
  });
});
