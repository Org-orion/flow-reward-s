import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";

import { useFuncionarios, type Funcionario } from "@/hooks/useFuncionarios";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useSetores } from "@/hooks/useSetores";
import { useFuncoes } from "@/hooks/useFuncoes";
import { useCategorias } from "@/hooks/useCategorias";
import { useBasePremiacao } from "@/hooks/useBasePremiacao";
import { useFaixas } from "@/hooks/useFaixas";
import { useLocaisDSS } from "@/hooks/useLocaisDSS";
import { useFaltasAdvertencias } from "@/hooks/useFaltasAdvertencias";
import { useEPI } from "@/hooks/useEPI";
import { useDSS } from "@/hooks/useDSS";
import { useResultadosPremiacao } from "@/hooks/useResultadosPremiacao";

import { useEmployeeFilters } from "@/features/employees/hooks/useEmployeeFilters";
import { useEmployeeSelection } from "@/features/employees/hooks/useEmployeeSelection";
import { useEmployeeForm } from "@/features/employees/hooks/useEmployeeForm";
import { useEmployeeImport } from "@/features/employees/hooks/useEmployeeImport";
import { useEmployeeUpdateImport } from "@/features/employees/hooks/useEmployeeUpdateImport";
import { checkEmployeeCompletion } from "@/features/employees/domain/employeeCompletion";
import { getEmployeeEligibility } from "@/features/employees/domain/employeeEligibility";
import { exportFuncionariosCsv } from "@/features/employees/domain/exportCsv";
import type { EmployeeTab } from "@/features/employees/types";

import { EmployeesHeader } from "@/components/employees/EmployeesHeader";
import { EmployeesSummary, type EmployeesSummaryCounts } from "@/components/employees/EmployeesSummary";
import { EmployeesTabs } from "@/components/employees/EmployeesTabs";
import { EmployeesFilters } from "@/components/employees/EmployeesFilters";
import { EmployeeSelectionBar } from "@/components/employees/EmployeeSelectionBar";
import { EmployeesTable } from "@/components/employees/EmployeesTable";
import { EmployeesPagination } from "@/components/employees/EmployeesPagination";
import { EmployeesSkeleton } from "@/components/employees/EmployeesSkeleton";
import { EmployeeDetailsDrawer } from "@/components/employees/EmployeeDetailsDrawer";
import { EmployeeFormWizard } from "@/components/employees/EmployeeFormWizard";
import { EmployeeImportWizard } from "@/components/employees/EmployeeImportWizard";
import { EmployeeUpdateWizard } from "@/components/employees/EmployeeUpdateWizard";

const STATUS_OPTIONS = ["Ativo", "Férias", "Licença", "Rescisão"];

/**
 * Central de Gestão de Pessoas — orquestrador.
 * Lógica de dados/regras vive em src/features/employees; UI em src/components/employees.
 */
