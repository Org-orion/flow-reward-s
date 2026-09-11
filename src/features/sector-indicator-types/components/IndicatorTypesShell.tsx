import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gauge, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/app/SectionCard';
import { useIndicatorTypes } from '../hooks/useIndicatorTypes';
import { useIndicatorTypeFilters } from '../hooks/useIndicatorTypeFilters';
import { computeIndicatorTypeSummary } from '../domain/indicatorTypeFilters';
import { IndicatorTypesHeader } from './IndicatorTypesHeader';
import { IndicatorTypesSummary } from './IndicatorTypesSummary';
import { IndicatorTypesFilters } from './IndicatorTypesFilters';
import { IndicatorTypesTable, type IndicatorTypeRowHandlers } from './IndicatorTypesTable';
import { IndicatorTypeDrawer } from './IndicatorTypeDrawer';
import { IndicatorTypeForm, type IndicatorTypeFormPayload } from './IndicatorTypeForm';
import { IndicatorTypeDeleteDialog } from './IndicatorTypeDeleteDialog';
import { IndicatorTypesSkeleton } from './IndicatorTypesSkeleton';
import { IndicatorTypesEmptyState } from './IndicatorTypesEmptyState';
import type { IndicatorTypeRow } from '../types/indicator-type.types';
import { useResourceAccess } from '@/hooks/useResourceAccess';

/**
 * Gestão de Indicadores Setoriais — página única. Shell orquestrador: carrega dados
 * uma vez, hospeda tabela/drawer/formulário/exclusão e navegação para as medições.
 * Exclusão soft, bloqueada com medições. Não altera o banco nem o motor. Distinto
 * dos indicadores GERAIS.
 */
export function IndicatorTypesShell() {
  const acesso = useResourceAccess('cad_tipos_indicadores');
  const data = useIndicatorTypes();
  const navigate = useNavigate();
  const state = useIndicatorTypeFilters(data.rows);
  const summary = useMemo(() => computeIndicatorTypeSummary(data.rows), [data.rows]);

  const [drawer, setDrawer] = useState<IndicatorTypeRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IndicatorTypeRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IndicatorTypeRow | null>(null);

  const openNovo = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (r: IndicatorTypeRow) => { setDrawer(null); setEditing(r); setFormOpen(true); };
  // Medições vivem em colunas fixas por setor/competência (não há filtro por tipo
  // na tela de destino). Abre a tela de medições sem parâmetro ignorado.
  const verMedicoes = (_r: IndicatorTypeRow) => navigate('/premiacoes/indicadores-setor');

  const handlers: IndicatorTypeRowHandlers = {
    onOpen: setDrawer, onEdit: openEdit, onVerMedicoes: verMedicoes, onDelete: setDeleteTarget,
  };

  const onCreate = async (payload: IndicatorTypeFormPayload) => { await data.createTipoIndicador({ codigo: payload.codigo, nome: payload.nome, descricao: payload.descricao ?? undefined, ativo: true }); };
  const onUpdate = async (id: string, payload: IndicatorTypeFormPayload) => { await data.updateTipoIndicador(id, { nome: payload.nome, descricao: payload.descricao ?? undefined }); };

  if (data.loading && data.rows.length === 0) return <IndicatorTypesSkeleton />;

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-[18px]">
      <IndicatorTypesHeader onNovo={openNovo} />

      {data.rows.length === 0 ? (
        <IndicatorTypesEmptyState
          icon={Gauge}
          title="Nenhum tipo de indicador cadastrado"
          description="Cadastre os indicadores usados na medição de desempenho dos setores."
          action={acesso.podeCriar ? <Button size="sm" className="gap-1.5" onClick={openNovo}><Plus className="h-4 w-4" /> Novo tipo de indicador</Button> : undefined}
        />
      ) : (
        <>
          <IndicatorTypesSummary summary={summary} onFilter={state.setFilters} />
          <SectionCard title="Indicadores setoriais" description="Catálogo dos indicadores de desempenho e sua utilização nas medições.">
            <div className="space-y-4">
              <IndicatorTypesFilters filters={state.filters} onChange={state.setFilters} onReset={state.resetFilters} searchInput={state.searchInput} onSearchChange={state.setSearchInput} activeCount={state.activeCount} />
              <IndicatorTypesTable rows={state.filtered} handlers={handlers} />
              <p className="text-xs text-muted-foreground">Mostrando {state.filtered.length} de {data.rows.length} indicadores.</p>
            </div>
          </SectionCard>
        </>
      )}

      <IndicatorTypeDrawer row={drawer} onClose={() => setDrawer(null)} onEdit={openEdit} onVerMedicoes={verMedicoes} />

      <IndicatorTypeForm
        open={formOpen} onOpenChange={setFormOpen} editing={editing}
        findByCodigo={data.findByCodigo} onCreate={onCreate} onUpdate={onUpdate}
        onOpenExisting={(r) => { setFormOpen(false); setDrawer(r); }}
      />

      <IndicatorTypeDeleteDialog
        row={deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        onConfirm={async (r) => { await data.deleteTipoIndicador(r.id); }}
        onVerMedicoes={verMedicoes}
      />
    </div>
  );
}
