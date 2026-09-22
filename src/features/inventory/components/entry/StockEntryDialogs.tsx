import { Loader2, CheckCircle2, ShieldCheck, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/app/StatusBadge';
import { formatNumberBR, formatCurrencyBRL } from '@/lib/formatters';
import { formatDateBR } from '@/lib/dateTime';
import type { EntradaItemRow, EntradaSucesso } from '../../hooks/useStockEntry';

interface RevProps {
  open: boolean; onOpenChange: (o: boolean) => void; saving: boolean; uploading: boolean; onConfirm: () => void;
  unidade: string | null; data: string; rows: EntradaItemRow[];
  totais: { pecas: number; valor: number }; temNf: boolean; observacao: string; usuario: string;
}

export function StockEntryReviewDialog({ open, onOpenChange, saving, uploading, onConfirm, unidade, data, rows, totais, temNf, observacao, usuario }: RevProps) {
  const ocupado = saving || uploading;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar entrada</DialogTitle>
          <DialogDescription>A entrada atualizará os saldos da unidade selecionada e será registrada na movimentação e auditoria.</DialogDescription>
        </DialogHeader>
        <div className="min-w-0 space-y-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Campo rot="Unidade" val={unidade ?? '—'} />
            <Campo rot="Data de chegada" val={data ? formatDateBR(data) : '—'} />
            <Campo rot="Total de peças" val={`+${formatNumberBR(totais.pecas)}`} />
            <Campo rot="Valor estimado" val={totais.valor > 0 ? formatCurrencyBRL(totais.valor) : 'Indisponível'} />
            <Campo rot="Nota fiscal" val={temNf ? 'Anexada' : 'Não anexada'} />
            <Campo rot="Responsável" val={usuario} />
          </dl>
          <div className="rounded-lg border border-border/60">
            <div className="border-b border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">{rows.length} {rows.length === 1 ? 'item' : 'itens'}</div>
            <ul className="max-h-52 divide-y divide-border/40 overflow-y-auto">
              {rows.map((r) => (
                <li key={r.varianteId} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-foreground">{r.f.variante.nome}{r.f.tamanhoRotulo ? ` · ${r.f.tamanhoRotulo}` : ''}</span>
                  <span className="shrink-0 tabular-nums"><span className="text-muted-foreground">{formatNumberBR(r.saldoAtual)}→{formatNumberBR(r.saldoFinal)}</span> <span className="font-semibold text-success">+{formatNumberBR(r.quantidade)}</span></span>
                </li>
              ))}
            </ul>
          </div>
          {observacao.trim() && <div className="rounded-lg bg-muted/40 p-2.5"><p className="text-xs text-muted-foreground">Observação</p><p className="text-sm text-foreground">{observacao.trim()}</p></div>}
          <p className="flex items-start gap-2 rounded-lg border border-[hsl(217_90%_55%)]/30 bg-[hsl(217_90%_55%)]/5 px-3 py-2 text-xs text-foreground/90"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(217_90%_45%)]" /> Operação transacional: todos os itens são registrados juntos; em caso de falha, nada é aplicado.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={ocupado}>Voltar</Button>
          <Button onClick={onConfirm} disabled={ocupado}>{ocupado && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{uploading ? 'Enviando NF...' : 'Confirmar entrada'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StockEntrySuccessDialog({ sucesso, onOpenChange, onNova, onVerMovimentacoes, onVoltar }: {
  sucesso: EntradaSucesso | null; onOpenChange: (o: boolean) => void; onNova: () => void; onVerMovimentacoes: () => void; onVoltar: () => void;
}) {
  return (
    <Dialog open={sucesso !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" /> Entrada registrada</DialogTitle>
          <DialogDescription>Os saldos da unidade foram atualizados e a operação foi auditada.</DialogDescription>
        </DialogHeader>
        {sucesso && (
          <div className="flex items-center justify-around rounded-lg border border-border/70 bg-muted/20 p-4 text-center">
            <div><div className="text-2xl font-bold tabular-nums text-foreground">{formatNumberBR(sucesso.itens)}</div><div className="text-xs text-muted-foreground">itens</div></div>
            <div><div className="text-2xl font-bold tabular-nums text-success">+{formatNumberBR(sucesso.pecas)}</div><div className="text-xs text-muted-foreground">peças</div></div>
            <div>{sucesso.comNf ? <StatusBadge variant="info"><FileText className="mr-1 h-3 w-3" />NF</StatusBadge> : <StatusBadge variant="neutral">Sem NF</StatusBadge>}</div>
          </div>
        )}
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={onVoltar}>Fardamentos</Button>
          <Button variant="outline" onClick={onVerMovimentacoes}>Ver movimentações</Button>
          <Button onClick={onNova}>Nova entrada</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Campo({ rot, val }: { rot: string; val: string }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{rot}</dt><dd className="font-medium text-foreground">{val}</dd></div>;
}
