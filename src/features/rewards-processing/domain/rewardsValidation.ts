// Validação (preflight) do processamento — regras PURAS e centralizadas.
// Valida apenas fontes que o motor realmente usa. Classifica em pronto/atenção/
// bloqueio. NÃO recalcula prêmios; apenas verifica pré-condições e cobertura.
import { isProducaoBase, isKitsBase } from '@/domain/premiacao/calculoPremiacao';
import type { RewardsPreviewInputs, RewardsPreviewParams } from './rewardsPreview';
import type { ValidationGroup, ValidationItem, ValidationResult } from '../types/rewards-processing.types';

interface ValidationInputs extends RewardsPreviewInputs {
  categorias: { id: string; nome: string }[];
}

function monthRange(competencia: string) {
  const [ano, mes] = competencia.split('-');
  const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate();
  return { inicio: `${ano}-${mes}-01`, fim: `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`, comp: `${ano}-${mes}-01` };
}

/** Constrói o resultado de validação para o escopo selecionado. */
export function buildValidation(params: RewardsPreviewParams, inputs: ValidationInputs): ValidationResult {
  const { competencia, baseIds, categoriaIds } = params;
  const { funcionarios, bases, formulas, setores, dssRecords, epiRecords, producaoSetor, indicadoresSetor, indicadoresGerais, getConfigKits, getConfigBonusPercentual } = inputs;

  const basesSel = bases.filter(b => baseIds.includes(b.id));
  const anyProducao = basesSel.some(b => isProducaoBase(b.nome));
  const anyKits = basesSel.some(b => isKitsBase(b.nome));

  const elegiveis = funcionarios.filter(f =>
    f.ativo && baseIds.includes(f.base_premiacao_id || '') &&
    (categoriaIds.length === 0 || categoriaIds.includes(f.categoria_id || '')));

  const supervisores = elegiveis.filter(f => ['SUPERVISOR', 'ENCARREGADO'].includes((f.categoria?.nome || '').toUpperCase()));

  // ── PARÂMETROS ──────────────────────────────────────────────────────────
  const parametros: ValidationItem[] = [];
  parametros.push(competencia
    ? { code: 'comp_ok', severity: 'pronto', title: 'Competência definida', description: 'Competência selecionada para o processamento.', origin: 'Parâmetros' }
    : { code: 'comp_missing', severity: 'bloqueio', title: 'Competência não definida', description: 'Selecione a competência para processar.', origin: 'Parâmetros' });
  parametros.push(baseIds.length > 0
    ? { code: 'base_ok', severity: 'pronto', title: `${baseIds.length} base(s) selecionada(s)`, description: basesSel.map(b => b.nome).join(', '), origin: 'Parâmetros' }
    : { code: 'base_missing', severity: 'bloqueio', title: 'Base não selecionada', description: 'Selecione ao menos uma base de premiação.', origin: 'Parâmetros' });
  parametros.push({ code: 'cat', severity: 'pronto', title: categoriaIds.length === 0 ? 'Todas as categorias' : `${categoriaIds.length} categoria(s)`, description: 'Categorias que filtram os funcionários processados.', origin: 'Parâmetros' });

  // ── CONFIGURAÇÃO ────────────────────────────────────────────────────────
  const configuracao: ValidationItem[] = [];
  const basesInexistentes = baseIds.filter(id => !bases.some(b => b.id === id));
  if (basesInexistentes.length > 0) {
    configuracao.push({ code: 'base_inexistente', severity: 'bloqueio', title: 'Base inexistente ou inativa', description: 'Uma base selecionada não foi encontrada entre as bases ativas.', affectedCount: basesInexistentes.length, origin: 'Bases de premiação', action: { label: 'Ver bases', to: '/premiacoes/cadastros/base-premiacao' } });
  }
  // Fórmula por funcionário elegível (o motor tem fallback, mas ausência afeta a nota).
  const semFormula = elegiveis.filter(f => !formulas.some(fx => fx.categoria_id === f.categoria_id && baseIds.includes(fx.base_premiacao_id || '')));
  if (elegiveis.length > 0 && semFormula.length > 0) {
    configuracao.push({ code: 'sem_formula', severity: 'atencao', title: 'Fórmula ausente para parte dos funcionários', description: 'Funcionários sem fórmula específica para a categoria/base podem receber nota reduzida ou zero conforme a regra do motor.', affectedCount: semFormula.length, origin: 'Fórmulas de cálculo', impact: 'Nota geral pode ser 0 para os afetados', action: { label: 'Ver fórmulas', to: '/premiacoes/cadastros/formulas-calculo' } });
  } else if (elegiveis.length > 0) {
    configuracao.push({ code: 'formula_ok', severity: 'pronto', title: 'Fórmulas encontradas', description: 'Há fórmula aplicável para os funcionários elegíveis.', origin: 'Fórmulas de cálculo' });
  }
  if (anyKits) {
    // Qual modelo remunera esta competência: percentual (proporcional) vence quando
    // há configuração vigente; senão, faixas (degrau).
    const cfgPercentual = getConfigBonusPercentual(competencia);
    if (cfgPercentual) {
      configuracao.push({
        code: 'kits_modelo_percentual', severity: 'pronto',
        title: 'Kits remunerados pelo bônus percentual',
        description: `Meta de ${cfgPercentual.metaKits} kits, blocos de ${cfgPercentual.blocoKits} kits (100%) e cálculo proporcional. O modelo de faixas não é usado nesta competência.`,
        origin: 'Bônus percentual por kits',
        action: { label: 'Ver regra', to: '/premiacoes/cadastros/bonus-percentual' },
      });
    } else {
      const cfg = getConfigKits(competencia);
      configuracao.push(cfg
        ? { code: 'kits_cfg_ok', severity: 'pronto', title: 'Configuração de kits vigente', description: 'Há configuração de kits para a competência.', origin: 'Configurações de kits' }
        : { code: 'kits_cfg_fallback', severity: 'atencao', title: 'Configuração de kits ausente', description: 'Sem configuração vigente para a competência; o cálculo usará os parâmetros padrão (fallback).', origin: 'Configurações de kits', impact: 'Comissão de kits calculada com parâmetros padrão', action: { label: 'Ver configurações', to: '/premiacoes/cadastros/configuracoes-kits' } });
    }
  }

  // ── FUNCIONÁRIOS ────────────────────────────────────────────────────────
  const funcs: ValidationItem[] = [];
  if (baseIds.length > 0 && competencia) {
    funcs.push(elegiveis.length > 0
      ? { code: 'func_ok', severity: 'pronto', title: `${elegiveis.length} funcionário(s) elegível(is)`, description: 'Funcionários ativos na base (e categoria) selecionada.', origin: 'Funcionários' }
      : { code: 'func_zero', severity: 'bloqueio', title: 'Nenhum funcionário elegível', description: 'Não há funcionários ativos para a base e categoria selecionadas.', origin: 'Funcionários', action: { label: 'Ver funcionários', to: '/premiacoes/funcionarios' } });

    const semSetor = elegiveis.filter(f => !f.setor_id && !(f.setor_ids && f.setor_ids.length)).length;
    const semCategoria = elegiveis.filter(f => !f.categoria_id).length;
    const semFaixa = elegiveis.filter(f => !f.faixa_id).length;
    if (semCategoria > 0) funcs.push({ code: 'sem_categoria', severity: 'atencao', title: 'Funcionários sem categoria', description: 'Sem categoria, a fórmula pode não ser localizada.', affectedCount: semCategoria, origin: 'Funcionários', action: { label: 'Ver funcionários', to: '/premiacoes/funcionarios' } });
    if (semFaixa > 0) funcs.push({ code: 'sem_faixa', severity: 'atencao', title: 'Funcionários sem faixa', description: 'Sem faixa, o valor-base da premiação é zero.', affectedCount: semFaixa, origin: 'Funcionários', impact: 'Valor de faixa = R$ 0,00', action: { label: 'Ver funcionários', to: '/premiacoes/funcionarios' } });
    if (anyProducao && semSetor > 0) funcs.push({ code: 'sem_setor', severity: 'atencao', title: 'Funcionários sem setor', description: 'Em bases de produção, sem setor não há nota de produção.', affectedCount: semSetor, origin: 'Funcionários', action: { label: 'Ver funcionários', to: '/premiacoes/funcionarios' } });
  }

  // ── DADOS DA COMPETÊNCIA (só fontes que o motor usa) ──────────────────────
  const dados: ValidationItem[] = [];
  if (elegiveis.length > 0 && competencia) {
    const { inicio, fim, comp } = monthRange(competencia);

    // Setores dos elegíveis (para produção/indicadores/DSS por setor).
    const setorIds = new Set<string>();
    for (const f of elegiveis) {
      if (f.setor_id) setorIds.add(f.setor_id);
      (f.setor_ids || []).forEach(id => setorIds.add(id));
    }
    for (const f of supervisores) {
      setores.filter(s => s.supervisor_id === f.id || s.encarregado_id === f.id).forEach(s => setorIds.add(s.id));
    }

    if (anyProducao && setorIds.size > 0) {
      const semProducao = [...setorIds].filter(sid => !producaoSetor.some(p => p.setor_id === sid && (p.data_producao ?? '') >= inicio && (p.data_producao ?? '') <= fim));
      if (semProducao.length > 0) dados.push({ code: 'sem_producao', severity: 'atencao', title: 'Produção incompleta', description: 'Setores sem registro de produção na competência recebem nota de produção zero.', affectedCount: semProducao.length, impact: `${semProducao.length} setor(es) afetado(s)`, origin: 'Produção por Setor', action: { label: 'Ver produção', to: '/premiacoes/producao-setor' } });
    }

    if (supervisores.length > 0 && anyProducao && setorIds.size > 0) {
      const semIndicador = [...setorIds].filter(sid => !indicadoresSetor.some(i => (i.setor_id as string) === sid && i.competencia === comp));
      if (semIndicador.length > 0) dados.push({ code: 'sem_indicador_setor', severity: 'atencao', title: 'Indicadores por setor ausentes', description: 'Sem indicadores do setor na competência, a média usada assume 100% (neutro).', affectedCount: semIndicador.length, origin: 'Indicadores por Setor', action: { label: 'Ver indicadores', to: '/premiacoes/indicadores-setor' } });
      const temFat = indicadoresGerais.some(i => i.tipo_indicador?.codigo === 'FAT' && i.competencia === comp);
      if (!temFat) dados.push({ code: 'sem_fat', severity: 'atencao', title: 'Faturamento não informado', description: 'Sem indicador de faturamento na competência, a nota de faturamento é zero para supervisores/encarregados.', origin: 'Indicadores Gerais', action: { label: 'Ver indicadores gerais', to: `/premiacoes/indicadores-gerais?competencia=${competencia}` } });
    }

    if (anyKits) {
      const temKits = indicadoresGerais.some(i => i.tipo_indicador?.codigo === 'KITS' && i.competencia === comp);
      if (!temKits) dados.push({ code: 'sem_kits', severity: 'atencao', title: 'Quantidade de kits não informada', description: 'Sem o indicador de kits na competência, a comissão de kits será calculada sobre realizado zero.', impact: 'Comissão de kits = R$ 0,00', origin: 'Indicadores Gerais', action: { label: 'Ver indicadores gerais', to: `/premiacoes/indicadores-gerais?competencia=${competencia}` } });
    }

    // Cobertura de DSS (não bloqueia — ausência vira nota 1.0).
    const locais = new Set(elegiveis.map(f => f.local_dss_id).filter(Boolean) as string[]);
    if (locais.size > 0) {
      const semDss = [...locais].filter(l => !dssRecords.some(d => d.local_dss_id === l && (d.data_realizacao ?? '') >= inicio && (d.data_realizacao ?? '') <= fim));
      if (semDss.length > 0) {
        const afetados = elegiveis.filter(f => f.local_dss_id && semDss.includes(f.local_dss_id)).length;
        dados.push({ code: 'sem_dss', severity: 'atencao', title: 'DSS incompleto', description: 'Locais sem registro de DSS na competência. O motor assume nota 1,0 (neutro) na ausência.', affectedCount: semDss.length, impact: `${afetados} funcionário(s) potencialmente afetado(s)`, origin: 'DSS', action: { label: 'Ver DSS', to: '/premiacoes/dss' } });
      }
    }

    if (dados.length === 0) dados.push({ code: 'dados_ok', severity: 'pronto', title: 'Dados da competência disponíveis', description: 'As fontes usadas pelo motor têm cobertura para a competência.', origin: 'Competência' });
  }

  const groups: ValidationGroup[] = [
    { key: 'parametros', label: 'Parâmetros', items: parametros },
    { key: 'configuracao', label: 'Configuração', items: configuracao },
    { key: 'funcionarios', label: 'Funcionários', items: funcs },
    { key: 'competencia', label: 'Dados da competência', items: dados },
  ];

  const all = groups.flatMap(g => g.items);
  const bloqueios = all.filter(i => i.severity === 'bloqueio').length;
  const atencoes = all.filter(i => i.severity === 'atencao').length;
  const prontos = all.filter(i => i.severity === 'pronto').length;

  return { groups, bloqueios, atencoes, prontos, canProceed: bloqueios === 0 };
}