export const Funcionarios = () => {
  const { funcionarios, loading, createFuncionario, updateFuncionario, deleteFuncionario, refetch } = useFuncionarios();
  const { empresas } = useEmpresas();
  const { setores } = useSetores();
  const { funcoes } = useFuncoes();
  const { categorias } = useCategorias();
  const { bases } = useBasePremiacao();
  const { faixas } = useFaixas();
  const { locais: locaisDSS } = useLocaisDSS();
  const { registros: faltas } = useFaltasAdvertencias();
  const { epiRecords } = useEPI();
  const { dssRecords } = useDSS();
  const { resultados } = useResultadosPremiacao();

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  useEffect(() => { if (!loading) setLastUpdated(new Date()); }, [loading]);

  const filtersState = useEmployeeFilters(funcionarios);
  // Integração vinda de Setores/Funções/Categorias ("Ver funcionários"): pré-aplica o filtro.
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const setorId = searchParams.get("setor");
    const funcaoId = searchParams.get("funcao");
    const categoriaId = searchParams.get("categoria");
    const empresaId = searchParams.get("empresa");
    const localDssId = searchParams.get("localDss");
    const patch: Partial<typeof filtersState.filters> = {};
    if (setorId) patch.setorId = setorId;
    if (funcaoId) patch.funcaoId = funcaoId;
    if (categoriaId) patch.categoriaId = categoriaId;
    if (empresaId) patch.empresaId = empresaId;
    if (localDssId) patch.localDssId = localDssId;
    if (Object.keys(patch).length > 0) filtersState.setFilters(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const selection = useEmployeeSelection();
  const form = useEmployeeForm({ createFuncionario, updateFuncionario });
  const importState = useEmployeeImport({ empresas, setores, funcoes, categorias, bases, faixas, locaisDSS }, refetch);
  const updateState = useEmployeeUpdateImport({ empresas, setores, funcoes, categorias, bases, faixas, locaisDSS }, refetch);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [profileFuncionario, setProfileFuncionario] = useState<Funcionario | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const counts: EmployeesSummaryCounts = {
    total: funcionarios.length,
    ativos: funcionarios.filter((f) => f.ativo).length,
    inativos: funcionarios.filter((f) => !f.ativo).length,
    semSetor: funcionarios.filter((f) => !f.setor_id && !(f.setor_ids && f.setor_ids.length > 0)).length,
    incompletos: funcionarios.filter((f) => !checkEmployeeCompletion(f).complete).length,
    naoElegiveis: funcionarios.filter((f) => getEmployeeEligibility(f) === "nao_elegivel").length,
  };

  const handleSummaryClick = (key: keyof EmployeesSummaryCounts) => {
    filtersState.resetFilters();
    if (key === "ativos") filtersState.setTab("ativos" as EmployeeTab);
    else if (key === "inativos") filtersState.setTab("inativos" as EmployeeTab);
    else if (key === "incompletos") filtersState.setTab("pendencias" as EmployeeTab);
    else if (key === "semSetor") { filtersState.setTab("todos"); filtersState.setFilters({ setorId: "__sem_setor__" }); }
    else if (key === "naoElegiveis") { filtersState.setTab("todos"); filtersState.setFilters({ eligibility: "nao_elegivel" }); }
    else filtersState.setTab("todos");
  };

  const handleInactivate = async (f: Funcionario) => { await deleteFuncionario(f.id); };

  const runBulk = async (mutate: (id: string) => Promise<unknown>) => {
    setBulkBusy(true);
    try {
      await Promise.all([...selection.selected].map((id) => mutate(id)));
      selection.clear();
    } finally {
      setBulkBusy(false);
    }
  };

  const selectedFuncionarios = funcionarios.filter((f) => selection.isSelected(f.id));
  const pageIds = filtersState.paged.map((f) => f.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selection.isSelected(id));

  if (loading && funcionarios.length === 0) return <EmployeesSkeleton />;

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-6">
      <EmployeesHeader
        total={funcionarios.length}
        lastUpdated={lastUpdated}
        onNew={form.openCreate}
        onImport={() => setImportOpen(true)}
        onAtualizarCadastros={() => setUpdateOpen(true)}
        onDownloadTemplate={importState.downloadTemplate}
        onExportCsv={() => exportFuncionariosCsv(filtersState.filtered, "funcionarios.csv")}
      />

      <EmployeesSummary counts={counts} onFilterClick={handleSummaryClick} />

      <EmployeesTabs active={filtersState.tab} counts={filtersState.counts} onChange={filtersState.setTab} />

      <EmployeesFilters
        searchInput={filtersState.searchInput}
        onSearchChange={filtersState.setSearchInput}
        filters={filtersState.filters}
        onChange={filtersState.setFilters}
        onReset={filtersState.resetFilters}
        activeFilterCount={filtersState.activeFilterCount}
        empresas={empresas}
        setores={setores}
        funcoes={funcoes}
        categorias={categorias}
        locaisDSS={locaisDSS}
        statusOptions={STATUS_OPTIONS}
      />

      <EmployeeSelectionBar
        count={selection.count}
        setores={setores}
        categorias={categorias}
        statusOptions={STATUS_OPTIONS}
        busy={bulkBusy}
        onChangeSetor={(setorId) => runBulk((id) => updateFuncionario(id, { setor_id: setorId }))}
        onChangeCategoria={(categoriaId) => runBulk((id) => updateFuncionario(id, { categoria_id: categoriaId }))}
        onChangeStatus={(status) => runBulk((id) => updateFuncionario(id, { status, ativo: status.toLowerCase() !== 'rescisão' && status.toLowerCase() !== 'rescisao' }))}
        onExport={() => exportFuncionariosCsv(selectedFuncionarios, "funcionarios_selecionados.csv")}
        onClear={selection.clear}
      />

      {filtersState.filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={funcionarios.length === 0 ? "Nenhum funcionário cadastrado ainda" : "Nenhum funcionário encontrado"}
          description={funcionarios.length === 0 ? "Comece cadastrando o primeiro funcionário ou importe uma planilha." : "Ajuste a busca, os filtros ou a aba selecionada."}
        />
      ) : (
        <>
          <EmployeesTable
            rows={filtersState.paged}
            isSelected={selection.isSelected}
            onToggleSelect={selection.toggle}
            onToggleAll={() => selection.toggleAll(pageIds)}
            allSelected={allPageSelected}
            onOpenProfile={setProfileFuncionario}
            onEdit={form.openEdit}
            onInactivate={handleInactivate}
          />
          <EmployeesPagination
            page={filtersState.page}
            totalPages={filtersState.totalPages}
            pageSize={filtersState.pageSize}
            total={filtersState.filtered.length}
            onPageChange={filtersState.setPage}
            onPageSizeChange={filtersState.setPageSize}
          />
        </>
      )}

      <EmployeeDetailsDrawer
        funcionario={profileFuncionario}
        onClose={() => setProfileFuncionario(null)}
        onEdit={(f) => { setProfileFuncionario(null); form.openEdit(f); }}
        faltas={faltas}
        epi={epiRecords}
        dss={dssRecords}
        resultados={resultados}
      />

      <EmployeeFormWizard form={form} empresas={empresas} setores={setores} funcoes={funcoes} categorias={categorias} bases={bases} faixas={faixas} locaisDSS={locaisDSS} />

      <EmployeeImportWizard open={importOpen} onOpenChange={setImportOpen} importState={importState} />
      <EmployeeUpdateWizard open={updateOpen} onOpenChange={setUpdateOpen} estado={updateState} />
    </div>
  );
};
