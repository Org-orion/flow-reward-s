import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Repeat2, History, ArrowLeftRight, ShieldCheck, PackageCheck, FileCheck2, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { SectionCard } from '@/components/app/SectionCard';
import { Button } from '@/components/ui/button';
import { useStockReturns } from '../hooks/useStockReturns';
import { DeliveryOriginPanel } from '../components/returns/DeliveryOriginPanel';
import { ReturnForm } from '../components/returns/ReturnForm';
import { ReturnImpactPanel, PreviousReturns } from '../components/returns/ReturnImpactPanel';
import { RecentReturns } from '../components/returns/RecentReturns';
import { StockReturnReviewDialog, StockReturnSuccessDialog, type RevisaoDev } from '../components/returns/StockReturnDialogs';
import { AdjustmentWarnings } from '../components/adjustment/AdjustmentWarnings';
import { ReciboEntregaDialog } from '../components/ReciboEntregaDialog';
import { getEntregaRecibo, type ReciboEntrega } from '../services/inventoryApi';
import { RETURN_CONDITION_LABEL, RETURN_DESTINATION_LABEL } from '../domain/domainConstants';
import type { AjusteAviso } from '../hooks/useStockAdjustment';
import { useResourceAccess } from '@/hooks/useResourceAccess';

const chip = 'inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground';

