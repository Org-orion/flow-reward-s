import { MoreHorizontal, Eye, Pencil, Power, PowerOff, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/app/StatusBadge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatNumberBR } from '@/lib/formatters';
import { ativoDe, type Row, type TabConfig } from './masterShared';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Handlers {
  onView: (r: Row) => void;
  onEdit: (r: Row) => void;
  onInativar: (r: Row) => void;
  onReativar: (r: Row) => void;
  onExcluir: (r: Row) => void;
}

interface Props extends Handlers {
  cfg: TabConfig;
  pagina: Row[];
  total: number;
  page: number; setPage: (n: number) => void;
  pageSize: number; setPageSize: (n: number) => void;
  totalPaginas: number;
  isAdmin: boolean;
}

const PAGE_SIZES = [25, 50, 100];

export function MasterDataTable({ cfg, pagina, total, page, setPage, pageSize, setPageSize, totalPaginas, isAdmin, onView, onEdit, onInativar, onReativar, onExcluir }: Props) {
  const acesso = useResourceAccess('est_cadastros');
  const de = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const ate = Math.min(page * pageSize, total);

  const acoesMenu = (r: Row, ativo: boolean) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ações" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => onView(r)}><Eye className="mr-2 h-4 w-4" /> Visualizar</DropdownMenuItem>
        {acesso.podeEditar && <DropdownMenuItem onClick={() => onEdit(r)}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>}
        {acesso.podeEditar && (ativo
          ? <DropdownMenuItem onClick={() => onInativar(r)}><PowerOff className="mr-2 h-4 w-4" /> Inativar</DropdownMenuItem>
          : <DropdownMenuItem onClick={() => onReativar(r)}><Power className="mr-2 h-4 w-4" /> Reativar</DropdownMenuItem>)}
        {isAdmin && acesso.podeExcluir && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onExcluir(r)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const pendenciaMarker = (r: Row) => {
    const pend = cfg.pendencias(r);
    if (pend.length === 0) return null;
    const danger = pend.some((p) => p.tone === 'danger');
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn('inline-flex items-center', danger ? 'text-destructive' : 'text-status-warning')} aria-label="Pendências"><AlertTriangle className="h-3.5 w-3.5" /></span>
          </TooltipTrigger>
          <TooltipContent><ul className="space-y-0.5">{pend.map((p, i) => <li key={i}>{p.label} — {p.hint}</li>)}</ul></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div>
      {/* Desktop */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
              {cfg.columns.map((c) => <th key={c.header} className={cn('pb-2.5 pr-3 font-medium', c.align === 'right' && 'text-right')}>{c.header}</th>)}
              <th className="pb-2.5 pr-3 font-medium">Status</th>
              <th className="pb-2.5 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {pagina.map((r) => {
              const ativo = ativoDe(r);
              return (
                <tr key={String(r.id)} onClick={() => onView(r)} tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') onView(r); }}
                  className={cn('cursor-pointer border-b border-border/40 last:border-0 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none', !ativo && 'opacity-60')}>
                  {cfg.columns.map((c) => <td key={c.header} className={cn('py-3 pr-3 align-top text-foreground', c.align === 'right' && 'text-right tabular-nums')}>{c.cell(r)}</td>)}
                  <td className="py-3 pr-3 align-top">
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={ativo ? 'success' : 'neutral'}>{ativo ? 'Ativo' : 'Inativo'}</StatusBadge>
                      {pendenciaMarker(r)}
                    </div>
                  </td>
                  <td className="py-3 text-right align-top" onClick={(e) => e.stopPropagation()}>{acoesMenu(r, ativo)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile/tablet: cards */}
      <div className="space-y-2.5 lg:hidden">
        {pagina.map((r) => {
          const ativo = ativoDe(r);
          return (
            <div key={String(r.id)} role="button" tabIndex={0} onClick={() => onView(r)} onKeyDown={(e) => { if (e.key === 'Enter') onView(r); }}
              className={cn('rounded-xl border border-border/70 bg-card p-3 shadow-[var(--shadow-card)]', !ativo && 'opacity-60')}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">{cfg.columns[0].cell(r)}</div>
                <div onClick={(e) => e.stopPropagation()}>{acoesMenu(r, ativo)}</div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {cfg.columns.slice(1).map((c) => (
                  <div key={c.header} className="min-w-0"><span className="text-muted-foreground">{c.header}: </span><span className="text-foreground">{c.cell(r)}</span></div>
                ))}
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <StatusBadge variant={ativo ? 'success' : 'neutral'}>{ativo ? 'Ativo' : 'Inativo'}</StatusBadge>
                {pendenciaMarker(r)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Paginação (só quando há mais que a menor página) */}
      {total > PAGE_SIZES[0] && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-3 sm:flex-row">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Por página</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-8 w-[72px]" aria-label="Registros por página"><SelectValue /></SelectTrigger>
              <SelectContent>{PAGE_SIZES.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="tabular-nums">{formatNumberBR(de)}–{formatNumberBR(ate)} de {formatNumberBR(total)}</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" className="h-8" disabled={page >= totalPaginas} onClick={() => setPage(page + 1)}>Próxima</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
