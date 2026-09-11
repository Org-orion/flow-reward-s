import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tags, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/app/SectionCard';
import { useCategories } from '../hooks/useCategories';
import { useCategoryFilters } from '../hooks/useCategoryFilters';
import { computeCategorySummary } from '../domain/categoryFilters';
import { CategoriesHeader } from './CategoriesHeader';
import { CategoriesSummary } from './CategoriesSummary';
import { CategoriesFilters } from './CategoriesFilters';
import { CategoriesTable, type CategoryRowHandlers } from './CategoriesTable';
import { CategoryDrawer } from './CategoryDrawer';
import { CategoryForm, type CategoryFormPayload } from './CategoryForm';
import { CategoryDeleteDialog } from './CategoryDeleteDialog';
import { CategoriesSkeleton } from './CategoriesSkeleton';
import { CategoriesEmptyState } from './CategoriesEmptyState';
import type { CategoryRow } from '../types/category.types';
import { useResourceAccess } from '@/hooks/useResourceAccess';

/**
 * Gestão de Categorias — página única. Shell orquestrador: carrega dados uma vez,
 * hospeda tabela/drawer/formulário/exclusão e a navegação para Funcionários.
 * Exclusão é soft e bloqueada com vínculos ativos. Não altera o banco nem o motor.
 */
export function CategoriesShell() {
  const acesso = useResourceAccess('cad_categorias');
  const data = useCategories();
  const navigate = useNavigate();
  const state = useCategoryFilters(data.rows);
  const summary = useMemo(() => computeCategorySummary(data.rows), [data.rows]);

  const [drawer, setDrawer] = useState<CategoryRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);

  const openNova = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (r: CategoryRow) => { setDrawer(null); setEditing(r); setFormOpen(true); };
  const verFuncionarios = (r: CategoryRow) => { navigate(`/premiacoes/funcionarios?categoria=${encodeURIComponent(r.id)}`); };

  const handlers: CategoryRowHandlers = {
    onOpen: setDrawer,
    onEdit: openEdit,
    onVerFuncionarios: verFuncionarios,
    onVerPremiacao: setDrawer, // vínculos de premiação são exibidos no drawer
    onDelete: setDeleteTarget,
  };

  const onCreate = async (payload: CategoryFormPayload) => { await data.createCategoria({ nome: payload.nome, ativo: true }); };
  const onUpdate = async (id: string, payload: CategoryFormPayload) => { await data.updateCategoria(id, { nome: payload.nome }); };

  if (data.loading && data.rows.length === 0) return <CategoriesSkeleton />;

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-[18px]">
      <CategoriesHeader onNovaCategoria={openNova} />

      {data.rows.length === 0 ? (
        <CategoriesEmptyState
          icon={Tags}
          title="Nenhuma categoria cadastrada"
          description="Cadastre categorias para classificar e premiar os funcionários."
          action={acesso.podeCriar ? <Button size="sm" className="gap-1.5" onClick={openNova}><Plus className="h-4 w-4" /> Nova categoria</Button> : undefined}
        />
      ) : (
        <>
          <CategoriesSummary summary={summary} onFilter={state.setFilters} />
          <SectionCard title="Categorias" description="Classificação dos funcionários e sua utilização.">
            <div className="space-y-4">
              <CategoriesFilters
                filters={state.filters} onChange={state.setFilters} onReset={state.resetFilters}
                searchInput={state.searchInput} onSearchChange={state.setSearchInput} activeCount={state.activeCount}
              />
              <CategoriesTable rows={state.filtered} handlers={handlers} />
              <p className="text-xs text-muted-foreground">Mostrando {state.filtered.length} de {data.rows.length} categorias.</p>
            </div>
          </SectionCard>
        </>
      )}

      <CategoryDrawer row={drawer} onClose={() => setDrawer(null)} onEdit={openEdit} onVerFuncionarios={verFuncionarios} />

      <CategoryForm
        open={formOpen} onOpenChange={setFormOpen} editing={editing}
        findDuplicate={data.findDuplicate} onCreate={onCreate} onUpdate={onUpdate}
        onOpenExisting={(r) => { setFormOpen(false); setDrawer(r); }}
      />

      <CategoryDeleteDialog
        row={deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        onConfirm={async (r) => { await data.deleteCategoria(r.id); }}
        onVerFuncionarios={verFuncionarios}
      />
    </div>
  );
}