export function DevolucoesView() {
  const navigate = useNavigate();
  const r = useStockReturns();
  const [revisar, setRevisar] = useState(false);

  // Permissões desta tela (ver src/config/permissions.ts).
  const acesso = useResourceAccess('est_devolucoes');
  const podeRegistrar = acesso.podeCriar;
  const [recibo, setRecibo] = useState<ReciboEntrega | null>(null);

  const unidadeNomeMap = useMemo(() => new Map(r.unidades.map((u) => [u.id, u.nome])), [r.unidades]);

  const avisos = useMemo<AjusteAviso[]>(() => {
    const out: AjusteAviso[] = [];
    if (r.excede) out.push({ tipo: 'danger', texto: `Quantidade excede o disponível para devolução (${r.dispQtd}).` });
    if (r.historico.length > 0) out.push({ tipo: 'info', texto: `Esta entrega já possui ${r.historico.length} devolução(ões) registrada(s).` });
    if (r.varianteId && r.qtdValida && !r.reestoca) out.push({ tipo: 'info', texto: 'A combinação escolhida não reintegra o item ao saldo do estoque.' });
    return out;
  }, [r.excede, r.dispQtd, r.historico.length, r.varianteId, r.qtdValida, r.reestoca]);

  const revisao = useMemo<RevisaoDev | null>(() => {
    if (!r.entrega || !r.varianteId || !r.qtdValida) return null;
    return {
      recibo: r.entrega.recibo, colaborador: r.funcionario?.nome ?? r.entrega.funcionario?.nome ?? '—', item: r.dispSel?.nome ?? 'Item',
      qtd: r.qtd, condicaoLabel: RETURN_CONDITION_LABEL[r.condicao], destinoLabel: RETURN_DESTINATION_LABEL[r.destino],
      reestoca: r.reestoca, saldoAtual: r.saldoAtual, saldoFinal: r.saldoFinal, impacto: r.impacto, motivo: r.motivo, usuario: r.usuario,
    };
  }, [r.entrega, r.varianteId, r.qtdValida, r.funcionario, r.dispSel, r.qtd, r.condicao, r.destino, r.reestoca, r.saldoAtual, r.saldoFinal, r.impacto, r.motivo, r.usuario]);

  const confirmar = async () => {
    if (!podeRegistrar) return; const ok = await r.confirmar(); if (ok) setRevisar(false); };
  const verRecibo = async (id: string) => { try { setRecibo(await getEntregaRecibo(id)); } catch { /* toast global */ } };

  const acoes = (
    <div className="flex items-center gap-2">
      <Button variant="outline" className="gap-2" onClick={() => navigate('/controle-estoque/movimentacoes')}><History className="h-4 w-4" /><span className="hidden sm:inline">Ver histórico de devoluções</span></Button>
      <Button variant="ghost" className="gap-2" onClick={() => navigate('/controle-estoque/movimentacoes')}><ArrowLeftRight className="h-4 w-4" /><span className="hidden sm:inline">Abrir movimentações</span></Button>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <PageHeader icon={Repeat2} title="Devoluções" description="Registre a devolução de itens entregues e defina o destino de cada peça." actions={acoes} />

      <div className="-mt-2 flex flex-wrap items-center gap-2">
        <span className={chip}><ShieldCheck className="h-3 w-3" /> Vinculada à entrega original</span>
        <span className={chip}><FileCheck2 className="h-3 w-3" /> Quantidade disponível validada</span>
        <span className={chip}><PackageCheck className="h-3 w-3" /> Reentrada conforme condição/destino</span>
        <span className={chip}>Auditoria automática</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)]">
        {/* Esquerda: origem + histórico + recentes */}
        <div className="space-y-5">
          <DeliveryOriginPanel
            buscaRaw={r.buscaRaw} setBusca={r.setBusca} fUnidade={r.fUnidade} setFUnidade={r.setFUnidade} fComDisponivel={r.fComDisponivel} setFComDisponivel={r.setFComDisponivel}
            unidades={r.unidades} lista={r.lista} loading={r.loadingEntregas} entrega={r.entrega} funcionario={r.funcionario} disponiveis={r.disponiveis}
            onSelect={r.selecionarEntrega} onLimpar={r.limparEntrega} onVerRecibo={verRecibo} onAbrirEntrega={() => navigate('/controle-estoque/movimentacoes')}
          />
          {r.entrega && <PreviousReturns historico={r.historico} />}
          <RecentReturns recentes={r.recentes} unidadeNome={unidadeNomeMap} loading={r.loadingRecentes} />
        </div>

        {/* Direita: formulário + impacto + revisão */}
        <div className="space-y-5">
          <SectionCard title="Nova devolução" description="Item, quantidade, condição e destino.">
            <ReturnForm hasEntrega={!!r.entrega} loadingDisp={r.loadingDisp} disponiveis={r.disponiveis}
              varianteId={r.varianteId} setVarianteId={r.setVarianteId} quantidadeRaw={r.quantidadeRaw} setQuantidadeRaw={r.setQuantidadeRaw}
              dispQtd={r.dispQtd} qtd={r.qtd} qtdValida={r.qtdValida} excede={r.excede} condicao={r.condicao} setCondicao={r.setCondicao}
              destino={r.destino} setDestino={r.setDestino} motivo={r.motivo} setMotivo={r.setMotivo} motivoObrigatorio={r.motivoObrigatorio} motivoMax={r.MOTIVO_MAX} />
          </SectionCard>

          {r.entrega && r.varianteId && (
            <ReturnImpactPanel ativo={r.qtdValida} itemNome={r.dispSel?.nome ?? null} unidadeNome={unidadeNomeMap.get(r.entrega.unidade_id) ?? null}
              qtd={r.qtd} qtdValida={r.qtdValida} reestoca={r.reestoca} saldoAtual={r.saldoAtual} saldoFinal={r.saldoFinal} impacto={r.impacto}
              restante={r.dispQtd - (r.qtdValida ? r.qtd : 0)} destino={r.destino} />
          )}

          <AdjustmentWarnings avisos={avisos} />

          <SectionCard title="Revisão e confirmação" description="Revise antes de registrar a devolução.">
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">{!podeRegistrar ? 'Você tem acesso de consulta a esta tela, mas não tem permissão para registrar a operação.' : r.podeRevisar ? 'Tudo pronto — revise antes de confirmar.' : 'Selecione a entrega, o item, a quantidade e a condição/destino.'}</p>
              <Button size="lg" className="gap-2" disabled={!podeRegistrar || !r.podeRevisar || r.saving} onClick={() => setRevisar(true)}>{r.saving && <Loader2 className="h-4 w-4 animate-spin" />} Revisar devolução</Button>
            </div>
            {r.erro && <p className="mt-2 text-sm text-destructive">{r.erro}</p>}
          </SectionCard>
        </div>
      </div>

      <StockReturnReviewDialog open={revisar && podeRegistrar} onOpenChange={setRevisar} saving={r.saving} onConfirm={confirmar} dados={revisao} />
      <StockReturnSuccessDialog sucesso={r.sucesso} onOpenChange={(o) => { if (!o) r.reset(); }}
        onNova={r.reset} onVerMovimentacoes={() => navigate('/controle-estoque/movimentacoes')} onVoltar={() => navigate('/controle-estoque/fardamentos')} />
      <ReciboEntregaDialog recibo={recibo} onOpenChange={(o) => { if (!o) setRecibo(null); }} />
    </div>
  );
}
