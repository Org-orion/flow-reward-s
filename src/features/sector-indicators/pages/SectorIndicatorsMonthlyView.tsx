import { useMemo, useState } from 'react';
import { Gauge } from 'lucide-react';
import { SectionCard } from '@/components/app/SectionCard';
import { EmployeesPagination } from '@/components/employees/EmployeesPagination';
import { SectorIndicatorsEmptyState } from '../components/SectorIndicatorsEmptyState';
import { SectorIndicatorsSummary } from '../components/SectorIndicatorsSummary';
import { SectorIndicatorsProgress } from '../components/SectorIndicatorsProgress';
import { SectorIndicatorsFilters } from '../components/SectorIndicatorsFilters';
import { SectorIndicatorsMatrix } from '../components/SectorIndicatorsMatrix';
import { SectorIndicatorsDrawer } from '../components/SectorIndicatorsDrawer';
import { SectorIndicatorsSaveBar } from '../components/SectorIndicatorsSaveBar';
import { SectorIndicatorsReviewDialog } from '../components/SectorIndicatorsReviewDialog';
import { SectorIndicatorsBulkBar } from '../components/SectorIndicatorsBulkBar';
import { SectorIndicatorsBulkDialog, type BulkMode } from '../components/SectorIndicatorsBulkDialog';
import { useSectorIndicatorsFilters } from '../hooks/useSectorIndicatorsFilters';
import { useResourceAccess } from '@/hooks/useResourceAccess';
import { buildSectorRows, computeSummary } from '../domain/indicatorCalculations';
import type { IndicatorId } from '../types/sector-indicators.types';
import type { SectorIndicatorsPageProps } from './_shared';

