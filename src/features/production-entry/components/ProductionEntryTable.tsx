import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProductionEntryRow } from './ProductionEntryRow';
import { ProductionEntryCard } from './ProductionEntryCard';
import { productionColumnCount, type ProductionFieldAccess } from '../domain/productionFieldAccess';
import type { ProductionRow } from '../types/production-entry.types';

interface Props {
  rows: ProductionRow[];
  changedSetorIds: Set<string>;
  comparing: boolean;
  onChangeField: (setorId: string, field: 'meta' | 'realizado', value: string) => void;
  onRestore: (setorId: string) => void;
  onOpenDrawer: (row: ProductionRow) => void;
  /** Permissões de campo — escondem colunas e travam a edição. */
  campos: ProductionFieldAccess;
}

/** Grade operacional de apuração — cabeçalho fixo, edição rápida, alta densidade. */
export function ProductionEntryTable({ rows, changedSetorIds, comparing, onChangeField, onRestore, onOpenDrawer, campos }: Props) {
  const colunas = productionColumnCount(campos);

  return (
    <>
    {/* Desktop / notebook / tablet — tabela com scroll horizontal interno */}
    <div className="hidden max-h-[600px] overflow-auto rounded-xl border border-border/70 md:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50 [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-muted/95">
            <TableHead className="min-w-[220px]">Setor</TableHead>
            {campos.verMeta && <TableHead className="text-right">Meta</TableHead>}
            {campos.verRealizado && <TableHead className="text-right">Realizado</TableHead>}
            {campos.verDerivados && <TableHead className="text-right">Percentual</TableHead>}
            {campos.verDerivados && <TableHead className="text-right">Desvio</TableHead>}
            <TableHead>Situação</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow><TableCell colSpan={colunas} className="py-10 text-center text-sm text-muted-foreground">Nenhum setor encontrado para os filtros selecionados.</TableCell></TableRow>
          ) : rows.map((row) => (
            <ProductionEntryRow
              key={row.setorId}
              row={row}
              changed={changedSetorIds.has(row.setorId)}
              comparing={comparing}
              onChangeField={(field, value) => onChangeField(row.setorId, field, value)}
              onRestore={() => onRestore(row.setorId)}
              onOpenDrawer={() => onOpenDrawer(row)}
              campos={campos}
            />
          ))}
        </TableBody>
      </Table>
    </div>

    {/* Mobile — cards */}
    <div className="space-y-2.5 md:hidden">
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nenhum setor encontrado para os filtros selecionados.</p>
      ) : rows.map((row) => (
        <ProductionEntryCard
          key={row.setorId}
          row={row}
          changed={changedSetorIds.has(row.setorId)}
          onChangeField={(field, value) => onChangeField(row.setorId, field, value)}
          onRestore={() => onRestore(row.setorId)}
          onOpenDrawer={() => onOpenDrawer(row)}
          campos={campos}
        />
      ))}
    </div>
    </>
  );
}
