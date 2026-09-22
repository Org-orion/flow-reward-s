import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, ShieldCheck, ArrowUp, ArrowDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { formatNumberBR, formatCurrencyBRL } from '@/lib/formatters';
import type { AjusteSucesso } from '../../hooks/useStockAdjustment';

export interface RevisaoDados {
  item: string; codigo: string; unidade: string; saldoAtual: number; contagem: number;
  diferenca: number; saldoFinal: number; entrada: boolean; motivo: string; impacto: number | null; usuario: string;
}

export function AdjustmentReviewDialog({ open, onOpenChange, dados, saving, onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void; dados: RevisaoDados | null; saving: boolean; onConfirm: () => void;
}) {
  const [confirmado, setConfirmado] = useState(false);
  useEffect(() => { if (open) setConfirmado(false); }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar ajuste</DialogTitle>
          <DialogDescription>Confira os dados antes de confirmar. Esta operação será registrada na auditoria.</DialogDescription>
        </DialogHeader>

        {dados && (
          <div className="space-y-3">
            <div className={cn('rounded-lg border p-3 text-center', dados.entrada ? 'border-success/30 bg-success/5' : 'border-status-warning/30 bg-status-warning/5')}>
              <div className={cn('flex items-center justify-center gap-1 text-xl font-bold tabular-nums', dados.entrada ? 'text-success' : 'text-status-warning')}>
                {dados.entrada ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}{dados.diferenca > 0 ? '+' : ''}{formatNumberBR(dados.diferenca)} peças
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">{dados.entrada ? 'Ajuste de entrada' : 'Ajuste de saída'} · {formatNumberBR(dados.saldoAtual)} → {formatNumberBR(dados.saldoFinal)}</div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Campo rot="Item" val={dados.item} />
              <Campo rot="Código" val={dados.codigo} />
              <Campo rot="Unidade" val={dados.unidade} />
              <Campo rot="Contagem" val={`${formatNumberBR(dados.contagem)} pç`} />
              <Campo rot="Impacto financeiro" val={dados.impacto != null ? `${dados.impacto > 0 ? '+' : ''}${formatCurrencyBRL(dados.impacto)}` : 'Indisponível'} />
              <Campo rot="Responsável" val={dados.usuario} />
            </dl>
            <div className="rounded-lg bg-muted/40 p-2.5"><p className="text-xs text-muted-foreground">Motivo</p><p className="text-sm text-foreground">{dados.motivo}</p></div>
            <p className="flex items-start gap-2 rounded-lg border border-[hsl(217_90%_55%)]/30 bg-[hsl(217_90%_55%)]/5 px-3 py-2 text-xs text-foreground/90">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(217_90%_45%)]" /> Esta operação alterará o saldo somente da unidade selecionada e será registrada na auditoria.
            </p>
            <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <Checkbox checked={confirmado} onCheckedChange={(v) => setConfirmado(Boolean(v))} className="mt-0.5" />
              Confirmo que a quantidade informada corresponde à contagem física.
            </label>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={onConfirm} disabled={saving || !confirmado}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar ajuste</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdjustmentSuccessDialog({ sucesso, onOpenChange, onNovo, onVerMovimentacoes, onVoltar }: {
  sucesso: AjusteSucesso | null; onOpenChange: (o: boolean) => void; onNovo: () => void; onVerMovimentacoes: () => void; onVoltar: () => void;
}) {
  return (
    <Dialog open={sucesso !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" /> Ajuste registrado</DialogTitle>
          <DialogDescription>O saldo da unidade foi atualizado e a operação foi auditada.</DialogDescription>
        </DialogHeader>
        {sucesso && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
              <div className="font-medium text-foreground">{sucesso.item} <span className="font-mono text-xs text-muted-foreground">{sucesso.codigo}</span></div>
              <div className="text-xs text-muted-foreground">{sucesso.unidade}</div>
              <div className="mt-2 flex items-center justify-center gap-2 text-lg font-bold tabular-nums">
                <span className="text-muted-foreground">{formatNumberBR(sucesso.saldoAnterior)}</span><span aria-hidden>→</span><span className="text-foreground">{formatNumberBR(sucesso.saldoNovo)}</span>
                <span className={cn('text-sm', sucesso.diferenca >= 0 ? 'text-success' : 'text-status-warning')}>({sucesso.diferenca > 0 ? '+' : ''}{formatNumberBR(sucesso.diferenca)})</span>
              </div>
            </div>
          </div>
        )}
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={onVoltar}>Voltar aos fardamentos</Button>
          <Button variant="outline" onClick={onVerMovimentacoes}>Ver movimentações</Button>
          <Button onClick={onNovo}>Fazer novo ajuste</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Campo({ rot, val }: { rot: string; val: string }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{rot}</dt><dd className="font-medium text-foreground">{val}</dd></div>;
}
