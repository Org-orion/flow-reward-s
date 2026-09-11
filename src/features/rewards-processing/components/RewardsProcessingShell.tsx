import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRewardsProcessing } from '../hooks/useRewardsProcessing';
import { normalizeRewardsView, type RewardsView } from '../views';
import { RewardsProcessingHeader } from './RewardsProcessingHeader';
import { RewardsProcessingNavigation } from './RewardsProcessingNavigation';
import { RewardsSkeleton } from './RewardsSkeleton';
import { NewRewardsProcessingView, type ProcessingSeed } from '../pages/NewRewardsProcessingView';
import { RewardsProcessingsView } from '../pages/RewardsProcessingsView';
import { RewardsIssuesView } from '../pages/RewardsIssuesView';
import { useResourceAccess } from '@/hooks/useResourceAccess';

/**
 * Central de Processamento de Premiações — 3 visões (?view=novo|processamentos|
 * inconsistencias). Shell único: carrega as fontes uma vez e orquestra o fluxo
 * Validar → Simular → Revisar → Confirmar → Processar. Não duplica o motor nem
 * o relatório (apenas navega para o relatório existente).
 */
export function RewardsProcessingShell() {
  const data = useRewardsProcessing();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [seed, setSeed] = useState<ProcessingSeed | null>(null);

  // Permissões desta tela (ver src/config/permissions.ts). "Novo Processamento"
  // é a ação de processar; sem ela sobram as visões de consulta.
  const acesso = useResourceAccess('gerar_premiacoes');
  const viewsPermitidas = useMemo<RewardsView[]>(() => {
    const vs: RewardsView[] = [];
    if (acesso.pode('processar')) vs.push('novo');
    vs.push('processamentos', 'inconsistencias');
    return vs;
  }, [acesso]);

  const viewSolicitada = normalizeRewardsView(searchParams.get('view'));
  const view = viewsPermitidas.includes(viewSolicitada) ? viewSolicitada : viewsPermitidas[0];

  const setView = (v: RewardsView) => {
    if (!viewsPermitidas.includes(v)) return;
    const sp = new URLSearchParams(searchParams); sp.set('view', v); setSearchParams(sp);
  };

  const openReport = (p?: { competencia?: string; baseId?: string }) => {
    const sp = new URLSearchParams();
    if (p?.competencia) sp.set('competencia', p.competencia);
    if (p?.baseId) sp.set('baseId', p.baseId);
    const qs = sp.toString();
    navigate(`/premiacoes/relatorio-premiacoes${qs ? `?${qs}` : ''}`);
  };

  const onSeedConsumed = useCallback(() => setSeed(null), []);
  const reprocess = (s: ProcessingSeed) => { setSeed(s); setView('novo'); };

  if (data.loading && data.bases.length === 0) return <RewardsSkeleton />;

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-[18px]">
      <RewardsProcessingHeader onOpenReport={() => openReport()}>
        <RewardsProcessingNavigation active={view} onChange={setView} disponiveis={viewsPermitidas} />
      </RewardsProcessingHeader>

      <div key={view} className="animate-in fade-in slide-in-from-right-2 duration-200 motion-reduce:animate-none">
        {view === 'processamentos' ? (
          <RewardsProcessingsView data={data} onReprocess={reprocess} onOpenReport={openReport} />
        ) : view === 'inconsistencias' ? (
          <RewardsIssuesView data={data} />
        ) : (
          <NewRewardsProcessingView data={data} seed={seed} onSeedConsumed={onSeedConsumed} onOpenReport={openReport} onGoProcessamentos={() => setView('processamentos')} />
        )}
      </div>
    </div>
  );
}
