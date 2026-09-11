import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PackageCheck, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useKitsConfigs } from '../hooks/useKitsConfigs';
import { normalizeKitsConfigView } from '../views';
import type { KitsConfigView } from '../views';
import { KitsConfigHeader } from './KitsConfigHeader';
import { KitsConfigNavigation } from './KitsConfigNavigation';
import { KitsConfigSkeleton } from './KitsConfigSkeleton';
import { KitsConfigDrawer } from './KitsConfigDrawer';
import { KitsConfigEditor } from './KitsConfigEditor';
import { KitsConfigComparisonDialog } from './KitsConfigComparisonDialog';
import { KitsConfigDeleteDialog } from './KitsConfigDeleteDialog';
import { KitsBonusSimulator } from './KitsBonusSimulator';
import { KitsConfigEmptyState } from './KitsConfigEmptyState';
import { KitsConfigRulesView } from '../pages/KitsConfigRulesView';
import type { KitsConfigRowHandlers } from './KitsConfigTimelineItem';
import type { KitsEditorInit } from '../hooks/useKitsConfigEditor';
import type { KitsConfigRow } from '../types/kits-config.types';
import { useResourceAccess } from '@/hooks/useResourceAccess';

/**
 * Central de Regras de Premiação por Kits — 2 visões (?view=regras|simulador).
 * Shell único: dados uma vez, hospeda editor (2 etapas), drawer, comparação e
 * exclusão. Simulador e prévias usam o motor real (calcularComissao). Não altera
 * o motor nem o banco; exclusão soft e protegida.
 */
export function KitsConfigShell() {
  const acesso = useResourceAccess('cad_configuracoes_kits');
  const data = useKitsConfigs();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = normalizeKitsConfigView(searchParams.get('view'));

  const [drawer, setDrawer] = useState<KitsConfigRow | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInit, setEditorInit] = useState<KitsEditorInit>({ editing: null });
  const [comparison, setComparison] = useState<KitsConfigRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KitsConfigRow | null>(null);
  const [simConfigId, setSimConfigId] = useState<string | null>(null);
  const [seed, setSeed] = useState(0);

  const setView = (v: KitsConfigView) => { const sp = new URLSearchParams(searchParams); sp.set('view', v); setSearchParams(sp); };
  const nextSeed = () => { const s = seed + 1; setSeed(s); return String(s); };

  const openNova = () => { setEditorInit({ editing: null, seed: nextSeed() }); setEditorOpen(true); };
  const openEdit = (r: KitsConfigRow) => { setDrawer(null); setEditorInit({ editing: r, seed: nextSeed() }); setEditorOpen(true); };
  const openNovaVigencia = (r: KitsConfigRow) => { setDrawer(null); setEditorInit({ editing: null, presetFrom: r, seed: nextSeed() }); setEditorOpen(true); };
  const simular = (r: KitsConfigRow) => { setDrawer(null); setSimConfigId(r.id); setView('simulador'); };
  const comparar = (r: KitsConfigRow) => { setDrawer(null); setComparison(r); };

  const handlers: KitsConfigRowHandlers = {
    onOpen: setDrawer, onSimular: simular, onEdit: openEdit, onComparar: comparar,
    onNovaVigencia: openNovaVigencia, onVerUtilizacao: setDrawer, onDelete: setDeleteTarget,
  };

  if (data.loading && data.rows.length === 0) return <KitsConfigSkeleton />;

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-[18px]">
      <KitsConfigHeader onNovaConfig={openNova}>
        <KitsConfigNavigation active={view} onChange={setView} />
      </KitsConfigHeader>

      {data.rows.length === 0 ? (
        <KitsConfigEmptyState
          icon={PackageCheck}
          title="Nenhuma configuração cadastrada"
          description="Cadastre a primeira regra de bônus por kits (vigência, mínimo, incremento e bônus)."
          action={acesso.podeCriar ? <Button size="sm" className="gap-1.5" onClick={openNova}><Plus className="h-4 w-4" /> Nova configuração</Button> : undefined}
        />
      ) : (
        <div key={view} className="animate-in fade-in slide-in-from-right-2 duration-200 motion-reduce:animate-none">
          {view === 'simulador' ? (
            <KitsBonusSimulator rows={data.rows} initialConfigId={simConfigId} />
          ) : (
            <KitsConfigRulesView rows={data.rows} atual={data.atual} proxima={data.proxima} handlers={handlers} onNovaVigencia={openNova} />
          )}
        </div>
      )}

      <KitsConfigDrawer
        row={drawer} onClose={() => setDrawer(null)}
        onSimular={simular} onNovaVigencia={openNovaVigencia} onComparar={comparar} onVerUtilizacao={setDrawer}
      />

      <KitsConfigEditor
        open={editorOpen} onOpenChange={setEditorOpen} init={editorInit}
        atual={data.atual} competenciaAtual={data.competenciaAtual}
        findByVigencia={data.findByVigencia} retroFor={data.retroFor}
        onCreate={async (payload) => { await data.createConfiguracao(payload); }}
        onUpdate={async (id, payload) => { await data.updateConfiguracao(id, payload); }}
        onOpenExisting={(r) => { setEditorOpen(false); setDrawer(r); }}
      />

      <KitsConfigComparisonDialog a={comparison} all={data.rows} onOpenChange={(o) => { if (!o) setComparison(null); }} />

      <KitsConfigDeleteDialog
        row={deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        onConfirm={async (r) => { await data.deleteConfiguracao(r.id); }}
        onNovaVigencia={openNovaVigencia}
      />
    </div>
  );
}
