import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CompetenciaPicker } from '@/components/dashboard/CompetenciaPicker';
import { currentCompetencia, shiftCompetencia } from '@/features/dashboard/utils/dates';
import type { IndicadorGeral } from '@/hooks/useIndicadoresGerais';

import { useGeneralIndicators } from '../hooks/useGeneralIndicators';
import { pointsByTipo as buildPointsByTipo, buildCardData, latestCompetencia } from '../domain/indicatorCalculations';
import { analyzePoint } from '../domain/indicatorDataQuality';
import { normalizeGeneralIndicatorView, type GeneralIndicatorView } from '../views';
import type { GeneralHistoryRow } from '../types/general-indicators.types';

import { GeneralIndicatorsHeader } from './GeneralIndicatorsHeader';
import { GeneralIndicatorsNavigation } from './GeneralIndicatorsNavigation';
import { GeneralIndicatorsSkeleton } from './GeneralIndicatorsSkeleton';
import { GeneralIndicatorDrawer } from './GeneralIndicatorDrawer';
import { GeneralIndicatorForm } from './GeneralIndicatorForm';
import { GeneralIndicatorsOverview } from '../pages/GeneralIndicatorsOverview';
import { GeneralIndicatorsEvolution } from '../pages/GeneralIndicatorsEvolution';
import { GeneralIndicatorsHistory } from '../pages/GeneralIndicatorsHistory';
import type { GeneralPageProps, GeneralIndicatorsAccess } from '../pages/_shared';
import { useResourceAccess } from '@/hooks/useResourceAccess';
import { AccessDenied } from '@/components/AccessDenied';

/**
 * Central de Indicadores Corporativos — 3 visões (?view=geral|evolucao|historico).
 * Shell único: carrega dados uma vez, deriva pontos/cards/histórico e hospeda o
 * drawer e o formulário compartilhados. NÃO altera a gravação legada (percentual)
 * consumida pela premiação (FAT/KITS).
 */
