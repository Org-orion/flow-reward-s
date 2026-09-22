import { Loader2, CheckCircle2, PackageCheck, Info, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/app/StatusBadge';
import { cn } from '@/lib/utils';
import { formatNumberBR, formatCurrencyBRL } from '@/lib/formatters';
import { RETURN_CONDITION_LABEL, RETURN_DESTINATION_LABEL } from '../../domain/domainConstants';
import type { ReturnCondition, ReturnDestination } from '../../types/inventory.types';

export interface RevisaoDev {
  recibo: string; colaborador: string; item: string; qtd: number; condicaoLabel: string; destinoLabel: string;
  reestoca: boolean; saldoAtual: number; saldoFinal: number; impacto: number | null; motivo: string; usuario: string;
}

export function StockReturnReviewDialog({ open, onOpenChange, saving, onConfirm, dados }: {
  open: boolean; onOpenChange: (o: boolean) => void; saving: boolean; onConfirm: () => void; dados: RevisaoDev | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar devolução</DialogTitle>
          <DialogDescription>{dados?.reestoca ? `A devolução adicionará ${dados ? formatNumberBR(dados.qtd) : ''} peça(s) ao saldo da unidade.` : 'A devolução será registrada, mas não alterará o saldo disponível.'}</DialogDescription>
        </DialogHeader>
        {dados && (
          <div className="space-y-3">
            <div className={cn('rounded-lg border p-3 text-center', dados.reestoca ? 'border-success/30 bg-success/5' : 'border-border/60 bg-muted/20')}>
              <div className="flex items-center justify-center gap-2 text-sm tabular-nums"><span className="text-muted-foreground">{formatNumberBR(dados.saldoAtual)}</span><ArrowRight className={cn('h-4 w-4', dados.reestoca ? 'text-success' : 'text-muted-foreground')} /><span className="text-lg font-bold text-foreground">{formatNumberBR(dados.saldoFinal)}</span></div>
              <div className="mt-1 flex items-center justify-center gap-1.5 text-xs">{dados.reestoca ? <><PackageCheck className="h-3.5 w-3.5 text-success" /><span className="font-medium text-success">Retorna ao estoque</span></> : <><Info className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Sem reentrada</span></>}</div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Campo rot="Recibo de origem" val={dados.recibo} />
              <Campo rot="Colaborador" val={dados.colaborador} />
              <Campo rot="Item" val={dados.item} />
              <Campo rot="Quantidade" val={`${formatNumberBR(dados.qtd)} pç`} />
              <Campo rot="Condição" val={dados.condicaoLabel} />
              <Campo rot="Destino" val={dados.destinoLabel} />
              <Campo rot="Valor estimado" val={dados.impacto != null ? `+${formatCurrencyBRL(dados.impacto)}` : (dados.reestoca ? '—' : 'Não retorna')} />
              <Campo rot="Responsável" val={dados.usuario} />
            </dl>
            {dados.motivo.trim() && <div className="rounded-lg bg-muted/40 p-2.5"><p className="text-xs text-muted-foreground">Motivo</p><p className="text-sm text-foreground">{dados.motivo.trim()}</p></div>}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Voltar</Button>
          <Button onClick={onConfirm} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar devolução</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StockReturnSuccessDialog({ sucesso, onOpenChange, onNova, onVerMovimentacoes, onVoltar }: {
  sucesso: null | { recibo: string; item: string; quantidade: number; condicao: ReturnCondition; destino: ReturnDestination; reestocado: boolean; saldoAntes: number; saldoDepois: number };
  onOpenChange: (o: boolean) => void; onNova: () => void; onVerMovimentacoes: () => void; onVoltar: () => void;
}) {
  return (
    <Dialog open={sucesso !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" /> Devolução registrada</DialogTitle>
          <DialogDescription>{sucesso?.reestocado ? 'Item devolvido e reintegrado ao saldo da unidade.' : 'Item devolvido; sem reentrada no saldo.'}</DialogDescription>
        </DialogHeader>
        {sucesso && (
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
            <div className="flex items-center justify-between gap-2"><span className="truncate font-medium text-foreground">{sucesso.item}</span><span className="font-mono text-xs text-muted-foreground">{sucesso.recibo}</span></div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <StatusBadge variant="neutral">{RETURN_CONDITION_LABEL[sucesso.condicao]}</StatusBadge><span>→ {RETURN_DESTINATION_LABEL[sucesso.destino]}</span>
              {sucesso.reestocado ? <StatusBadge variant="success">Reestocado</StatusBadge> : <StatusBadge variant="neutral">Sem reentrada</StatusBadge>}
            </div>
            <div className="mt-2 flex items-center justify-center gap-2 tabular-nums"><span className="text-muted-foreground">{formatNumberBR(sucesso.saldoAntes)}</span><ArrowRight className="h-4 w-4 text-muted-foreground" /><span className="text-lg font-bold text-foreground">{formatNumberBR(sucesso.saldoDepois)}</span></div>
          </div>
        )}
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={onVoltar}>Fardamentos</Button>
          <Button variant="outline" onClick={onVerMovimentacoes}>Ver movimentações</Button>
          <Button onClick={onNova}>Nova devolução</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Campo({ rot, val }: { rot: string; val: string }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{rot}</dt><dd className="truncate font-medium text-foreground">{val}</dd></div>;
}
