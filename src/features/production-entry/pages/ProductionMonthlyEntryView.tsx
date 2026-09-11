import { useMemo, useState } from 'react';
import { Plus, Copy } from 'lucide-react';
import { SectionCard } from '@/components/app/SectionCard';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Factory } from 'lucide-react';
import { EmployeesPagination } from '@/components/employees/EmployeesPagination';
import { ProductionSummary } from '../components/ProductionSummary';
import { ProductionProgress } from '../components/ProductionProgress';
import { ProductionFilters } from '../components/ProductionFilters';
import { ProductionEntryTable } from '../components/ProductionEntryTable';
import { ProductionSaveBar } from '../components/ProductionSaveBar';
import { ProductionReviewDialog } from '../components/ProductionReviewDialog';
import { ProductionSectorDrawer } from '../components/ProductionSectorDrawer';
import { ProductionSingleEntryDialog } from '../components/ProductionSingleEntryDialog';
import { ProductionCopyMetasDialog } from '../components/ProductionCopyMetasDialog';
import { useProductionFilters } from '../hooks/useProductionFilters';
import { useResourceAccess } from '@/hooks/useResourceAccess';
import { buildProductionFieldAccess } from '../domain/productionFieldAccess';
import { buildProductionRows, computeSummary } from '../domain/productionCalculations';
import type { ProductionRow } from '../types/production-entry.types';
import type { ProductionPageProps } from './_shared';
import type { ProductionFieldAccess } from '../domain/productionFieldAccess';

/** Texto do card conforme o que o usuário pode de fato alterar. */
function descricaoGrade(campos: ProductionFieldAccess): string {
  if (!campos.podeEditarAlgum) return 'Consulta da apuração de cada setor. Você não tem permissão para alterar estes dados.';
  if (campos.editarMeta && campos.editarRealizado) return 'Edite meta e produção realizada de cada setor. As alterações são salvas em lote após revisão.';
  if (campos.editarRealizado) return 'Edite a produção realizada de cada setor. A meta é somente leitura. As alterações são salvas em lote após revisão.';
  return 'Edite a meta de cada setor. A produção realizada é somente leitura. As alterações são salvas em lote após revisão.';
}

