import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GitCompareArrows } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CompetenciaPicker } from '@/components/dashboard/CompetenciaPicker';
import { currentCompetencia, shiftCompetencia } from '@/features/dashboard/utils/dates';

import { useSectorIndicators } from '../hooks/useSectorIndicators';
import { useSectorIndicatorsDraft } from '../hooks/useSectorIndicatorsDraft';
import { useSectorIndicatorsSelection } from '../hooks/useSectorIndicatorsSelection';
import { buildBaselineFromRegistros } from '../domain/indicatorCalculations';
import { normalizeSectorIndicatorView, type SectorIndicatorView } from '../views';
import { useResourceAccess } from '@/hooks/useResourceAccess';
import { AccessDenied } from '@/components/AccessDenied';
import { SectorIndicatorsHeader } from './SectorIndicatorsHeader';
import { SectorIndicatorsNavigation } from './SectorIndicatorsNavigation';
import { SectorIndicatorsSkeleton } from './SectorIndicatorsSkeleton';
import { SectorIndicatorsMonthlyView } from '../pages/SectorIndicatorsMonthlyView';
import { SectorIndicatorsHistoryView } from '../pages/SectorIndicatorsHistoryView';
import type { SectorIndicatorsPageProps } from '../pages/_shared';

/**
 * Central Operacional de Apuração dos Indicadores por Setor — 2 visões (?view=).
 * Shell único: carrega dados uma vez, mantém competência e rascunho de apuração,
 * e protege contra perda de alterações não salvas. NÃO duplica a análise
 * consolidada dos Indicadores Gerais — apenas navega para lá.
 */
export function SectorIndicatorsShell() {
  const data = useSectorIndicators();
  const acesso = useResourceAccess('indicadores_setor');
  const podeSalvar = acesso.podeEditarCampo('meta') || acesso.podeEditarCampo('realizado');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = normalizeSectorIndicatorView(searchParams.get('view'));

  const [competencia, setCompetenciaState] = useState(currentCompetencia());
  const [comparing, setComparing] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const draft = useSectorIndicatorsDraft({
    competencia,
    indicadores: data.indicadores,
    indicadoresLoading: data.indicadoresLoading,
    saveApuracao: data.saveApuracaoIndicadores,
  });
  const selection = useSectorIndicatorsSelection();

  const baselineAnterior = comparing
    ? buildBaselineFromRegistros(data.indicadores, shiftCompetencia(competencia, -1))
    : {};

  const [pendingAction, setPendingAction] = useState<null | { kind: 'view'; value: SectorIndicatorView } | { kind: 'competencia'; value: string }>(null);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!draft.isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [draft.isDirty]);

  const setView = (v: SectorIndicatorView) => {
    if (draft.isDirty && view === 'apuracao' && v !== 'apuracao') { setPendingAction({ kind: 'view', value: v }); return; }
    const sp = new URLSearchParams(searchParams);
    sp.set('view', v);
    setSearchParams(sp);
  };

  const setCompetencia = (comp: string) => {
    if (draft.isDirty) { setPendingAction({ kind: 'competencia', value: comp }); return; }
    setCompetenciaState(comp);
    selection.clear();
  };

  const confirmPendingDiscard = () => {
    if (!pendingAction) return;
    draft.restoreAll();
    if (pendingAction.kind === 'view') {
      const sp = new URLSearchParams(searchParams);
      sp.set('view', pendingAction.value);
      setSearchParams(sp);
    } else {
      setCompetenciaState(pendingAction.value);
      selection.clear();
    }
    setPendingAction(null);
  };

  const goToIndicadoresGerais = (params?: { setorId?: string; competencia?: string }) => {
    const sp = new URLSearchParams();
    if (params?.setorId) sp.set('setor', params.setorId);
    if (params?.competencia) sp.set('competencia', params.competencia);
    const qs = sp.toString();
    navigate(`/premiacoes/indicadores-gerais${qs ? `?${qs}` : ''}`);
  };

  if (!acesso.podeVer) return <AccessDenied area="Indicadores por Setor" />;
  if (data.loading && data.setoresPrevistos.length === 0) return <SectorIndicatorsSkeleton />;

  const pageProps: SectorIndicatorsPageProps = {
    data, draft, selection, competencia, setCompetencia, comparing, baselineAnterior,
    reviewOpen, setReviewOpen,
    onGoToView: setView,
    onVerIndicadoresGerais: goToIndicadoresGerais,
  };

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-[18px]">
      <SectorIndicatorsHeader
        competencia={competencia}
        setoresCount={data.setoresPrevistos.length}
        lastSaved={draft.lastSaved}
        isDirty={draft.isDirty}
        changedCount={draft.diff.totalSetoresAlterados}
        saving={draft.saving}
        onSave={() => { setView('apuracao'); setReviewOpen(true); }}
        onVerIndicadoresGerais={() => goToIndicadoresGerais({ competencia })}
        podeSalvar={podeSalvar}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectorIndicatorsNavigation active={view} onChange={setView} />
          <div className="flex items-center gap-2">
            {view === 'apuracao' && (
              <Button variant={comparing ? 'default' : 'outline'} size="sm" className="h-9 gap-1.5" onClick={() => setComparing((v) => !v)}>
                <GitCompareArrows className="h-4 w-4" /> Comparar período
              </Button>
            )}
            <CompetenciaPicker value={competencia} onChange={setCompetencia} />
          </div>
        </div>
      </SectorIndicatorsHeader>

      <div key={view} className="animate-in fade-in slide-in-from-right-2 duration-200 motion-reduce:animate-none">
        {view === 'historico'
          ? <SectorIndicatorsHistoryView {...pageProps} />
          : <SectorIndicatorsMonthlyView {...pageProps} />}
      </div>

      <AlertDialog open={!!pendingAction} onOpenChange={(o) => { if (!o) setPendingAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Há {draft.diff.totalSetoresAlterados} setor(es) alterado(s) nesta competência que ainda não foram salvos.
              {pendingAction?.kind === 'view' ? ' Trocar de visão' : ' Trocar de competência'} descartará essas alterações. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAction(null)}>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPendingDiscard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Descartar e continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
