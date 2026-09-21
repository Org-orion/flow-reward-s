import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, ShieldCheck, Printer, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatNumberBR, formatCurrencyBRL, pluralizeBR } from '@/lib/formatters';
import { formatDateTimeBR } from '@/lib/dateTime';
import { DELIVERY_TYPE_LABEL } from '../../domain/domainConstants';
import { imprimirRecibo } from '../../services/reciboImpressao';
import type { DeliveryItemRow } from '../../hooks/useStockDelivery';
import type { Funcionario } from '@/hooks/useFuncionarios';
import type { ReciboEntrega } from '../../services/inventoryApi';

interface RevProps {
  open: boolean; onOpenChange: (o: boolean) => void; saving: boolean; onConfirm: () => void;
  funcionario: Funcionario | null; unidadeNome: string | null; tipoLabel: string; rows: DeliveryItemRow[];
  totais: { pecas: number; valor: number }; valorCompra: string; temCompra: boolean; observacao: string; usuario: string;
}

export function StockDeliveryReviewDialog({ open, onOpenChange, saving, onConfirm, funcionario, unidadeNome, tipoLabel, rows, totais, valorCompra, temCompra, observacao, usuario }: RevProps) {
  const [ok, setOk] = useState(false);
  useEffect(() => { if (open) setOk(false); }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar entrega</DialogTitle>
          <DialogDescription>A operação baixará o saldo da unidade, gerará uma movimentação de saída e emitirá um termo de responsabilidade.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Campo rot="Colaborador" val={funcionario?.nome ?? '—'} />
            <Campo rot="Empresa" val={funcionario?.empresa?.nome ?? '—'} />
            <Campo rot="Unidade" val={unidadeNome ?? '—'} />
            <Campo rot="Tipo" val={tipoLabel} />
            <Campo rot="Total de peças" val={`−${formatNumberBR(totais.pecas)}`} />
            <Campo rot="Valor estimado" val={totais.valor > 0 ? formatCurrencyBRL(totais.valor) : 'Indisponível'} />
            {temCompra && <Campo rot="Valor da compra" val={formatCurrencyBRL(Number(valorCompra) || 0)} />}
            <Campo rot="Responsável" val={usuario} />
          </dl>
          <div className="rounded-lg border border-border/60">
            <div className="border-b border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">{rows.length} {rows.length === 1 ? 'item' : 'itens'}</div>
            <ul className="max-h-48 divide-y divide-border/40 overflow-y-auto">
              {rows.map((r) => (
                <li key={r.varianteId} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-foreground">{r.f.variante.nome}{r.f.tamanhoRotulo ? ` · ${r.f.tamanhoRotulo}` : ''}</span>
                  <span className="flex shrink-0 items-center gap-1 tabular-nums text-muted-foreground">{formatNumberBR(r.saldo)}<ArrowRight className="h-3 w-3" />{formatNumberBR(r.saldoFinal)} <span className="font-semibold text-status-warning">−{formatNumberBR(r.quantidade)}</span></span>
                </li>
              ))}
            </ul>
          </div>
          {observacao.trim() && <div className="rounded-lg bg-muted/40 p-2.5"><p className="text-xs text-muted-foreground">Observação</p><p className="text-sm text-foreground">{observacao.trim()}</p></div>}
          <p className="flex items-start gap-2 rounded-lg border border-[hsl(217_90%_55%)]/30 bg-[hsl(217_90%_55%)]/5 px-3 py-2 text-xs text-foreground/90"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(217_90%_45%)]" /> Operação transacional com termo imutável; em caso de falha, nada é aplicado.</p>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground"><Checkbox checked={ok} onCheckedChange={(v) => setOk(Boolean(v))} className="mt-0.5" /> Confirmo que os itens e quantidades foram conferidos com o colaborador.</label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Voltar</Button>
          <Button onClick={onConfirm} disabled={saving || !ok}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar entrega</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StockDeliverySuccessDialog({ recibo, onOpenChange, onNova, onVerMovimentacoes, onVoltar }: {
  recibo: ReciboEntrega | null; onOpenChange: (o: boolean) => void; onNova: () => void; onVerMovimentacoes: () => void; onVoltar: () => void;
}) {
  const totalPecas = recibo ? recibo.itens.reduce((a, it) => a + it.quantidade, 0) : 0;
  return (
    <Dialog open={recibo !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" /> Entrega registrada</DialogTitle>
          <DialogDescription>Saldo baixado, movimentação registrada e termo de responsabilidade emitido.</DialogDescription>
        </DialogHeader>
        {recibo && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg border border-border/70">
              {/* Identificação: recibo + tipo da entrega */}
              <div className="flex items-start justify-between gap-2 border-b border-border/60 bg-muted/30 px-3 py-2">
                <span className="font-mono text-sm font-semibold text-primary">{recibo.recibo}</span>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  {DELIVERY_TYPE_LABEL[recibo.tipo as keyof typeof DELIVERY_TYPE_LABEL] ?? recibo.tipo}
                </span>
              </div>

              {/* Quem recebeu, onde e quando */}
              <div className="px-3 py-2.5">
                <p className="truncate font-medium text-foreground">{recibo.colaboradorNome}</p>
                <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <Mini rot="Local de estoque" val={recibo.unidadeNome} />
                  <Mini rot="Data" val={formatDateTimeBR(recibo.createdAt)} />
                  <Mini rot="Emitido por" val={recibo.operadorNome} />
                  {recibo.valorCompra != null && <Mini rot="Valor cobrado" val={formatCurrencyBRL(recibo.valorCompra)} />}
                </dl>
              </div>

              {/* O que saiu — a informação principal de uma confirmação de baixa */}
              <ul className="max-h-40 divide-y divide-border/40 overflow-y-auto border-t border-border/60">
                {recibo.itens.map((it, i) => (
                  <li key={`${it.codigo}-${i}`} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
                    <span className="min-w-0 truncate text-foreground">
                      {it.nome}
                      {it.codigo && it.codigo !== '—' && <span className="ml-1 font-mono text-xs text-muted-foreground">{it.codigo}</span>}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-status-warning">−{formatNumberBR(it.quantidade)}</span>
                  </li>
                ))}
              </ul>

              {/* Totais com plural correto */}
              <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-3 py-2 text-sm">
                <span className="text-muted-foreground">{pluralizeBR(recibo.itens.length, 'item', 'itens')}</span>
                <span className="font-semibold text-status-warning">−{pluralizeBR(totalPecas, 'peça', 'peças')}</span>
              </div>
            </div>

            <Button className="w-full gap-2" onClick={() => imprimirRecibo(recibo, recibo.operadorNome)}><Printer className="h-4 w-4" /> Emitir recibo</Button>
          </div>
        )}
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="ghost" onClick={onVoltar} className="sm:mr-auto">Fardamentos</Button>
          <Button variant="outline" onClick={onVerMovimentacoes}>Ver movimentações</Button>
          <Button variant="secondary" onClick={onNova}>Nova entrega</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Par rótulo/valor compacto do cartão de sucesso. */
function Mini({ rot, val }: { rot: string; val: string }) {
  return <div className="min-w-0"><dt className="text-muted-foreground">{rot}</dt><dd className="truncate font-medium text-foreground">{val}</dd></div>;
}

function Campo({ rot, val }: { rot: string; val: string }) {
  return <div><dt className="text-xs text-muted-foreground">{rot}</dt><dd className="truncate font-medium text-foreground">{val}</dd></div>;
}