export function ProductionMonthlyEntryView({ data, draft, competencia, comparing, baselineAnterior, reviewOpen, setReviewOpen }: ProductionPageProps) {
  const [selectedRow, setSelectedRow] = useState<ProductionRow | null>(null);
  const [singleOpen, setSingleOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);

  // Permissões desta tela (ver src/config/permissions.ts).
  const acesso = useResourceAccess('producao_setor');
  const campos = useMemo(() => buildProductionFieldAccess(acesso), [acesso]);

  const changedSetorIds = useMemo(() => new Set(draft.diff.changedSetorIds), [draft.diff.changedSetorIds]);

  const rows = useMemo(() => buildProductionRows({
    setoresPrevistos: data.setoresPrevistos,
    draft: draft.draft,
    registroIdIndex: draft.registroIdIndex,
    unidadeIndex: draft.unidadeIndex,
    baselineAnterior: comparing ? baselineAnterior : undefined,
  }), [data.setoresPrevistos, draft.draft, draft.registroIdIndex, draft.unidadeIndex, comparing, baselineAnterior]);

  const summary = useMemo(() => computeSummary(rows), [rows]);
  const pendentesRows = useMemo(() => rows.filter((r) => r.situacao === 'pendente'), [rows]);

  const filtersState = useProductionFilters(rows, changedSetorIds);

  const setorNome = (setorId: string) => data.setoresPrevistos.find((s) => s.id === setorId)?.nome ?? setorId;
  const unidadePorSetor = (setorId: string) => draft.unidadeIndex[setorId]?.unidade ?? 'unidades';

  const empresasOpt = data.empresas.map((e) => ({ id: e.id, nome: e.nome }));
  const setoresOpt = data.setoresPrevistos.map((s) => ({ id: s.id, nome: s.nome }));

  // Nenhuma alteração entra no rascunho sem permissão no campo — a trava visual
  // é a primeira barreira, esta é a segunda.
  const alterarCampo = (setorId: string, field: 'meta' | 'realizado', value: string) => {
    if (field === 'meta' && !campos.editarMeta) return;
    if (field === 'realizado' && !campos.editarRealizado) return;
    draft.setField(setorId, field, value);
  };

  const handleConfirmSave = async () => {
    const ok = await draft.save(unidadePorSetor);
    if (ok) setReviewOpen(false);
  };

  if (data.setoresPrevistos.length === 0) {
    return <EmptyState icon={Factory} title="Nenhum setor ativo encontrado" description="Cadastre setores ativos para apurar a produção mensal." />;
  }

  return (
    <div className="space-y-[18px]">
      <ProductionSummary summary={summary} onFilter={(patch) => filtersState.setFilters(patch)} />

      <ProductionProgress
        previstos={summary.previstos}
        apurados={summary.apurados}
        pendentesRows={pendentesRows}
        onShowPendentes={() => filtersState.setFilters({ somentePendentes: true })}
      />

      <SectionCard
        title="Grade de Apuração"
        description={descricaoGrade(campos)}
      >
        <div className="space-y-4">
          {(campos.editarMeta || acesso.podeCriar) && (
            <div className="flex flex-wrap items-center gap-2">
              {campos.editarMeta && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCopyOpen(true)}>
                  <Copy className="h-3.5 w-3.5" /> Copiar metas do mês anterior
                </Button>
              )}
              {acesso.podeCriar && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setSingleOpen(true)}>
                  <Plus className="h-3.5 w-3.5" /> Adicionar registro
                </Button>
              )}
            </div>
          )}

          <ProductionFilters
            searchInput={filtersState.searchInput}
            onSearchChange={filtersState.setSearchInput}
            filters={filtersState.filters}
            onChange={filtersState.setFilters}
            onReset={filtersState.resetFilters}
            empresas={empresasOpt}
            setores={setoresOpt}
          />

          <ProductionEntryTable
            rows={filtersState.paged}
            changedSetorIds={changedSetorIds}
            comparing={comparing}
            onChangeField={alterarCampo}
            onRestore={(setorId) => draft.restoreEntry(setorId)}
            onOpenDrawer={setSelectedRow}
            campos={campos}
          />

          <EmployeesPagination
            page={filtersState.page}
            totalPages={filtersState.totalPages}
            pageSize={filtersState.pageSize}
            total={filtersState.filtered.length}
            onPageChange={filtersState.setPage}
            onPageSizeChange={filtersState.setPageSize}
          />
        </div>
      </SectionCard>

      {campos.podeEditarAlgum && (
      <ProductionSaveBar
        setoresAlterados={draft.diff.totalSetoresAlterados}
        metasAlteradas={draft.diff.metasAlteradas}
        realizadosAlterados={draft.diff.realizadosAlterados}
        saving={draft.saving}
        onDiscard={draft.restoreAll}
        onReview={() => setReviewOpen(true)}
      />
      )}

      <ProductionReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        competencia={competencia}
        diff={draft.diff}
        setorNome={setorNome}
        saving={draft.saving}
        error={draft.error}
        onConfirm={handleConfirmSave}
      />

      <ProductionSectorDrawer
        row={selectedRow}
        competencia={competencia}
        registros={data.registros}
        onClose={() => setSelectedRow(null)}
      />

      <ProductionSingleEntryDialog
        open={singleOpen && acesso.podeCriar}
        onOpenChange={setSingleOpen}
        setores={data.setores}
        competenciaAtual={competencia}
        createRegistro={data.createRegistro}
        onCreated={data.refetch}
      />

      <ProductionCopyMetasDialog
        open={copyOpen && campos.editarMeta}
        onOpenChange={setCopyOpen}
        competenciaDestino={competencia}
        registros={data.registros}
        draft={draft.draft}
        setorNome={setorNome}
        onApply={draft.mergeEntries}
      />
    </div>
  );
}
