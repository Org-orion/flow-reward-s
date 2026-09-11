import { useMemo } from 'react';
import { Database, CalendarRange, LayoutList, Target, TrendingDown, ShieldAlert, History } from 'lucide-react';
import { SectionCard } from '@/components/app/SectionCard';
import { StatCard } from '@/components/dashboard/StatCard';
import { EmployeesPagination } from '@/components/employees/EmployeesPagination';
import { GeneralIndicatorsEmptyState } from '../components/GeneralIndicatorsEmptyState';
import { GeneralIndicatorsHistoryFilters } from '../components/GeneralIndicatorsHistoryFilters';
import { GeneralIndicatorsHistoryTable } from '../components/GeneralIndicatorsHistoryTable';
import { useGeneralIndicatorFilters } from '../hooks/useGeneralIndicatorFilters';
import { hasAnomaly } from '../domain/indicatorDataQuality';
import type { GeneralHistoryRow } from '../types/general-indicators.types';
import type { GeneralPageProps } from './_shared';

export function GeneralIndicatorsHistory({ data, historyRows, onOpenDrawer, onEdit, onGoToEvolution, acesso }: GeneralPageProps) {
  const filtersState = useGeneralIndicatorFilters(historyRows);
  const rows = filtersState.filtered;

  const summary = useMemo(() => ({
    registros: rows.length,
    competencias: new Set(rows.map((r) => r.competencia)).size,
    indicadores: new Set(rows.map((r) => r.tipoId)).size,
    metaAtingida: rows.filter((r) => r.situacao === 'superada' || r.situacao === 'atingida').length,
    abaixo: rows.filter((r) => r.situacao === 'abaixo').length,
    inconsistencias: rows.filter((r) => hasAnomaly(r.quality)).length,
  }), [rows]);

  const handleEdit = (row: GeneralHistoryRow) => onEdit(row.registroId);
  const handleDelete = async (row: GeneralHistoryRow) => { await data.deleteIndicador(row.registroId); };

  return (
    <div className="space-y-[18px]">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Registros" value={String(summary.registros)} hint="no filtro atual" icon={Database} />
        <StatCard title="Competências" value={String(summary.competencias)} hint="distintas" icon={CalendarRange} />
        <StatCard title="Indicadores" value={String(summary.indicadores)} hint="acompanhados" icon={LayoutList} />
        <StatCard title="Meta atingida" value={String(summary.metaAtingida)} icon={Target} status="positive" />
        <StatCard title="Abaixo da meta" value={String(summary.abaixo)} icon={TrendingDown} status={summary.abaixo > 0 ? 'critical' : 'positive'} />
        <StatCard title="Possíveis inconsistências" value={String(summary.inconsistencias)} icon={ShieldAlert} status={summary.inconsistencias > 0 ? 'warning' : 'positive'} />
      </div>

      <SectionCard title="Histórico de Indicadores" description="Todos os registros de indicadores corporativos por competência.">
        <div className="space-y-4">
          <GeneralIndicatorsHistoryFilters
            searchInput={filtersState.searchInput}
            onSearchChange={filtersState.setSearchInput}
            filters={filtersState.filters}
            onChange={filtersState.setFilters}
            onReset={filtersState.resetFilters}
            tipos={data.tiposAtivos}
            activeCount={filtersState.activeCount}
          />

          {historyRows.length === 0 ? (
            <GeneralIndicatorsEmptyState icon={History} title="Nenhum registro de indicadores" description="Os registros de indicadores corporativos aparecerão aqui." />
          ) : (
            <>
              <GeneralIndicatorsHistoryTable
                rows={filtersState.paged}
                onOpenDrawer={onOpenDrawer}
                onEdit={handleEdit}
                podeEditar={acesso.podeEditar}
                podeExcluir={acesso.podeExcluir}
                onCompare={(row) => onGoToEvolution(row.tipoId)}
                onDelete={handleDelete}
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
        </div>
      </SectionCard>
    </div>
  );
}
