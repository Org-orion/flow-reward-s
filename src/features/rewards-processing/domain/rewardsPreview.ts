// Orquestração da PRÉVIA de premiações — função PURA, sem persistência.
//
// ⚠️ EXTRAÇÃO FIEL: este arquivo é uma transcrição VERBATIM da lógica por
// funcionário que vivia inline em `GerarPremiacoes.tsx` (linhas ~194-446 na data
// da extração). NÃO altera regras: apenas move a orquestração para fora do
// componente e delega, exatamente como antes, às funções puras do motor em
// `@/domain/premiacao/calculoPremiacao`. O objetivo é permitir calcular a prévia
// em memória (sem gravar) e alimentar a memória de cálculo (observacional).
//
// O motor NÃO é duplicado nem reimplementado. Qualquer decisão de cálculo
// permanece nas funções do domínio. O `trace` é derivado dos MESMOS valores
// intermediários já usados — é observacional e não participa da decisão.
import type { Funcionario } from '@/hooks/useFuncionarios';
import type { FormulaCalculo } from '@/hooks/useFormulasCalculo';
import type { BasePremiacao } from '@/hooks/useBasePremiacao';
import type { ConfiguracaoKits } from '@/hooks/useConfiguracoesKits';
import type { IndicadorSetor } from '@/hooks/useIndicadoresSetor';
import {
  calcularComissao, calcularNotaFaltas, calcularNotaAdvertencias, calcularNotaEpi,
  calcularNotaDss, calcularNotaProducao, calcularNotaGeral, calcularBonus,
  extractKitsMultiplier, isProducaoBase, isKitsBase, normalize,
} from '@/domain/premiacao/calculoPremiacao';
import {
  calcularBonusPercentualKits, type BonusPercentualKitsInput,
} from '@/domain/premiacao/bonusPercentualKits';
import { formatPercentBR } from '@/lib/formatters';
import { formatCurrencyBRL } from '@/lib/formatters';
import type {
  BasePreview, RewardResult, RewardsPreview, TraceEntry, PreviewTotals,
} from '../types/rewards-processing.types';

// Configuração-fallback de kits (idêntica à embutida no componente legado).
const FALLBACK_CONFIG: ConfiguracaoKits = {
  id: '', vigencia_inicio: '2000-01', minimo_kits: 10000,
  incremento_faixa: 250, bonus_base: 100, bonus_por_faixa: 25,
  ativo: true, created_at: '', updated_at: '',
};

// Linhas mínimas de eventos (só os campos usados) — desacopla dos hooks.
interface FaltaAdvRow { funcionario_id?: string; tipo?: string; data_ocorrencia?: string; quantidade?: number }
interface EpiRow { funcionario_id?: string; data_entrega?: string; status?: string }
interface DssRow { local_dss_id?: string; data_realizacao?: string; participantes_ids?: string[] }
interface ProducaoRow { setor_id?: string | null; data_producao?: string; meta_diaria?: number; producao_realizada?: number }
interface SetorRow { id: string; supervisor_id?: string | null; encarregado_id?: string | null }
interface IndicadorGeralRow { competencia?: string; realizado?: number; percentual?: number; tipo_indicador?: { codigo?: string } }

export interface RewardsPreviewInputs {
  funcionarios: Funcionario[];
  formulas: FormulaCalculo[];
  bases: BasePremiacao[];
  setores: SetorRow[];
  faltasAdvertencias: FaltaAdvRow[];
  epiRecords: EpiRow[];
  dssRecords: DssRow[];
  producaoSetor: ProducaoRow[];
  indicadoresSetor: IndicadorSetor[];
  indicadoresGerais: IndicadorGeralRow[];
  getConfigKits: (competencia: string) => ConfiguracaoKits | null;
  /**
   * Configuração de BÔNUS PERCENTUAL vigente na competência, ou null.
   *
   * É o seletor de modelo para as bases de kits: havendo configuração percentual,
   * ela substitui o cálculo por faixas (`calcularComissao`). A virada é definida
   * pela vigência cadastrada — não há data fixa no código.
   */
  getConfigBonusPercentual: (competencia: string) => BonusPercentualKitsInput | null;
}

export interface RewardsPreviewParams {
  competencia: string;   // 'YYYY-MM'
  baseIds: string[];
  categoriaIds: string[];
}

const fmtNota = (n: number | null | undefined) => (n == null ? null : Number(n.toFixed(4)));

