import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useProductionEntry } from '@/features/production-entry/hooks/useProductionEntry';
import { useProductionDraft } from '@/features/production-entry/hooks/useProductionDraft';
import { normalizeProductionView, type ProductionView } from '@/features/production-entry/views';
import { useResourceAccess } from '@/hooks/useResourceAccess';
import { buildProductionFieldAccess } from '@/features/production-entry/domain/productionFieldAccess';
import { AccessDenied } from '@/components/AccessDenied';
import { currentCompetencia, shiftCompetencia } from '@/features/dashboard/utils/dates';
import { buildBaselineFromRegistros } from '@/features/production-entry/domain/productionCalculations';

import { ProductionPeriodHeader } from '@/features/production-entry/components/ProductionPeriodHeader';
import { ProductionEntryNavigation } from '@/features/production-entry/components/ProductionEntryNavigation';
import { ProductionSkeleton } from '@/features/production-entry/components/ProductionSkeleton';
import { CompetenciaPicker } from '@/components/dashboard/CompetenciaPicker';

import { ProductionMonthlyEntryView } from '@/features/production-entry/pages/ProductionMonthlyEntryView';
import { ProductionHistoryView } from '@/features/production-entry/pages/ProductionHistoryView';
import { ProductionImportView } from '@/features/production-entry/pages/ProductionImportView';
import type { ProductionPageProps } from '@/features/production-entry/pages/_shared';

/**
 * Central Operacional de Apuração da Produção por Setor — 3 visões (?view=).
 * Shell único: carrega dados uma vez, mantém competência e rascunho de
 * apuração, e protege contra perda de alterações não salvas.
 */
export const ProducaoSetor = () => {
  const data = useProductionEntry();
  const [searchParams, setSearchParams] = useSearchParams();

  // Permissões das telas deste shell (ver src/config/permissions.ts).
  const acesso = useResourceAccess('producao_setor');
  const acessoHistorico = useResourceAccess('producao_historico');
  const campos = useMemo(() => buildProductionFieldAccess(acesso), [acesso]);

  const viewsPermitidas = useMemo<ProductionView[]>(() => {
    const vs: ProductionView[] = ['apuracao'];
    if (acessoHistorico.podeVer) vs.push('historico');
    if (acesso.podeImportar) vs.push('importacoes');
    return vs;
  }, [acessoHistorico.podeVer, acesso.podeImportar]);

  // Visão pedida na URL que o usuário não pode abrir cai na apuração.
  const viewSolicitada = normalizeProductionView(searchParams.get('view'));
  const view = viewsPermitidas.includes(viewSolicitada) ? viewSolicitada : 'apuracao';

  const [competencia, setCompetenciaState] = useState(currentCompetencia());
  const [comparing, setComparing] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const draft = useProductionDraft({
    competencia,
    registros: data.registros,
    registrosLoading: data.registrosLoading,
    saveApuracao: data.saveApuracao,
  });

  // Baseline da competência anterior — só computado quando a comparação está ativa.
  const baselineAnterior = useMemo(() => {
    if (!comparing) return {};
    return buildBaselineFromRegistros(data.registros, shiftCompetencia(competencia, -1));
  }, [comparing, data.registros, competencia]);

  const [pendingAction, setPendingAction] = useState<null | { kind: 'view'; value: ProductionView } | { kind: 'competencia'; value: string }>(null);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!draft.isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [draft.isDirty]);

  const setView = (v: ProductionView) => {
    if (!viewsPermitidas.includes(v)) return;
    if (draft.isDirty && view === 'apuracao' && v !== 'apuracao') { setPendingAction({ kind: 'view', value: v }); return; }
    const sp = new URLSearchParams(searchParams);
    sp.set('view', v);
    setSearchParams(sp);
  };

  const setCompetencia = (comp: string) => {
    if (draft.isDirty) { setPendingAction({ kind: 'competencia', value: comp }); return; }
    setCompetenciaState(comp);
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
    }
    setPendingAction(null);
  };

  if (!acesso.podeVer) return <AccessDenied area="Produção por Setor" />;
  if (data.loading && data.setores.length === 0) return <ProductionSkeleton />;

  const pageProps: ProductionPageProps = {
    data, draft, competencia, setCompetencia, comparing, setComparing, baselineAnterior,
    reviewOpen, setReviewOpen,
    onGoToView: setView,
    onImport: () => setView('importacoes'),
  };

  const renderView = () => {
    switch (view) {
      case 'historico': return <ProductionHistoryView {...pageProps} />;
      case 'importacoes': return <ProductionImportView {...pageProps} />;
      default: return <ProductionMonthlyEntryView {...pageProps} />;
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-[18px]">
      <ProductionPeriodHeader
        competencia={competencia}
        setoresCount={data.setoresPrevistos.length}
        lastSaved={draft.lastSaved}
        isDirty={draft.isDirty}
        changedCount={draft.diff.totalSetoresAlterados}
        saving={draft.saving}
        comparing={comparing}
        onImport={() => setView('importacoes')}
        onToggleCompare={() => setComparing((v) => !v)}
        onSave={() => { setView('apuracao'); setReviewOpen(true); }}
        podeImportar={acesso.podeImportar}
        podeSalvar={campos.podeEditarAlgum}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ProductionEntryNavigation active={view} onChange={setView} disponiveis={viewsPermitidas} />
          <CompetenciaPicker value={competencia} onChange={setCompetencia} />
        </div>
      </ProductionPeriodHeader>

      <div key={view} className="animate-in fade-in slide-in-from-right-2 duration-200 motion-reduce:animate-none">
        {renderView()}
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
};