export function SectorIndicatorsMonthlyView({
  data, draft, selection, competencia, comparing, baselineAnterior, reviewOpen, setReviewOpen, onVerIndicadoresGerais,
}: SectorIndicatorsPageProps) {
  const [selectedSetorId, setSelectedSetorId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<BulkMode>('metas');

  // Permissões desta tela (ver src/config/permissions.ts).
  const acesso = useResourceAccess('indicadores_setor');
  const campos = useMemo(() => ({
    editarMeta: acesso.podeEditarCampo('meta'),
    editarRealizado: acesso.podeEditarCampo('realizado'),
  }), [acesso]);
  const podeEditar = campos.editarMeta || campos.editarRealizado;

  const changedSetorIds = useMemo(() => new Set(draft.diff.changedSetorIds), [draft.diff.changedSetorIds]);

  const rows = useMemo(() => buildSectorRows({
    setoresPrevistos: data.setoresPrevistos,
    draft: draft.draft,
    registroIdIndex: draft.registroIdIndex,
    baselineAnterior: comparing ? baselineAnterior : undefined,
  }), [data.setoresPrevistos, draft.draft, draft.registroIdIndex, comparing, baselineAnterior]);

  const summary = useMemo(() => computeSummary(rows), [rows]);
  const pendentesRows = useMemo(() => rows.filter((r) => r.situacao === 'pendente'), [rows]);

  const filtersState = useSectorIndicatorsFilters(rows, changedSetorIds);

  const setorNome = (setorId: string) => data.setoresPrevistos.find((s) => s.id === setorId)?.nome ?? setorId;
  const empresasOpt = data.empresas.map((e) => ({ id: e.id, nome: e.nome }));
  const setoresOpt = data.setoresPrevistos.map((s) => ({ id: s.id, nome: s.nome }));

  // Navegação do drawer sobre a lista filtrada (independe da paginação).
  const navList = filtersState.filtered;
  const selectedIndex = selectedSetorId ? navList.findIndex((r) => r.setorId === selectedSetorId) : -1;
  const selectedRow = selectedIndex >= 0 ? navList[selectedIndex] : (selectedSetorId ? rows.find((r) => r.setorId === selectedSetorId) ?? null : null);

  const changedIndicators = useMemo(() => {
    const set = new Set<IndicatorId>();
    if (!selectedSetorId) return set;
    for (const c of draft.diff.changedFields) if (c.setorId === selectedSetorId) set.add(c.indicatorId);
    return set;
  }, [draft.diff.changedFields, selectedSetorId]);

  const openDrawerAt = (index: number) => { const r = navList[index]; if (r) setSelectedSetorId(r.setorId); };

  const handleConfirmSave = async () => { const ok = await draft.save(); if (ok) setReviewOpen(false); };

  const handleDrawerSave = async () => { if (selectedSetorId) await draft.save([selectedSetorId]); };
  const handleDrawerSaveNext = async () => {
    if (selectedSetorId) await draft.save([selectedSetorId]);
    if (selectedIndex >= 0 && selectedIndex < navList.length - 1) openDrawerAt(selectedIndex + 1);
  };

  const openBulk = (mode: BulkMode) => { setBulkMode(mode); setBulkOpen(true); };

  // Nada entra no rascunho sem permissão no campo.
  const alterarCampo = (indicatorId: IndicatorId, field: 'meta' | 'realizado', value: string) => {
    if (field === 'meta' && !campos.editarMeta) return;
    if (field === 'realizado' && !campos.editarRealizado) return;
    if (selectedSetorId) draft.setField(selectedSetorId, indicatorId, field, value);
  };

  if (data.setoresPrevistos.length === 0) {
    return <SectorIndicatorsEmptyState icon={Gauge} title="Nenhum setor ativo encontrado" description="Cadastre setores ativos para apurar os indicadores mensais." />;
  }

  return (
    <div className="space-y-[18px]">
      <SectorIndicatorsSummary summary={summary} onFilter={(patch) => filtersState.setFilters(patch)} />

      <SectorIndicatorsProgress
        previstos={summary.previstos}
        apurados={summary.apurados}
        pendentesRows={pendentesRows}
        onShowPendentes={() => filtersState.setFilters({ somentePendentes: true })}
      />

      <SectionCard
        title="Matriz de Apuração"
        description={podeEditar
          ? 'Clique em um setor para apurar os cinco indicadores. As alterações são salvas em lote após revisão.'
          : 'Clique em um setor para consultar os cinco indicadores. Você não tem permissão para alterar estes dados.'}
      >
        <div className="space-y-4">
          <SectorIndicatorsFilters
            searchInput={filtersState.searchInput}
            onSearchChange={filtersState.setSearchInput}
            filters={filtersState.filters}
            onChange={filtersState.setFilters}
            onReset={filtersState.resetFilters}
            empresas={empresasOpt}
            setores={setoresOpt}
          />

          <SectorIndicatorsMatrix
            rows={filtersState.paged}
            competencia={competencia}
            changedSetorIds={changedSetorIds}
            comparing={comparing}
            isSelected={selection.isSelected}
            onToggleSelect={selection.toggle}
            onToggleSelectPage={(ids, value) => selection.setMany(ids, value)}
            onOpenDrawer={(row) => setSelectedSetorId(row.setorId)}
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

      {selection.count > 0 && podeEditar ? (
        <SectorIndicatorsBulkBar
          count={selection.count}
          onAplicarMetas={() => openBulk('metas')}
          onAplicarIndicadores={() => openBulk('indicadores')}
          onMarcarSemMedicao={() => { draft.markSemMedicao(selection.ids); selection.clear(); }}
          onCancel={selection.clear}
          podeAplicarMetas={campos.editarMeta}
          podeAplicarIndicadores={campos.editarRealizado}
        />
      ) : podeEditar ? (
        <SectorIndicatorsSaveBar
          setoresAlterados={draft.diff.totalSetoresAlterados}
          indicadoresAlterados={draft.diff.indicadoresAlterados}
          saving={draft.saving}
          onDiscard={draft.restoreAll}
          onReview={() => setReviewOpen(true)}
        />
      ) : null}

      <SectorIndicatorsReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        competencia={competencia}
        diff={draft.diff}
        setorNome={setorNome}
        saving={draft.saving}
        error={draft.error}
        onConfirm={handleConfirmSave}
      />

      <SectorIndicatorsDrawer
        row={selectedRow}
        competencia={competencia}
        changedIndicators={changedIndicators}
        saving={draft.saving}
        hasPrev={selectedIndex > 0}
        hasNext={selectedIndex >= 0 && selectedIndex < navList.length - 1}
        onClose={() => setSelectedSetorId(null)}
        onPrev={() => openDrawerAt(selectedIndex - 1)}
        onNext={() => openDrawerAt(selectedIndex + 1)}
        onCommit={alterarCampo}
        campos={campos}
        onRestoreIndicator={(indicatorId) => { if (selectedSetorId) draft.restoreIndicator(selectedSetorId, indicatorId); }}
        onMarkSemMedicao={() => { if (selectedSetorId && campos.editarRealizado) draft.markSemMedicao([selectedSetorId]); }}
        onSave={handleDrawerSave}
        onSaveNext={handleDrawerSaveNext}
        onVerIndicadoresGerais={() => onVerIndicadoresGerais({ setorId: selectedSetorId ?? undefined, competencia })}
      />

      <SectorIndicatorsBulkDialog
        open={bulkOpen && (bulkMode === 'metas' ? campos.editarMeta : campos.editarRealizado)}
        mode={bulkMode}
        onOpenChange={setBulkOpen}
        selectedSetorIds={selection.ids}
        draft={draft.draft}
        onApply={(entries) => { draft.mergeEntries(entries); setBulkOpen(false); selection.clear(); }}
      />
    </div>
  );
}