/** Calcula um funcionário (transcrição verbatim do map legado) + trace observacional. */
function computeEmployeeReward(
  funcionario: Funcionario,
  currentBaseId: string,
  baseSelecionada: BasePremiacao | undefined,
  isProducaoGeracao: boolean,
  isKitsGeracao: boolean,
  competencia: string,
  inputs: RewardsPreviewInputs,
): RewardResult {
  const {
    formulas, bases, setores, faltasAdvertencias, epiRecords, dssRecords,
    producaoSetor, indicadoresSetor, indicadoresGerais, getConfigKits, getConfigBonusPercentual,
  } = inputs;
  const flags: string[] = [];

  const categoriaNome = funcionario.categoria?.nome?.toUpperCase() || '';
  const baseNome = baseSelecionada?.nome?.toUpperCase() || '';
  const nomeFormula = `${categoriaNome} - ${baseNome}`;

  const formula = formulas.find(f =>
    f.categoria_id === funcionario.categoria_id &&
    f.base_premiacao_id === currentBaseId
  ) || (isKitsGeracao ? formulas.find(f =>
    f.categoria_id === funcionario.categoria_id &&
    normalize(bases.find(b => b.id === f.base_premiacao_id)?.nome || '').startsWith('KIT')
  ) : undefined) || formulas.find(f =>
    normalize(f.nome) === normalize(nomeFormula)
  );

  if (!formula) flags.push('Fórmula não encontrada para a categoria/base');

  const [ano, mes] = competencia.split('-');
  const dataInicio = `${ano}-${mes}-01`;
  const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate();
  const dataFim = `${ano}-${mes}-${ultimoDia}`;

  // 1. FALTAS
  const faltasDoMes = faltasAdvertencias.filter(f =>
    f.funcionario_id === funcionario.id && f.tipo === 'falta' &&
    (f.data_ocorrencia ?? '') >= dataInicio && (f.data_ocorrencia ?? '') <= dataFim);
  const totalFaltas = faltasDoMes.reduce((acc, f) => acc + (f.quantidade || 1), 0);
  const notaFaltas = calcularNotaFaltas(totalFaltas);

  // 2. ADVERTÊNCIAS
  const advertenciasDoMes = faltasAdvertencias.filter(f =>
    f.funcionario_id === funcionario.id && f.tipo === 'advertencia' &&
    (f.data_ocorrencia ?? '') >= dataInicio && (f.data_ocorrencia ?? '') <= dataFim);
  const totalAdvertencias = advertenciasDoMes.reduce((acc, f) => acc + (f.quantidade || 1), 0);
  const notaAdvertencias = calcularNotaAdvertencias(totalAdvertencias);

  // 3. EPI
  const episDoMes = epiRecords.filter(e =>
    e.funcionario_id === funcionario.id &&
    (e.data_entrega ?? '') >= dataInicio && (e.data_entrega ?? '') <= dataFim);
  const totalAuditorias = episDoMes.length;
  const naoConformidades = episDoMes.filter(e => e.status === 'nao_conforme').length;
  const notaEpi = calcularNotaEpi(totalAuditorias, naoConformidades);

  // 4. DSS
  const dssDoLocalNoMes = dssRecords.filter(d =>
    d.local_dss_id === funcionario.local_dss_id &&
    (d.data_realizacao ?? '') >= dataInicio && (d.data_realizacao ?? '') <= dataFim);
  const totalDssLocal = dssDoLocalNoMes.length;
  const presencasDss = dssDoLocalNoMes.filter(d => d.participantes_ids?.includes(funcionario.id)).length;
  const notaDss = calcularNotaDss(totalDssLocal, presencasDss);

  // 5. PRODUÇÃO
  let notaProducao = 0;
  let percentualProducao = 0;
  const isSupervisorOrEncarregado = ['SUPERVISOR', 'ENCARREGADO'].includes(categoriaNome);

  if (isProducaoGeracao) {
    if (isSupervisorOrEncarregado) {
      const setoresSupervisionados = funcionario.setor_ids && funcionario.setor_ids.length > 0
        ? setores.filter(s => funcionario.setor_ids!.includes(s.id))
        : setores.filter(s => s.supervisor_id === funcionario.id || s.encarregado_id === funcionario.id);
      if (setoresSupervisionados.length > 0) {
        const setorIds = setoresSupervisionados.map(s => s.id);
        const producaoDosSetores = producaoSetor.filter(p =>
          setorIds.includes(p.setor_id || '') &&
          (p.data_producao ?? '') >= dataInicio && (p.data_producao ?? '') <= dataFim);
        if (producaoDosSetores.length > 0) {
          const totalMeta = producaoDosSetores.reduce((acc, p) => acc + (p.meta_diaria || 0), 0);
          const totalRealizado = producaoDosSetores.reduce((acc, p) => acc + (p.producao_realizada || 0), 0);
          const producao = calcularNotaProducao(totalMeta, totalRealizado);
          percentualProducao = producao.percentual;
          notaProducao = producao.nota;
        }
      }
    } else if (funcionario.setor_id) {
      const producaoDoSetor = producaoSetor.filter(p =>
        p.setor_id === funcionario.setor_id &&
        (p.data_producao ?? '') >= dataInicio && (p.data_producao ?? '') <= dataFim);
      if (producaoDoSetor.length > 0) {
        const totalMeta = producaoDoSetor.reduce((acc, p) => acc + (p.meta_diaria || 0), 0);
        const totalRealizado = producaoDoSetor.reduce((acc, p) => acc + (p.producao_realizada || 0), 0);
        const producao = calcularNotaProducao(totalMeta, totalRealizado);
        percentualProducao = producao.percentual;
        notaProducao = producao.nota;
      }
    }
  }

  // 6. INDICADORES ADICIONAIS (Supervisor/Encarregado em PRODUÇÃO)
  let notaFaturamento = 0, notaItensNC = 0, notaTratamentoNC = 0, notaHoraMaquina = 0, notaOperacaoSegura = 0, notaLimpeza = 0;
  if (isSupervisorOrEncarregado && isProducaoGeracao) {
    const competenciaFormatada = `${ano}-${mes}-01`;
    const faturamentoMes = indicadoresGerais.find(i => i.tipo_indicador?.codigo === 'FAT' && i.competencia === competenciaFormatada);
    if (faturamentoMes) notaFaturamento = (faturamentoMes.percentual ?? 0) / 100;

    const setoresSupervisionados = funcionario.setor_ids && funcionario.setor_ids.length > 0
      ? setores.filter(s => funcionario.setor_ids!.includes(s.id))
      : setores.filter(s => s.supervisor_id === funcionario.id || s.encarregado_id === funcionario.id);
    if (setoresSupervisionados.length > 0) {
      const setorIds = setoresSupervisionados.map(s => s.id);
      const indicadoresDosMeses = indicadoresSetor.filter(i => setorIds.includes(i.setor_id || '') && i.competencia === competenciaFormatada);
      const calcularMediaIndicador = (campoMeta: string, campoRealizado: string) => {
        const percentuais = indicadoresDosMeses
          .map(i => {
            const rec = i as unknown as Record<string, number | undefined>;
            const meta = rec[campoMeta];
            const realizado = rec[campoRealizado];
            if (!meta || meta === 0) return null;
            return Math.min((realizado ?? 0) / meta, 1.0);
          })
          .filter((v): v is number => v != null);
        if (percentuais.length === 0) return 1.0;
        return percentuais.reduce((acc, v) => acc + v, 0) / percentuais.length;
      };
      notaItensNC = calcularMediaIndicador('identificacao_nc_meta', 'identificacao_nc_realizado');
      notaTratamentoNC = calcularMediaIndicador('tratamento_nc_meta', 'tratamento_nc_realizado');
      notaHoraMaquina = calcularMediaIndicador('hora_maquina_meta', 'hora_maquina_realizado');
      notaOperacaoSegura = calcularMediaIndicador('operacao_segura_meta', 'operacao_segura_realizado');
      notaLimpeza = calcularMediaIndicador('limpeza_meta', 'limpeza_realizado');
    }
  }

  // 7. NOTA GERAL (motor)
  const notaGeral = calcularNotaGeral({
    notas: { notaProducao, notaEpi, notaFaltas, notaDss, notaAdvertencias, notaFaturamento, notaItensNC, notaTratamentoNC, notaHoraMaquina, notaOperacaoSegura, notaLimpeza },
    formula, isProducaoGeracao, isSupervisorOrEncarregado,
  });

  // 8. BÔNUS (motor)
  const valorFaixa = funcionario.faixa?.valor || 0;
  const valorFixo = funcionario.valor_fixo || 0;
  const kitsMes = isKitsGeracao
    ? indicadoresGerais.find(i => i.tipo_indicador?.codigo === 'KITS' && i.competencia === dataInicio)
    : null;
  const realizadoKits = kitsMes?.realizado || 0;

  // Seleção do modelo de remuneração de kits: percentual (proporcional) quando há
  // configuração vigente na competência; senão, faixas (degrau) como antes.
  const configPercentual = isKitsGeracao ? getConfigBonusPercentual(competencia) : null;
  const bonusPercentual = configPercentual ? calcularBonusPercentualKits(realizadoKits, configPercentual) : null;
  const configKits = getConfigKits(competencia) || FALLBACK_CONFIG;
  const valorKits = isKitsGeracao
    ? (bonusPercentual ? bonusPercentual.bonusTotal : calcularComissao(realizadoKits, configKits))
    : undefined;
  const multiplicadorKits = isKitsGeracao ? extractKitsMultiplier(baseSelecionada?.nome) : 1.0;
  const { bonusPossivel, bonusAlcancado } = calcularBonus({ notaGeral, valorFaixa, valorFixo, isKitsGeracao, valorKits, multiplicadorKits });

  // Trace observacional — derivado dos MESMOS valores acima.
  const trace: TraceEntry[] = [];
  if (isProducaoGeracao) trace.push({ key: 'producao', label: 'Produção', entrada: `${(percentualProducao * 100).toFixed(1)}% de atingimento`, nota: fmtNota(notaProducao) });
  trace.push({ key: 'epi', label: 'EPI', entrada: totalAuditorias > 0 ? `${totalAuditorias - naoConformidades}/${totalAuditorias} auditorias conformes` : 'Sem auditorias', nota: fmtNota(notaEpi) });
  trace.push({ key: 'faltas', label: 'Faltas', entrada: `${totalFaltas} falta(s)`, nota: fmtNota(notaFaltas) });
  trace.push({ key: 'advertencias', label: 'Advertências', entrada: `${totalAdvertencias} advertência(s)`, nota: fmtNota(notaAdvertencias) });
  trace.push({ key: 'dss', label: 'DSS', entrada: totalDssLocal > 0 ? `${presencasDss}/${totalDssLocal} presenças` : 'Sem DSS no local', nota: fmtNota(notaDss) });
  if (isSupervisorOrEncarregado && isProducaoGeracao) {
    trace.push({ key: 'faturamento', label: 'Faturamento', nota: fmtNota(notaFaturamento) });
    trace.push({ key: 'itens_nc', label: 'Identificação de NC', nota: fmtNota(notaItensNC) });
    trace.push({ key: 'tratamento_nc', label: 'Tratamento de NC', nota: fmtNota(notaTratamentoNC) });
    trace.push({ key: 'hora_maquina', label: 'Hora Máquina', nota: fmtNota(notaHoraMaquina) });
    trace.push({ key: 'operacao_segura', label: 'Operação Segura', nota: fmtNota(notaOperacaoSegura) });
    trace.push({ key: 'limpeza', label: 'Limpeza', nota: fmtNota(notaLimpeza) });
  }
  trace.push({ key: 'nota_geral', label: 'Nota geral', nota: fmtNota(notaGeral), observacao: 'Resultado ponderado pela fórmula (motor de premiação).' });
  trace.push({ key: 'valor_faixa', label: 'Valor da faixa', entrada: formatCurrencyBRL(valorFaixa) });
  if (valorFixo) trace.push({ key: 'valor_fixo', label: 'Valor fixo', entrada: formatCurrencyBRL(valorFixo) });
  if (isKitsGeracao) {
    trace.push({ key: 'kits', label: 'Kits', entrada: `${realizadoKits} kits · multiplicador ${multiplicadorKits}`, observacao: `Comissão: ${formatCurrencyBRL(valorKits ?? 0)}` });
    if (bonusPercentual) {
      const b = bonusPercentual;
      trace.push({
        key: 'kits_percentual',
        label: 'Percentual de kits',
        entrada: b.atingiuMeta
          ? `${formatPercentBR(b.percentualAplicado)} · ${formatCurrencyBRL(b.adicional)}`
          : 'Meta não atingida — 0%',
        observacao: b.atingiuMeta
          ? `Excedente de ${b.excedente} kits sobre a meta de ${b.meta}, em blocos de ${b.blocoKits} (proporcional).`
            + ` Bônus da meta ${formatCurrencyBRL(b.bonusMetaAplicado)} + adicional ${formatCurrencyBRL(b.adicional)}.`
            + (b.tetoAplicado ? ` Percentual bruto de ${formatPercentBR(b.percentual)} limitado ao teto de ${formatPercentBR(b.percentualMaximo)}.` : '')
          : `Meta de ${b.meta} kits não alcançada.`,
      });
    } else {
      trace.push({
        key: 'kits_modelo',
        label: 'Modelo de kits',
        entrada: 'Faixas (degrau)',
        observacao: `Sem configuração de bônus percentual vigente em ${competencia}; comissão calculada por faixas completas.`,
      });
    }
  }
  trace.push({ key: 'bonus_possivel', label: 'Bônus possível', entrada: formatCurrencyBRL(bonusPossivel) });
  trace.push({ key: 'bonus_alcancado', label: 'Bônus alcançado', entrada: formatCurrencyBRL(bonusAlcancado) });

  return {
    id: funcionario.id,
    cod_funcionario: funcionario.cpf || funcionario.id.substring(0, 8),
    nome: funcionario.nome,
    setor: funcionario.setor?.nome || 'N/A',
    funcao: funcionario.funcao?.nome || 'N/A',
    faixa: funcionario.faixa?.nome || 'N/A',
    categoria: funcionario.categoria?.nome || 'N/A',
    valor_faixa: valorFaixa,
    percentual_producao: isProducaoGeracao ? percentualProducao : undefined,
    nota_producao: isProducaoGeracao ? notaProducao : undefined,
    nota_epi: notaEpi,
    nota_faltas: notaFaltas,
    nota_advertencias: notaAdvertencias,
    nota_dss: notaDss,
    nota_faturamento: (isSupervisorOrEncarregado && isProducaoGeracao) ? notaFaturamento : undefined,
    nota_itens_nc: (isSupervisorOrEncarregado && isProducaoGeracao) ? notaItensNC : undefined,
    nota_tratamento_nc: (isSupervisorOrEncarregado && isProducaoGeracao) ? notaTratamentoNC : undefined,
    nota_hora_maquina: (isSupervisorOrEncarregado && isProducaoGeracao) ? notaHoraMaquina : undefined,
    nota_operacao_segura: (isSupervisorOrEncarregado && isProducaoGeracao) ? notaOperacaoSegura : undefined,
    nota_limpeza: (isSupervisorOrEncarregado && isProducaoGeracao) ? notaLimpeza : undefined,
    valor_kits: valorKits,
    nota_geral: notaGeral,
    bonus_possivel: bonusPossivel,
    bonus_alcancado: bonusAlcancado,
    valor_fixo: valorFixo,
    trace,
    flags,
  };
}

