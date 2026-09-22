import { Loader2, CheckCircle2, ShieldCheck, ArrowLeftRight, ArrowRight, Printer, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatNumberBR, formatCurrencyBRL } from '@/lib/formatters';
import { formatDateBR } from '@/lib/dateTime';
import { imprimirRecibo } from '../../services/reciboImpressao';
import type { ReciboEntrega } from '../../services/inventoryApi';

export interface RevisaoTroca {
  recibo: string; colaborador: string; itemAntigo: string; itemNovo: string; qtd: number;
  saldoDevAtual: number; saldoDevFinal: number; saldoNovaAtual: number; saldoNovaFinal: number;
  motivo: string; diferenca: number | null; usuario: string;
}

export function StockExchangeReviewDialog({ open, onOpenChange, saving, onConfirm, dados }: {
  open: boolean; onOpenChange: (o: boolean) => void; saving: boolean; onConfirm: () => void; dados: RevisaoTroca | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>Revisar troca</DialogTitle>
          <DialogDescription>A troca será executada em uma única operação. Se a nova entrega falhar, nenhuma alteração será mantida.</DialogDescription></DialogHeader>
        {dados && (
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <Bloco tone="success" titulo="Devolvido" nome={dados.itemAntigo} atual={dados.saldoDevAtual} final={dados.saldoDevFinal} />
              <ArrowLeftRight className="h-5 w-5 text-primary" />
              <Bloco tone="info" titulo="Novo" nome={dados.itemNovo} atual={dados.saldoNovaAtual} final={dados.saldoNovaFinal} />
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Campo rot="Recibo de origem" val={dados.recibo} />
              <Campo rot="Colaborador" val={dados.colaborador} />
              <Campo rot="Quantidade" val={`${formatNumberBR(dados.qtd)} pç`} />
              <Campo rot="Diferença de custo" val={dados.diferenca != null ? `${dados.diferenca > 0 ? '+' : ''}${formatCurrencyBRL(dados.diferenca)}` : 'Incompleto'} />
              <Campo rot="Responsável" val={dados.usuario} />
            </dl>
            {dados.motivo.trim() && <div className="rounded-lg bg-muted/40 p-2.5"><p className="text-xs text-muted-foreground">Motivo</p><p className="text-sm text-foreground">{dados.motivo.trim()}</p></div>}
            <p className="flex items-start gap-2 rounded-lg border border-[hsl(217_90%_55%)]/30 bg-[hsl(217_90%_55%)]/5 px-3 py-2 text-xs text-foreground/90"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(217_90%_45%)]" /> Operação atômica: devolução + nova entrega + novo termo em uma transação. Rollback integral em caso de falha.</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Voltar</Button>
          <Button onClick={onConfirm} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar troca</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StockExchangeSuccessDialog({ recibo, itemNovo, onOpenChange, onNova, onVerMovimentacoes, onVoltar }: {
  recibo: ReciboEntrega | null; itemNovo: string; onOpenChange: (o: boolean) => void; onNova: () => void; onVerMovimentacoes: () => void; onVoltar: () => void;
}) {
  return (
    <Dialog open={recibo !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" /> Troca registrada</DialogTitle>
          <DialogDescription>Devolução e nova entrega concluídas em uma única operação. Novo termo emitido.</DialogDescription></DialogHeader>
        {recibo && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
              <div className="flex items-center justify-between gap-2"><span className="font-mono font-medium text-primary">{recibo.recibo}</span><span className="text-xs text-muted-foreground">{recibo.unidadeNome}</span></div>
              <div className="mt-1 truncate font-medium text-foreground">{recibo.colaboradorNome}</div>
              <div className="mt-1 text-xs text-muted-foreground">Novo item: {itemNovo}</div>
            </div>
            <Button className="w-full gap-2" onClick={() => imprimirRecibo(recibo, recibo.operadorNome)}><Printer className="h-4 w-4" /> Emitir recibo da nova entrega</Button>
          </div>
        )}
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={onVoltar}>Fardamentos</Button>
          <Button variant="outline" onClick={onVerMovimentacoes}>Ver movimentações</Button>
          <Button variant="outline" onClick={onNova}>Nova troca</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ExchangeTermPreviewDialog({ open, onOpenChange, colaborador, itemNovo, itemNovoTam, qtd, motivo, unidade, reciboAnterior }: {
  open: boolean; onOpenChange: (o: boolean) => void; colaborador: string; itemNovo: string; itemNovoTam: string; qtd: number; motivo: string; unidade: string; reciboAnterior: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Prévia do novo termo</DialogTitle>
          <DialogDescription>Prévia — o termo definitivo (snapshot imutável) é gerado ao confirmar a troca.</DialogDescription></DialogHeader>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Campo rot="Colaborador" val={colaborador} />
          <Campo rot="Unidade" val={unidade} />
          <Campo rot="Novo item" val={`${itemNovo}${itemNovoTam ? ` · ${itemNovoTam}` : ''}`} />
          <Campo rot="Quantidade" val={`${formatNumberBR(qtd)} pç`} />
          <Campo rot="Data" val={formatDateBR(new Date().toISOString())} />
          <Campo rot="Entrega anterior" val={reciboAnterior} />
        </dl>
        {motivo.trim() && <div className="rounded-lg bg-muted/40 p-2.5 text-sm"><p className="text-xs text-muted-foreground">Motivo</p><p className="text-foreground">{motivo.trim()}</p></div>}
        <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">O termo anterior permanece registrado; o novo termo fica vinculado à troca. O texto legal definitivo é aplicado pelo sistema na emissão.</p>
      </DialogContent>
    </Dialog>
  );
}

function Bloco({ tone, titulo, nome, atual, final }: { tone: 'success' | 'info'; titulo: string; nome: string; atual: number; final: number }) {
  const border = tone === 'success' ? 'border-success/30 bg-success/5' : 'border-[hsl(217_90%_55%)]/30 bg-[hsl(217_90%_55%)]/5';
  const col = tone === 'success' ? 'text-success' : 'text-[hsl(217_90%_45%)]';
  return <div className={`rounded-lg border p-2.5 ${border}`}><div className="text-[11px] text-muted-foreground">{titulo}</div><div className="truncate text-sm font-medium text-foreground">{nome}</div><div className="mt-1 flex items-center gap-1 text-xs tabular-nums"><span className="text-muted-foreground">{formatNumberBR(atual)}</span><ArrowRight className={`h-3 w-3 ${col}`} /><span className="font-semibold text-foreground">{formatNumberBR(final)}</span></div></div>;
}
function Campo({ rot, val }: { rot: string; val: string }) { return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{rot}</dt><dd className="truncate font-medium text-foreground">{val}</dd></div>; }
