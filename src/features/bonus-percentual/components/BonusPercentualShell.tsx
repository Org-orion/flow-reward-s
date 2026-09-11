import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Percent, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/app/EmptyState';
import { useBonusPercentualConfigs } from '../hooks/useBonusPercentualConfigs';
import { normalizeBonusPercentualView, type BonusPercentualView } from '../views';
import { BonusPercentualHeader } from './BonusPercentualHeader';
import { BonusPercentualNavigation } from './BonusPercentualNavigation';
import { BonusPercentualNotice } from './BonusPercentualNotice';
import { BonusPercentualSkeleton } from './BonusPercentualSkeleton';
import { BonusPercentualDrawer } from './BonusPercentualDrawer';
import { BonusPercentualEditor } from './BonusPercentualEditor';
import { BonusPercentualDeleteDialog } from './BonusPercentualDeleteDialog';
import { BonusPercentualSimulator } from './BonusPercentualSimulator';
import { BonusPercentualRulesView } from '../pages/BonusPercentualRulesView';
import type { BonusPercentualRowHandlers } from './BonusPercentualTimelineItem';
import type { BonusPercentualEditorInit } from '../hooks/useBonusPercentualEditor';
import type { BonusPercentualRow } from '../types/bonus-percentual.types';
import { useResourceAccess } from '@/hooks/useResourceAccess';

/**
 * Central de Bônus Percentual por Kits — 2 visões (?view=regras|simulador).
 * Shell único: carrega os dados uma vez e hospeda editor (2 etapas), drawer e
 * exclusão. Todo cálculo vem de `domain/bonusPercentualCalculo` (percentual como
 * grandeza primária). Exclusão é soft.
 */
export function BonusPercentualShell() {
  const acesso = useResourceAccess('cad_bonus_percentual');
  const data = useBonusPercentualConfigs();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = normalizeBonusPercentualView(searchParams.get('view'));

  const [drawer, setDrawer] = useState<BonusPercentualRow | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInit, setEditorInit] = useState<BonusPercentualEditorInit>({ editing: null });
  const [deleteTarget, setDeleteTarget] = useState<BonusPercentualRow | null>(null);
  const [simConfigId, setSimConfigId] = useState<string | null>(null);
  const [seed, setSeed] = useState(0);

  const setView = (v: BonusPercentualView) => { const sp = new URLSearchParams(searchParams); sp.set('view', v); setSearchParams(sp); };
  const nextSeed = () => { const s = seed + 1; setSeed(s); return String(s); };

  const openNova = () => { setEditorInit({ editing: null, seed: nextSeed() }); setEditorOpen(true); };
  const openEdit = (r: BonusPercentualRow) => { setDrawer(null); setEditorInit({ editing: r, seed: nextSeed() }); setEditorOpen(true); };
  const openNovaVigencia = (r: BonusPercentualRow) => { setDrawer(null); setEditorInit({ editing: null, presetFrom: r, seed: nextSeed() }); setEditorOpen(true); };
  const simular = (r: BonusPercentualRow) => { setDrawer(null); setSimConfigId(r.id); setView('simulador'); };

  const handlers: BonusPercentualRowHandlers = {
    onOpen: setDrawer, onSimular: simular, onEdit: openEdit, onNovaVigencia: openNovaVigencia, onDelete: setDeleteTarget,
  };

  if (data.loading && data.rows.length === 0) return <BonusPercentualSkeleton />;

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-[18px]">
      <BonusPercentualHeader onNovaConfig={openNova}>
        <BonusPercentualNavigation active={view} onChange={setView} />
      </BonusPercentualHeader>

      <BonusPercentualNotice rows={data.rows} />

      {data.rows.length === 0 ? (
        <EmptyState
          icon={Percent}
          title="Nenhuma configuração cadastrada"
          description="Cadastre a primeira regra: meta de kits, bônus da meta, tamanho do bloco e valor equivalente a 100%."
          action={acesso.podeCriar ? <Button size="sm" className="gap-1.5" onClick={openNova}><Plus className="h-4 w-4" /> Nova configuração</Button> : undefined}
        />
      ) : (
        <div key={view} className="animate-in fade-in slide-in-from-right-2 duration-200 motion-reduce:animate-none">
          {view === 'simulador' ? (
            <BonusPercentualSimulator rows={data.rows} initialConfigId={simConfigId} />
          ) : (
            <BonusPercentualRulesView rows={data.rows} atual={data.atual} proxima={data.proxima} handlers={handlers} onNovaVigencia={openNova} />
          )}
        </div>
      )}

      <BonusPercentualDrawer row={drawer} onClose={() => setDrawer(null)} onSimular={simular} onNovaVigencia={openNovaVigencia} />

      <BonusPercentualEditor
        open={editorOpen} onOpenChange={setEditorOpen} init={editorInit}
        atual={data.atual} competenciaAtual={data.competenciaAtual}
        findByVigencia={data.findByVigencia} retroFor={data.retroFor}
        onCreate={async (payload) => { await data.createConfiguracao(payload); }}
        onUpdate={async (id, payload) => { await data.updateConfiguracao(id, payload); }}
        onOpenExisting={(r) => { setEditorOpen(false); setDrawer(r); }}
      />

      <BonusPercentualDeleteDialog
        row={deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        onConfirm={async (r) => { await data.deleteConfiguracao(r.id); }}
        onNovaVigencia={openNovaVigencia}
      />
    </div>
  );
}
