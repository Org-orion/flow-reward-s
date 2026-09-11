import { Search, XCircle, Undo2, ChevronRight } from 'lucide-react';
import { SectionCard } from '@/components/app/SectionCard';
import { EmptyState } from '@/components/app/EmptyState';
import { StatusBadge, type StatusVariant } from '@/components/app/StatusBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatNumberBR } from '@/lib/formatters';
import { formatDateBR } from '@/lib/dateTime';
import { DELIVERY_TYPE_LABEL, RETURN_CONDITION_LABEL, RETURN_DESTINATION_LABEL } from '../../domain/domainConstants';
import type { DeliveryType, ReturnCondition, ReturnDestination } from '../../types/inventory.types';
import type { EntregaCancel, DevEstorno } from '../../hooks/useInventoryReversals';

const ELEG_CANCEL: Record<string, { label: string; variant: StatusVariant }> = { ELEGIVEL: { label: 'Elegível', variant: 'success' }, BLOQUEADA_DEVOLUCAO: { label: 'Bloqueada', variant: 'warning' } };
const ELEG_EST: Record<string, { label: string; variant: StatusVariant }> = { ELEGIVEL: { label: 'Elegível', variant: 'success' }, JA_ESTORNADA: { label: 'Estornada', variant: 'neutral' }, BLOQUEADA_SALDO: { label: 'Bloqueada por saldo', variant: 'warning' } };

export function DeliveryCancellationPanel({ itens, buscaRaw, setBusca, unidadeNome, loading, onRevisar, podeEstornar = true }: {
  itens: EntregaCancel[]; buscaRaw: string; setBusca: (v: string) => void; unidadeNome: Map<string, string>; loading: boolean; onRevisar: (x: EntregaCancel) => void;
  /** Permissão de estornar (ver src/config/permissions.ts). */
  podeEstornar?: boolean;
}) {
  return (
    <SectionCard title="Cancelar entrega" description="Reverta uma entrega confirmada e devolva os itens ao estoque, quando permitido.">
      <div className="space-y-3">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={buscaRaw} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por recibo, colaborador, setor..." className="pl-9" aria-label="Buscar entrega" /></div>
        {loading ? <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          : itens.length === 0 ? <EmptyState icon={XCircle} title="Nenhuma entrega disponível" description="Entregas canceladas ou com dependências ativas não aparecem para cancelamento." />
            : (
              <TooltipProvider delayDuration={150}>
                <ul className="max-h-[26rem] space-y-2 overflow-y-auto">
                  {itens.map((x) => { const b = ELEG_CANCEL[x.eleg]; const elegivel = x.eleg === 'ELEGIVEL'; return (
                    <li key={x.e.id} className="rounded-lg border border-border/60 p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0"><div className="font-mono text-xs font-medium text-foreground">{x.e.recibo}</div><div className="truncate text-sm text-foreground">{x.funcionario?.nome ?? x.e.funcionario?.nome ?? '—'}</div>
                          <div className="truncate text-xs text-muted-foreground">{DELIVERY_TYPE_LABEL[x.e.tipo as DeliveryType] ?? x.e.tipo} · {unidadeNome.get(x.e.unidade_id) ?? '—'} · {(x.e.itens ?? []).length} itens · {formatNumberBR(x.pecas)} pç · {formatDateBR(x.e.created_at)}</div></div>
                        {elegivel ? <StatusBadge variant={b.variant}>{b.label}</StatusBadge>
                          : <Tooltip><TooltipTrigger asChild><span><StatusBadge variant={b.variant}>{b.label}</StatusBadge></span></TooltipTrigger><TooltipContent>{x.motivoBloqueio}</TooltipContent></Tooltip>}
                      </div>
                      {elegivel && podeEstornar && <div className="mt-2 flex justify-end"><Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => onRevisar(x)}>Revisar cancelamento <ChevronRight className="h-3.5 w-3.5" /></Button></div>}
                      {!elegivel && <p className="mt-1 text-xs text-muted-foreground">{x.motivoBloqueio}</p>}
                    </li>
                  ); })}
                </ul>
              </TooltipProvider>
            )}
      </div>
    </SectionCard>
  );
}

export function ReturnReversalPanel({ itens, buscaRaw, setBusca, unidadeNome, loading, onRevisar, podeEstornar = true }: {
  itens: DevEstorno[]; buscaRaw: string; setBusca: (v: string) => void; unidadeNome: Map<string, string>; loading: boolean; onRevisar: (x: DevEstorno) => void;
  /** Permissão de estornar (ver src/config/permissions.ts). */
  podeEstornar?: boolean;
}) {
  return (
    <SectionCard title="Estornar devolução" description="Reverta uma devolução ativa e desfaça a reentrada no estoque, quando aplicável.">
      <div className="space-y-3">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={buscaRaw} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por recibo, colaborador ou item..." className="pl-9" aria-label="Buscar devolução" /></div>
        {loading ? <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          : itens.length === 0 ? <EmptyState icon={Undo2} title="Nenhuma devolução disponível" description="Não há devoluções ativas que possam ser revertidas." />
            : (
              <TooltipProvider delayDuration={150}>
                <ul className="max-h-[26rem] space-y-2 overflow-y-auto">
                  {itens.map((x) => { const b = ELEG_EST[x.eleg]; const elegivel = x.eleg === 'ELEGIVEL'; return (
                    <li key={x.d.id} className="rounded-lg border border-border/60 p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0"><div className="truncate text-sm font-medium text-foreground">{x.d.varianteNome} <span className="text-xs text-muted-foreground">×{formatNumberBR(x.d.quantidade)}</span></div>
                          <div className="truncate text-xs text-muted-foreground">{x.d.recibo} · {x.d.funcionarioNome}</div>
                          <div className="truncate text-[11px] text-muted-foreground">{RETURN_CONDITION_LABEL[x.d.condicao as ReturnCondition] ?? x.d.condicao} → {RETURN_DESTINATION_LABEL[x.d.destino as ReturnDestination] ?? x.d.destino} · {x.d.reestocado ? 'Reestocado' : 'Sem reentrada'} · {formatDateBR(x.d.createdAt)}</div></div>
                        {elegivel ? <StatusBadge variant={b.variant}>{b.label}</StatusBadge>
                          : <Tooltip><TooltipTrigger asChild><span><StatusBadge variant={b.variant}>{b.label}</StatusBadge></span></TooltipTrigger><TooltipContent>{x.motivoBloqueio}</TooltipContent></Tooltip>}
                      </div>
                      {elegivel && podeEstornar && <div className="mt-2 flex justify-end"><Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => onRevisar(x)}>Revisar estorno <ChevronRight className="h-3.5 w-3.5" /></Button></div>}
                      {!elegivel && <p className="mt-1 text-xs text-muted-foreground">{x.motivoBloqueio}</p>}
                    </li>
                  ); })}
                </ul>
              </TooltipProvider>
            )}
      </div>
    </SectionCard>
  );
}
