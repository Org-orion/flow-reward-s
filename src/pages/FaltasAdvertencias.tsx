import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useOccurrences } from "@/features/occurrences/hooks/useOccurrences";
import { useOccurrenceDraft } from "@/features/occurrences/hooks/useOccurrenceDraft";
import { useOccurrenceFilters } from "@/features/occurrences/hooks/useOccurrenceFilters";
import { useEmployeeSelection } from "@/features/employees/hooks/useEmployeeSelection";
import { normalizeOccurrenceView, type OccurrenceView } from "@/features/occurrences/views";
import { currentCompetencia } from "@/features/dashboard/utils/dates";

import { OccurrencesHeader } from "@/components/occurrences/OccurrencesHeader";
import { OccurrencesNavigation } from "@/components/occurrences/OccurrencesNavigation";
import { OccurrencesSkeleton } from "@/components/occurrences/OccurrencesSkeleton";
import { CompetenciaPicker } from "@/components/dashboard/CompetenciaPicker";
import { EmptyState } from "@/components/app/EmptyState";
import { Users } from "lucide-react";

import { MonthlyEntryView } from "@/components/occurrences/pages/MonthlyEntryView";
import { PeriodAnalysisView } from "@/components/occurrences/pages/PeriodAnalysisView";
import { OccurrencesHistoryView } from "@/components/occurrences/pages/OccurrencesHistoryView";
import { OccurrencesImportView } from "@/components/occurrences/pages/OccurrencesImportView";
import type { OccurrencePageProps } from "@/components/occurrences/pages/_shared";
import { useResourceAccess } from "@/hooks/useResourceAccess";

/**
 * Central de Apuração de Ocorrências — experiência paginada (4 visões).
 * Shell único: carrega os dados uma vez, mantém a competência e o rascunho
 * de lançamento, e protege contra perda de alterações não salvas.
 */
export const FaltasAdvertencias = () => {
  const data = useOccurrences();
  const [searchParams, setSearchParams] = useSearchParams();

  // Permissões desta tela (ver src/config/permissions.ts).
  const acesso = useResourceAccess("faltas_advertencias");
  const viewsPermitidas = useMemo<OccurrenceView[]>(() => {
    const vs: OccurrenceView[] = ["lancamento", "analise", "historico"];
    if (acesso.podeImportar) vs.push("importacoes");
    return vs;
  }, [acesso.podeImportar]);

  // Visão pedida na URL que o usuário não pode abrir cai no lançamento.
  const viewSolicitada = normalizeOccurrenceView(searchParams.get("view"));
  const view = viewsPermitidas.includes(viewSolicitada) ? viewSolicitada : "lancamento";

  const [competencia, setCompetenciaState] = useState(currentCompetencia());
  const draft = useOccurrenceDraft({
    competencia, registros: data.registros, registrosLoading: data.registrosLoading,
    salvarApuracaoMensal: data.salvarApuracaoMensal,
  });
  const filtersState = useOccurrenceFilters({ funcionarios: data.funcionariosAtivos, baseline: draft.baseline, draft: draft.draft });
  const selection = useEmployeeSelection();

  const [pendingAction, setPendingAction] = useState<null | { kind: "view"; value: OccurrenceView } | { kind: "competencia"; value: string }>(null);

  // Proteção contra perda ao fechar/recarregar a aba com alterações não salvas.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!draft.isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [draft.isDirty]);

  const setView = (v: OccurrenceView) => {
    if (!viewsPermitidas.includes(v)) return;
    if (draft.isDirty) { setPendingAction({ kind: "view", value: v }); return; }
    const sp = new URLSearchParams(searchParams);
    sp.set("view", v);
    setSearchParams(sp);
  };

  const setCompetencia = (comp: string) => {
    if (draft.isDirty) { setPendingAction({ kind: "competencia", value: comp }); return; }
    setCompetenciaState(comp);
  };

  const confirmPendingDiscard = () => {
    if (!pendingAction) return;
    draft.restoreAll();
    if (pendingAction.kind === "view") {
      const sp = new URLSearchParams(searchParams);
      sp.set("view", pendingAction.value);
      setSearchParams(sp);
    } else {
      setCompetenciaState(pendingAction.value);
    }
    setPendingAction(null);
  };

  if (data.loading && data.funcionarios.length === 0) return <OccurrencesSkeleton />;

  const pageProps: OccurrencePageProps = { data, draft, filtersState, selection, competencia, setCompetencia };

  const renderView = () => {
    switch (view) {
      case "analise": return <PeriodAnalysisView {...pageProps} />;
      case "historico": return <OccurrencesHistoryView {...pageProps} />;
      case "importacoes": return <OccurrencesImportView {...pageProps} />;
      default: return <MonthlyEntryView {...pageProps} />;
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-[18px]">
      <OccurrencesHeader
        competencia={competencia}
        funcionariosCount={data.funcionariosAtivos.length}
        lastSaved={draft.lastSaved}
        isDirty={draft.isDirty}
        changedCount={draft.diff.totalFuncionariosAlterados}
        saving={draft.saving}
        onImport={() => setView("importacoes")}
        onSave={draft.save}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <OccurrencesNavigation active={view} onChange={setView} disponiveis={viewsPermitidas} />
          <CompetenciaPicker value={competencia} onChange={setCompetencia} />
        </div>
      </OccurrencesHeader>

      {data.funcionariosAtivos.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum funcionário ativo encontrado" description="Verifique os funcionários com status ativo no cadastro de pessoas." />
      ) : (
        <div key={view} className="animate-in fade-in slide-in-from-right-2 duration-200 motion-reduce:animate-none">
          {renderView()}
        </div>
      )}

      <AlertDialog open={!!pendingAction} onOpenChange={(o) => { if (!o) setPendingAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Há {draft.diff.totalFuncionariosAlterados} funcionário(s) alterado(s) nesta competência que ainda não foram salvos.
              {pendingAction?.kind === "view" ? " Trocar de visão" : " Trocar de competência"} descartará essas alterações. Deseja continuar?
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
