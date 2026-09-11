import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/app/SectionCard';
import { useGeneralIndicatorTypes } from '../hooks/useGeneralIndicatorTypes';
import { useGeneralIndicatorTypeFilters } from '../hooks/useGeneralIndicatorTypeFilters';
import { computeGeneralIndicatorTypeContext } from '../domain/generalIndicatorTypeFilters';
import { GeneralIndicatorTypesHeader } from './GeneralIndicatorTypesHeader';
import { GeneralIndicatorTypesContext } from './GeneralIndicatorTypesContext';
import { GeneralIndicatorTypesFilters } from './GeneralIndicatorTypesFilters';
import { GeneralIndicatorTypesTable, type GeneralIndicatorTypeRowHandlers } from './GeneralIndicatorTypesTable';
import { GeneralIndicatorTypeDrawer } from './GeneralIndicatorTypeDrawer';
import { GeneralIndicatorTypeForm, type GeneralIndicatorTypeFormPayload } from './GeneralIndicatorTypeForm';
import { GeneralIndicatorTypeStatusDialog } from './GeneralIndicatorTypeStatusDialog';
import { GeneralIndicatorTypeDeleteDialog } from './GeneralIndicatorTypeDeleteDialog';
import { GeneralIndicatorTypesSkeleton } from './GeneralIndicatorTypesSkeleton';
import { GeneralIndicatorTypesEmptyState } from './GeneralIndicatorTypesEmptyState';
import type { GeneralIndicatorTypeRow } from '../types/general-indicator-type.types';
import { useResourceAccess } from '@/hooks/useResourceAccess';

/**
 * Gestão de Indicadores Gerais — página única. Shell orquestrador: carrega dados
 * uma vez, hospeda tabela/drawer/formulário/status/exclusão e navegação para as
 * medições. Ativar/Inativar é suportado (ciclo real). Exclusão é hard, bloqueada
 * com medições. Não altera o banco nem o motor. Distinto dos SETORIAIS.
 */
export function GeneralIndicatorTypesShell() {
  const acesso = useResourceAccess('cad_tipos_indicadores_gerais');
  const data = useGeneralIndicatorTypes();
  const navigate = useNavigate();
  const state = useGeneralIndicatorTypeFilters(data.rows);
  const context = useMemo(() => computeGeneralIndicatorTypeContext(data.rows), [data.rows]);

  const [drawer, setDrawer] = useState<GeneralIndicatorTypeRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GeneralIndicatorTypeRow | null>(null);
  const [statusTarget, setStatusTarget] = useState<GeneralIndicatorTypeRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GeneralIndicatorTypeRow | null>(null);

  const openNovo = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (r: GeneralIndicatorTypeRow) => { setDrawer(null); setEditing(r); setFormOpen(true); };
  // A tela de Indicadores Gerais não filtra por tipo via URL — abre sem parâmetro ignorado.
  const verMedicoes = (_r: GeneralIndicatorTypeRow) => navigate('/premiacoes/indicadores-gerais');

  const handlers: GeneralIndicatorTypeRowHandlers = {
    onOpen: setDrawer, onEdit: openEdit, onVerMedicoes: verMedicoes, onToggleStatus: setStatusTarget, onDelete: setDeleteTarget,
  };

  const onCreate = async (payload: GeneralIndicatorTypeFormPayload) => { await data.createTipoIndicador({ codigo: payload.codigo, nome: payload.nome, descricao: payload.descricao ?? undefined, ativo: true }); };
  const onUpdate = async (id: string, payload: GeneralIndicatorTypeFormPayload) => { await data.updateTipoIndicador(id, { nome: payload.nome, descricao: payload.descricao ?? undefined }); };

  if (data.loading && data.rows.length === 0) return <GeneralIndicatorTypesSkeleton />;

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-[18px]">
      <GeneralIndicatorTypesHeader onNovo={openNovo} />

      {data.rows.length === 0 ? (
        <GeneralIndicatorTypesEmptyState
          icon={BarChart3}
          title="Nenhum indicador geral cadastrado"
          description="Cadastre os indicadores consolidados usados na avaliação da empresa."
          action={acesso.podeCriar ? <Button size="sm" className="gap-1.5" onClick={openNovo}><Plus className="h-4 w-4" /> Novo indicador geral</Button> : undefined}
        />
      ) : (
        <>
          <GeneralIndicatorTypesContext context={context} />
          <SectionCard title="Indicadores gerais" description="Indicadores consolidados da empresa e sua utilização.">
            <div className="space-y-4">
              <GeneralIndicatorTypesFilters filters={state.filters} onChange={state.setFilters} onReset={state.resetFilters} searchInput={state.searchInput} onSearchChange={state.setSearchInput} activeCount={state.activeCount} />
              <GeneralIndicatorTypesTable rows={state.filtered} handlers={handlers} />
              <p className="text-xs text-muted-foreground">Mostrando {state.filtered.length} de {data.rows.length} indicadores.</p>
            </div>
          </SectionCard>
        </>
      )}

      <GeneralIndicatorTypeDrawer row={drawer} onClose={() => setDrawer(null)} onEdit={openEdit} onVerMedicoes={verMedicoes} />

      <GeneralIndicatorTypeForm
        open={formOpen} onOpenChange={setFormOpen} editing={editing}
        findByCodigo={data.findByCodigo} onCreate={onCreate} onUpdate={onUpdate}
        onOpenExisting={(r) => { setFormOpen(false); setDrawer(r); }}
      />

      <GeneralIndicatorTypeStatusDialog
        row={statusTarget}
        onOpenChange={(o) => { if (!o) setStatusTarget(null); }}
        onConfirm={async (r, ativo) => { await data.updateTipoIndicador(r.id, { ativo }); }}
      />

      <GeneralIndicatorTypeDeleteDialog
        row={deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        onConfirm={async (r) => { await data.deleteTipoIndicador(r.id); }}
        onVerMedicoes={verMedicoes}
      />
    </div>
  );
}
