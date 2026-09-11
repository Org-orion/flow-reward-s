import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/app/SectionCard';
import { useCompanies } from '../hooks/useCompanies';
import { useCompanyFilters } from '../hooks/useCompanyFilters';
import { computeCompanySummary } from '../domain/companyFilters';
import { CompaniesHeader } from './CompaniesHeader';
import { CompaniesSummary } from './CompaniesSummary';
import { CompaniesFilters } from './CompaniesFilters';
import { CompaniesTable, type CompanyRowHandlers } from './CompaniesTable';
import { CompanyDrawer } from './CompanyDrawer';
import { CompanyForm, type CompanyFormPayload } from './CompanyForm';
import { CompanyDeleteDialog } from './CompanyDeleteDialog';
import { CompaniesSkeleton } from './CompaniesSkeleton';
import { CompaniesEmptyState } from './CompaniesEmptyState';
import type { CompanyRow } from '../types/company.types';
import { useResourceAccess } from '@/hooks/useResourceAccess';

/**
 * Gestão de Empresas — página única. Shell orquestrador: carrega dados uma vez,
 * hospeda tabela/drawer/formulário/exclusão e navegação contextual (Setores/
 * Funcionários via ?empresa=). Exclusão soft, bloqueada com vínculos ativos.
 * Não altera o banco.
 */
export function CompaniesShell() {
  const acesso = useResourceAccess('cad_empresas');
  const data = useCompanies();
  const navigate = useNavigate();
  const state = useCompanyFilters(data.rows);
  const summary = useMemo(() => computeCompanySummary(data.rows), [data.rows]);

  const [drawer, setDrawer] = useState<CompanyRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyRow | null>(null);

  const openNova = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (r: CompanyRow) => { setDrawer(null); setEditing(r); setFormOpen(true); };
  const verSetores = (r: CompanyRow) => navigate(`/premiacoes/cadastros/setores?empresa=${encodeURIComponent(r.id)}`);
  const verFuncionarios = (r: CompanyRow) => navigate(`/premiacoes/funcionarios?empresa=${encodeURIComponent(r.id)}`);

  const handlers: CompanyRowHandlers = {
    onOpen: setDrawer, onEdit: openEdit, onVerSetores: verSetores, onVerFuncionarios: verFuncionarios, onDelete: setDeleteTarget,
  };

  const onCreate = async (payload: CompanyFormPayload) => { await data.createEmpresa({ nome: payload.nome, cnpj: payload.cnpj ?? undefined, ativo: true }); };
  const onUpdate = async (id: string, payload: CompanyFormPayload) => { await data.updateEmpresa(id, { nome: payload.nome, cnpj: payload.cnpj ?? undefined }); };

  if (data.loading && data.rows.length === 0) return <CompaniesSkeleton />;

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-[18px]">
      <CompaniesHeader onNovaEmpresa={openNova} />

      {data.rows.length === 0 ? (
        <CompaniesEmptyState
          icon={Building2}
          title="Nenhuma empresa cadastrada"
          description="Cadastre a empresa para organizar setores, funcionários e a estrutura do sistema."
          action={acesso.podeCriar ? <Button size="sm" className="gap-1.5" onClick={openNova}><Plus className="h-4 w-4" /> Nova empresa</Button> : undefined}
        />
      ) : (
        <>
          <CompaniesSummary summary={summary} onFilter={state.setFilters} />
          <SectionCard title="Empresas" description="Cadastro, estrutura vinculada e situação.">
            <div className="space-y-4">
              <CompaniesFilters filters={state.filters} onChange={state.setFilters} onReset={state.resetFilters} searchInput={state.searchInput} onSearchChange={state.setSearchInput} activeCount={state.activeCount} />
              <CompaniesTable rows={state.filtered} handlers={handlers} />
              <p className="text-xs text-muted-foreground">Mostrando {state.filtered.length} de {data.rows.length} empresas.</p>
            </div>
          </SectionCard>
        </>
      )}

      <CompanyDrawer row={drawer} onClose={() => setDrawer(null)} onEdit={openEdit} onVerSetores={verSetores} onVerFuncionarios={verFuncionarios} />

      <CompanyForm
        open={formOpen} onOpenChange={setFormOpen} editing={editing}
        findByCnpj={data.findByCnpj} onCreate={onCreate} onUpdate={onUpdate}
        onOpenExisting={(r) => { setFormOpen(false); setDrawer(r); }}
      />

      <CompanyDeleteDialog
        row={deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        onConfirm={async (r) => { await data.deleteEmpresa(r.id); }}
        onVerSetores={verSetores}
      />
    </div>
  );
}
