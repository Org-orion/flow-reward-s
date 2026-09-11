import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useDssData } from "@/features/dss/hooks/useDssData";
import { useDssRegistration } from "@/features/dss/hooks/useDssRegistration";
import { useDssIndicators } from "@/features/dss/hooks/useDssIndicators";
import { normalizeDssView, type DssView } from "@/features/dss/views";

import { DssHeader } from "@/components/dss/DssHeader";
import { DssNavigation } from "@/components/dss/DssNavigation";
import { DssSkeleton } from "@/components/dss/DssSkeleton";

import { DssRegistrationView } from "@/components/dss/pages/DssRegistrationView";
import { DssHistoryView } from "@/components/dss/pages/DssHistoryView";
import { DssIndicatorsView } from "@/components/dss/pages/DssIndicatorsView";
import type { DssPageProps } from "@/components/dss/pages/_shared";
import { useResourceAccess } from "@/hooks/useResourceAccess";

/**
 * Central de Gestão de DSS — experiência paginada (3 visões).
 * Shell único: carrega os dados uma vez, mantém o registro em andamento e
 * protege contra perda de alterações não salvas ao trocar de visão.
 */
export const DSS = () => {
  const data = useDssData();
  const [searchParams, setSearchParams] = useSearchParams();

  // Permissões desta tela (ver src/config/permissions.ts).
  const acesso = useResourceAccess("dss");
  const viewsPermitidas = useMemo<DssView[]>(() => {
    const vs: DssView[] = [];
    if (acesso.podeCriar) vs.push("registro");
    vs.push("historico", "indicadores");
    return vs;
  }, [acesso.podeCriar]);

  // Visão pedida na URL que o usuário não pode abrir cai na primeira permitida.
  const viewSolicitada = normalizeDssView(searchParams.get("view"));
  const view = viewsPermitidas.includes(viewSolicitada) ? viewSolicitada : viewsPermitidas[0];

  const registration = useDssRegistration({
    funcionarios: data.funcionarios,
    createDSS: data.createDSS,
    updateDSS: data.updateDSS,
  });
  const indicators = useDssIndicators(data.dssRecords, data.funcionarios);

  const [pendingView, setPendingView] = useState<DssView | null>(null);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!registration.isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [registration.isDirty]);

  const setView = (v: DssView) => {
    if (!viewsPermitidas.includes(v)) return;
    if (view === "registro" && registration.isDirty && v !== "registro") {
      setPendingView(v);
      return;
    }
    const sp = new URLSearchParams(searchParams);
    sp.set("view", v);
    setSearchParams(sp);
  };

  const confirmPendingDiscard = () => {
    if (!pendingView) return;
    registration.reset();
    const sp = new URLSearchParams(searchParams);
    sp.set("view", pendingView);
    setSearchParams(sp);
    setPendingView(null);
  };

  if (data.loading && data.funcionarios.length === 0) return <DssSkeleton />;

  const pageProps: DssPageProps = {
    data, registration, indicators,
    onCancelRegistration: () => { registration.reset(); },
    onGoToView: setView,
  };

  const renderView = () => {
    switch (view) {
      case "historico": return <DssHistoryView {...pageProps} />;
      case "indicadores": return <DssIndicatorsView {...pageProps} />;
      default: return <DssRegistrationView {...pageProps} />;
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-[18px]">
      <DssHeader>
        <DssNavigation active={view} onChange={setView} disponiveis={viewsPermitidas} />
      </DssHeader>

      <div key={view} className="animate-in fade-in slide-in-from-right-2 duration-200 motion-reduce:animate-none">
        {renderView()}
      </div>

      <AlertDialog open={!!pendingView} onOpenChange={(o) => { if (!o) setPendingView(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Há um registro de DSS em andamento que ainda não foi salvo. Trocar de visão descartará essas alterações. Deseja continuar?
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