/** Calcula a prévia de uma base (sem persistir). Mantém o mesmo filtro do legado. */
export function computeBasePreview(baseId: string, params: RewardsPreviewParams, inputs: RewardsPreviewInputs): BasePreview {
  const baseSelecionada = inputs.bases.find(b => b.id === baseId);
  const isProducaoGeracao = isProducaoBase(baseSelecionada?.nome);
  const isKitsGeracao = isKitsBase(baseSelecionada?.nome);
  const tipo: BasePreview['tipo'] = isProducaoGeracao ? 'producao' : isKitsGeracao ? 'kits' : 'outra';

  const funcionariosAtivos = inputs.funcionarios.filter(f =>
    f.ativo && f.base_premiacao_id === baseId &&
    (params.categoriaIds.length === 0 || params.categoriaIds.includes(f.categoria_id || '')));

  if (funcionariosAtivos.length === 0) {
    return { baseId, baseNome: baseSelecionada?.nome ?? 'Base não encontrada', tipo, employees: [], skippedReason: 'Nenhum funcionário ativo encontrado para a base (e categoria, se aplicável).' };
  }

  const employees = funcionariosAtivos.map(f =>
    computeEmployeeReward(f, baseId, baseSelecionada, isProducaoGeracao, isKitsGeracao, params.competencia, inputs));

  return { baseId, baseNome: baseSelecionada?.nome ?? 'Base não encontrada', tipo, employees, skippedReason: null };
}

function computeTotals(bases: BasePreview[]): PreviewTotals {
  const all = bases.flatMap(b => b.employees);
  const comBonus = all.filter(e => e.bonus_alcancado > 0).length;
  const valorTotal = all.reduce((s, e) => s + (e.bonus_alcancado || 0), 0);
  return {
    funcionariosCalculados: all.length,
    comBonus,
    semBonus: all.length - comBonus,
    valorTotal,
    valorPossivelTotal: all.reduce((s, e) => s + (e.bonus_possivel || 0), 0),
    valorMedio: all.length > 0 ? valorTotal / all.length : null,
  };
}

/** Prévia completa (todas as bases do escopo) — PURA, sem persistência. */
export function computeRewardsPreview(params: RewardsPreviewParams, inputs: RewardsPreviewInputs): RewardsPreview {
  const bases = params.baseIds.map(id => computeBasePreview(id, params, inputs));
  return { competencia: params.competencia, categoriaIds: params.categoriaIds, bases, totals: computeTotals(bases) };
}
