import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useEpiData } from "@/features/epi/hooks/useEpiData";
import { useEpiAudit } from "@/features/epi/hooks/useEpiAudit";
import { useEpiIndicators } from "@/features/epi/hooks/useEpiIndicators";
import { normalizeEpiView, type EpiView } from "@/features/epi/views";

import { EpiHeader } from "@/components/epi/EpiHeader";
import { EpiNavigation } from "@/components/epi/EpiNavigation";
import { EpiSkeleton } from "@/components/epi/EpiSkeleton";

import { EpiNewAuditView } from "@/components/epi/pages/EpiNewAuditView";
import { EpiNonConformitiesView } from "@/components/epi/pages/EpiNonConformitiesView";
import { EpiHistoryView } from "@/components/epi/pages/EpiHistoryView";
import { EpiIndicatorsView } from "@/components/epi/pages/EpiIndicatorsView";
import type { EpiPageProps } from "@/components/epi/pages/_shared";
import { useResourceAccess } from "@/hooks/useResourceAccess";

/**
 * Central de Auditoria e Conformidade de EPI — experiência paginada (4 visões).
 * Shell único: carrega os dados uma vez, mantém a auditoria em andamento e
 * protege contra perda de alterações não salvas ao trocar de visão.
 */
export const EPI = () => {
  const data = useEpiData();
  const [searchParams, setSearchParams] = useSearchParams();

  // Permissões desta tela (ver src/config/permissions.ts).
  const acesso = useResourceAccess("epi");
  const viewsPermitidas = useMemo<EpiView[]>(() => {
    const vs: EpiView[] = [];
    if (acesso.podeCriar) vs.push("auditoria");
    vs.push("nao-conformidades", "historico", "indicadores");
    return vs;
  }, [acesso.podeCriar]);

  // Visão pedida na URL que o usuário não pode abrir cai na primeira permitida.
  const viewSolicitada = normalizeEpiView(searchParams.get("view"));
  const view = viewsPermitidas.includes(viewSolicitada) ? viewSolicitada : viewsPermitidas[0];

  const [pendingView, setPendingView] = useState<EpiView | null>(null);

  const setView = (v: EpiView) => {
    if (!viewsPermitidas.includes(v)) return;
    const sp = new URLSearchParams(searchParams);
    sp.set("view", v);
    setSearchParams(sp);
  };

  const audit = useEpiAudit({
    funcionarios: data.funcionarios,
    saveAuditoria: data.saveAuditoria,
    onSaved: () => setView("historico"),
  });
  const indicators = useEpiIndicators(data.auditGroups, data.funcionariosById, data.setores);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!audit.isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [audit.isDirty]);

  const goToView = (v: EpiView) => {
    if (view === "auditoria" && audit.isDirty && v !== "auditoria") {
      setPendingView(v);
      return;
    }
    setView(v);
  };

  const confirmPendingDiscard = () => {
    if (!pendingView) return;
    audit.reset();
    setView(pendingView);
    setPendingView(null);
  };

  if (data.loading && data.funcionarios.length === 0) return <EpiSkeleton />;

  const pageProps: EpiPageProps = {
    data, audit, indicators,
    onCancelAudit: () => { audit.reset(); },
    onGoToView: goToView,
  };

  const renderView = () => {
    switch (view) {
      case "nao-conformidades": return <EpiNonConformitiesView {...pageProps} />;
      case "historico": return <EpiHistoryView {...pageProps} />;
      case "indicadores": return <EpiIndicatorsView {...pageProps} />;
      default: return <EpiNewAuditView {...pageProps} />;
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-[18px]">
      <EpiHeader>
        <EpiNavigation active={view} onChange={goToView} disponiveis={viewsPermitidas} />
      </EpiHeader>

      <div key={view} className="animate-in fade-in slide-in-from-right-2 duration-200 motion-reduce:animate-none">
        {renderView()}
      </div>

      <AlertDialog open={!!pendingView} onOpenChange={(o) => { if (!o) setPendingView(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Há uma auditoria de EPI em andamento que ainda não foi salva. Trocar de visão descartará essas alterações. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingView(null)}>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPendingDiscard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Descartar e continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
