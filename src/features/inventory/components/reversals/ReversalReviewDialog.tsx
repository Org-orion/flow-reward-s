import { useEffect, useState } from 'react';
import { Loader2, ShieldAlert, ArrowRight, XCircle, Undo2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { formatNumberBR, formatCurrencyBRL } from '@/lib/formatters';
import { MOTIVO_MIN, MOTIVO_MAX, type EntregaCancel, type DevEstorno } from '../../hooks/useInventoryReversals';
import { RETURN_CONDITION_LABEL, RETURN_DESTINATION_LABEL } from '../../domain/domainConstants';
import type { ReturnCondition, ReturnDestination } from '../../types/inventory.types';

export type ReversalAlvo = { kind: 'cancel'; entrega: EntregaCancel } | { kind: 'estorno'; dev: DevEstorno };

interface Props {
  alvo: ReversalAlvo | null; onOpenChange: (o: boolean) => void; saving: boolean;
  saldoDe: (v: string, u: string) => number; custoDe: (v: string) => number; unidadeNome: Map<string, string>;
  onConfirm: (motivo: string) => void;
}

export function ReversalReviewDialog({ alvo, onOpenChange, saving, saldoDe, custoDe, unidadeNome, onConfirm }: Props) {
  const [motivo, setMotivo] = useState(''); const [ok, setOk] = useState(false);
  useEffect(() => { if (alvo) { setMotivo(''); setOk(false); } }, [alvo]);
  const motivoValido = motivo.trim().length >= MOTIVO_MIN && motivo.trim().length <= MOTIVO_MAX;

  const cancel = alvo?.kind === 'cancel' ? alvo.entrega : null;
  const estorno = alvo?.kind === 'estorno' ? alvo.dev : null;

  const itensCancel = cancel ? (cancel.e.itens ?? []).map((it) => {
    const saldo = saldoDe(it.variante_id, cancel.e.unidade_id);
    return { nome: it.variante?.nome ?? 'Item', codigo: it.variante?.codigo_interno ?? '', qtd: it.quantidade, saldo, final: saldo + it.quantidade, custo: custoDe(it.variante_id) };
  }) : [];
  const valorCancel = itensCancel.reduce((a, i) => a + i.qtd * i.custo, 0);

  const reestocouEstorno = estorno?.d.reestocado ?? false;
  const saldoEstorno = estorno ? estorno.saldoAtual : 0;
  const finalEstorno = reestocouEstorno && estorno ? saldoEstorno - estorno.d.quantidade : saldoEstorno;

  return (
    <Dialog open={alvo !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{cancel ? <><XCircle className="h-5 w-5 text-destructive" /> Cancelar entrega</> : <><Undo2 className="h-5 w-5 text-destructive" /> Estornar devolução</>}</DialogTitle>
          <DialogDescription>
            {cancel ? 'Devolve os itens ao estoque, cancela o termo relacionado e registra uma movimentação de estorno.'
              : reestocouEstorno ? 'Retira novamente do estoque os itens que haviam reentrado nesta devolução.' : 'Marca a devolução como estornada, sem alterar o saldo (não houve reentrada).'}
          </DialogDescription>
        </DialogHeader>

        {alvo && (
          <div className="space-y-3">
            {/* Contexto */}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {cancel ? <>
                <Campo rot="Recibo" val={cancel.e.recibo} />
                <Campo rot="Colaborador" val={cancel.funcionario?.nome ?? cancel.e.funcionario?.nome ?? '—'} />
                <Campo rot="Unidade" val={unidadeNome.get(cancel.e.unidade_id) ?? '—'} />
                <Campo rot="Peças ao estoque" val={`+${formatNumberBR(cancel.pecas)}`} />
              </> : estorno && <>
                <Campo rot="Recibo de origem" val={estorno.d.recibo} />
                <Campo rot="Colaborador" val={estorno.d.funcionarioNome} />
                <Campo rot="Item" val={`${estorno.d.varianteNome} ×${formatNumberBR(estorno.d.quantidade)}`} />
                <Campo rot="Condição/Destino" val={`${RETURN_CONDITION_LABEL[estorno.d.condicao as ReturnCondition] ?? estorno.d.condicao} → ${RETURN_DESTINATION_LABEL[estorno.d.destino as ReturnDestination] ?? estorno.d.destino}`} />
              </>}
            </dl>

            {/* Impacto */}
            {cancel ? (
              <div className="rounded-lg border border-border/60">
                <div className="border-b border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">Impacto no saldo · devolve {valorCancel > 0 ? formatCurrencyBRL(valorCancel) : `${formatNumberBR(cancel.pecas)} pç`}</div>
                <ul className="max-h-48 divide-y divide-border/40 overflow-y-auto">
                  {itensCancel.map((it, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span className="min-w-0 truncate text-foreground">{it.nome}</span>
                      <span className="flex shrink-0 items-center gap-1 tabular-nums"><span className="text-muted-foreground">{formatNumberBR(it.saldo)}</span><ArrowRight className="h-3 w-3 text-success" /><span className="font-semibold text-foreground">{formatNumberBR(it.final)}</span> <span className="font-medium text-success">+{formatNumberBR(it.qtd)}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : estorno && (
              <div className={cn('rounded-lg border p-3 text-center', reestocouEstorno ? 'border-status-warning/30 bg-status-warning/5' : 'border-border/60 bg-muted/20')}>
                <div className="flex items-center justify-center gap-2 text-sm tabular-nums"><span className="text-muted-foreground">{formatNumberBR(saldoEstorno)}</span><ArrowRight className={cn('h-4 w-4', reestocouEstorno ? 'text-status-warning' : 'text-muted-foreground')} /><span className="text-lg font-bold text-foreground">{formatNumberBR(finalEstorno)}</span></div>
                <div className="mt-1 text-xs text-muted-foreground">{reestocouEstorno ? `A reentrada será desfeita (−${formatNumberBR(estorno.d.quantidade)}).` : 'Sem impacto no saldo — não houve reentrada.'}</div>
              </div>
            )}

            {/* Motivo */}
            <div className="space-y-1.5">
              <Label htmlFor="motivo-rev" className="text-sm">Motivo da reversão *</Label>
              <Textarea id="motivo-rev" rows={2} maxLength={MOTIVO_MAX} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: lançamento incorreto; entrega duplicada; devolução registrada por engano; ajuste administrativo..." aria-invalid={motivo.trim().length > 0 && !motivoValido} />
              <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Ficará registrado na auditoria e não poderá ser removido.</span><span className="tabular-nums">{motivo.length}/{MOTIVO_MAX}</span></div>
            </div>

            <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-foreground/90"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> Estorno não é exclusão: o histórico é preservado e a operação original permanece visível. Reversão transacional e auditada.</p>
            <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground"><Checkbox checked={ok} onCheckedChange={(v) => setOk(Boolean(v))} className="mt-0.5" /> Confirmo que revisei o impacto desta reversão.</label>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Voltar</Button>
          <Button onClick={() => onConfirm(motivo)} disabled={saving || !motivoValido || !ok} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar reversão</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Campo({ rot, val }: { rot: string; val: string }) { return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{rot}</dt><dd className="truncate font-medium text-foreground">{val}</dd></div>; }