export function GeneralIndicatorsShell() {
  const data = useGeneralIndicators();
  const acessoRecurso = useResourceAccess('indicadores_gerais');
  const campos = useMemo(() => ({
    editarMeta: acessoRecurso.podeEditarCampo('meta'),
    editarRealizado: acessoRecurso.podeEditarCampo('realizado'),
  }), [acessoRecurso]);
  // Criar/editar exigem ao menos um campo alterável — sem isso o formulário não salva.
  const acesso = useMemo<GeneralIndicatorsAccess>(() => {
    const algumCampo = campos.editarMeta || campos.editarRealizado;
    return {
      podeCriar: acessoRecurso.podeCriar && algumCampo,
      podeEditar: acessoRecurso.podeEditar && algumCampo,
      podeExcluir: acessoRecurso.podeExcluir,
    };
  }, [acessoRecurso, campos]);
  const [searchParams, setSearchParams] = useSearchParams();
  const view = normalizeGeneralIndicatorView(searchParams.get('view'));

  const [competencia, setCompetencia] = useState(() => searchParams.get('competencia') || '');
  const [comparacao, setComparacao] = useState('');
  const [selectedTipoId, setSelectedTipoId] = useState('');
  const [selectedRow, setSelectedRow] = useState<GeneralHistoryRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IndicadorGeral | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Competência padrão: a mais recente com dados (ou o mês corrente).
  useEffect(() => {
    if (competencia || data.indicadoresLoading) return;
    setCompetencia(latestCompetencia(data.indicadores) || currentCompetencia());
  }, [competencia, data.indicadores, data.indicadoresLoading]);

  const points = useMemo(() => buildPointsByTipo(data.indicadores, data.tiposById), [data.indicadores, data.tiposById]);

  const cards = useMemo(
    () => data.tiposAtivos.map((tipo) => buildCardData(tipo, points.get(tipo.id) ?? [], competencia, (p, hist) => analyzePoint(p, hist))),
    [data.tiposAtivos, points, competencia],
  );

  const historyRows = useMemo<GeneralHistoryRow[]>(() => {
    const out: GeneralHistoryRow[] = [];
    for (const [tipoId, tipoPoints] of points.entries()) {
      const tipo = data.tiposById.get(tipoId);
      for (const p of tipoPoints) out.push({ ...p, descricao: tipo?.descricao, quality: analyzePoint(p, tipoPoints) });
    }
    return out;
  }, [points, data.tiposById]);

  const competenciasComDados = useMemo(() => [...new Set(historyRows.map((r) => r.competencia))].sort((a, b) => (a < b ? 1 : -1)), [historyRows]);

  const setView = (v: GeneralIndicatorView) => { const sp = new URLSearchParams(searchParams); sp.set('view', v); setSearchParams(sp); };

  const handleRefresh = async () => { setRefreshing(true); try { await data.refetch(); setLastUpdated(new Date()); } finally { setRefreshing(false); } };

  const openRegister = () => { if (!acesso.podeCriar) return; setEditing(null); setFormOpen(true); };
  const openEdit = (registroId: string) => {
    if (!acesso.podeEditar) return;
    const reg = data.indicadores.find((i) => i.id === registroId);
    if (reg) { setEditing(reg); setFormOpen(true); }
  };
  const goToEvolution = (tipoId: string) => { setSelectedTipoId(tipoId); setView('evolucao'); };

  const drawerSerie = useMemo(
    () => (selectedRow ? historyRows.filter((r) => r.tipoId === selectedRow.tipoId).sort((a, b) => (a.competencia < b.competencia ? -1 : 1)) : []),
    [selectedRow, historyRows],
  );

  if (!acessoRecurso.podeVer) return <AccessDenied area="Indicadores Gerais" />;
  if (data.loading && data.tiposIndicadores.length === 0) return <GeneralIndicatorsSkeleton />;

  const pageProps: GeneralPageProps = {
    data, competencia, setCompetencia, competenciasComDados,
    pointsByTipo: points, cards, historyRows,
    selectedTipoId: selectedTipoId || data.tiposAtivos[0]?.id || '',
    setSelectedTipoId,
    comparacaoCompetencia: comparacao || shiftCompetencia(competencia, -1),
    setComparacaoCompetencia: setComparacao,
    onOpenDrawer: setSelectedRow,
    onRegister: openRegister,
    onEdit: openEdit,
    onGoToView: setView,
    onGoToEvolution: goToEvolution,
    acesso,
  };

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-[18px]">
      <GeneralIndicatorsHeader
        competencia={competencia}
        indicadoresCount={data.tiposAtivos.length}
        lastUpdated={lastUpdated}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onRegister={openRegister}
        podeCriar={acesso.podeCriar}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <GeneralIndicatorsNavigation active={view} onChange={setView} />
          <CompetenciaPicker value={competencia} onChange={setCompetencia} />
        </div>
      </GeneralIndicatorsHeader>

      <div key={view} className="animate-in fade-in slide-in-from-right-2 duration-200 motion-reduce:animate-none">
        {view === 'evolucao' ? <GeneralIndicatorsEvolution {...pageProps} />
          : view === 'historico' ? <GeneralIndicatorsHistory {...pageProps} />
          : <GeneralIndicatorsOverview {...pageProps} />}
      </div>

      <GeneralIndicatorDrawer
        row={selectedRow}
        serie={drawerSerie}
        onClose={() => setSelectedRow(null)}
        onEdit={(row) => { setSelectedRow(null); openEdit(row.registroId); }}
        onCompare={(row) => { setSelectedRow(null); goToEvolution(row.tipoId); }}
        podeEditar={acesso.podeEditar}
      />

      <GeneralIndicatorForm
        open={formOpen}
        onOpenChange={setFormOpen}
        tipos={data.tiposAtivos}
        editing={editing}
        defaultCompetencia={competencia || currentCompetencia()}
        findRegistro={data.findRegistro}
        onCreate={data.createIndicador}
        onUpdate={(id, d) => data.updateIndicador(id, d)}
        onEditExisting={(reg) => setEditing(reg)}
        campos={campos}
      />
    </div>
  );
}
