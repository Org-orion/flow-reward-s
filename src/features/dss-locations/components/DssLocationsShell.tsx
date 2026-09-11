import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/app/SectionCard';
import { useDssLocations } from '../hooks/useDssLocations';
import { useDssLocationFilters } from '../hooks/useDssLocationFilters';
import { computeDssLocationContext } from '../domain/dssLocationFilters';
import { DssLocationsHeader } from './DssLocationsHeader';
import { DssLocationsContext } from './DssLocationsContext';
import { DssLocationsFilters } from './DssLocationsFilters';
import { DssLocationsTable, type DssLocationRowHandlers } from './DssLocationsTable';
import { DssLocationDrawer } from './DssLocationDrawer';
import { DssLocationForm, type DssLocationFormPayload } from './DssLocationForm';
import { DssLocationDeleteDialog } from './DssLocationDeleteDialog';
import { DssLocationsSkeleton } from './DssLocationsSkeleton';
import { DssLocationsEmptyState } from './DssLocationsEmptyState';
import type { DssLocationRow } from '../types/dss-location.types';
import { useResourceAccess } from '@/hooks/useResourceAccess';

/**
 * Gestão de Locais de DSS — página única. Shell orquestrador: carrega dados uma
 * vez, hospeda tabela/drawer/formulário/exclusão e navegação para Funcionários
 * (?localDss=) e DSS (?view=). Exclusão soft, bloqueada com vínculos. Não altera
 * o banco nem o motor.
 */
export function DssLocationsShell() {
  const acesso = useResourceAccess('cad_locais_dss');
  const data = useDssLocations();
  const navigate = useNavigate();
  const state = useDssLocationFilters(data.rows);
  const context = useMemo(() => computeDssLocationContext(data.rows, data.funcionariosSemLocal), [data.rows, data.funcionariosSemLocal]);

  const [drawer, setDrawer] = useState<DssLocationRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DssLocationRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DssLocationRow | null>(null);

  const openNovo = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (r: DssLocationRow) => { setDrawer(null); setEditing(r); setFormOpen(true); };
  const verFuncionarios = (r: DssLocationRow) => navigate(`/premiacoes/funcionarios?localDss=${encodeURIComponent(r.id)}`);
  const verSemLocal = () => navigate('/premiacoes/funcionarios?localDss=__sem_local__');
  const registrarDss = (_r: DssLocationRow) => navigate('/premiacoes/dss?view=registro');
  const verHistorico = (_r: DssLocationRow) => navigate('/premiacoes/dss?view=historico');

  const handlers: DssLocationRowHandlers = {
    onOpen: setDrawer, onEdit: openEdit, onVerFuncionarios: verFuncionarios,
    onRegistrarDss: registrarDss, onVerHistorico: verHistorico, onDelete: setDeleteTarget,
  };

  const onCreate = async (payload: DssLocationFormPayload) => { await data.createLocal({ nome: payload.nome, descricao: payload.descricao ?? undefined, ativo: true }); };
  const onUpdate = async (id: string, payload: DssLocationFormPayload) => { await data.updateLocal(id, { nome: payload.nome, descricao: payload.descricao ?? undefined }); };

  if (data.loading && data.rows.length === 0) return <DssLocationsSkeleton />;

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-[18px]">
      <DssLocationsHeader onNovo={openNovo} />

      {data.rows.length === 0 ? (
        <DssLocationsEmptyState
          icon={MapPin}
          title="Nenhum local de DSS cadastrado"
          description="Cadastre locais para organizar o controle de presença dos DSS."
          action={acesso.podeCriar ? <Button size="sm" className="gap-1.5" onClick={openNovo}><Plus className="h-4 w-4" /> Novo local</Button> : undefined}
        />
      ) : (
        <>
          <DssLocationsContext context={context} onSemLocal={verSemLocal} />
          <SectionCard title="Locais de DSS" description="Locais/grupos de presença, cobertura e histórico.">
            <div className="space-y-4">
              <DssLocationsFilters filters={state.filters} onChange={state.setFilters} onReset={state.resetFilters} searchInput={state.searchInput} onSearchChange={state.setSearchInput} activeCount={state.activeCount} />
              <DssLocationsTable rows={state.filtered} handlers={handlers} />
              <p className="text-xs text-muted-foreground">Mostrando {state.filtered.length} de {data.rows.length} locais.</p>
            </div>
          </SectionCard>
        </>
      )}

      <DssLocationDrawer
        row={drawer} onClose={() => setDrawer(null)}
        onEdit={openEdit} onVerFuncionarios={verFuncionarios} onRegistrarDss={registrarDss} onVerHistorico={verHistorico}
      />

      <DssLocationForm
        open={formOpen} onOpenChange={setFormOpen} editing={editing}
        findDuplicate={data.findDuplicate} onCreate={onCreate} onUpdate={onUpdate}
        onOpenExisting={(r) => { setFormOpen(false); setDrawer(r); }}
      />

      <DssLocationDeleteDialog
        row={deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        onConfirm={async (r) => { await data.deleteLocal(r.id); }}
        onVerFuncionarios={verFuncionarios}
        onVerHistorico={verHistorico}
      />
    </div>
  );
}
