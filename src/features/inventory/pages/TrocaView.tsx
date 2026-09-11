import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Replace, History, ArrowLeftRight, ShieldCheck, PackageCheck, FileText, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { SectionCard } from '@/components/app/SectionCard';
import { Button } from '@/components/ui/button';
import { useStockExchange } from '../hooks/useStockExchange';
import { DeliveryOriginPanel } from '../components/returns/DeliveryOriginPanel';
import { ExchangeForm } from '../components/exchange/ExchangeForm';
import { ExchangeFinancialPanel, PreviousExchanges, ExchangeTermCard } from '../components/exchange/ExchangeSidePanels';
import { RecentExchanges } from '../components/exchange/RecentExchanges';
import { StockExchangeReviewDialog, StockExchangeSuccessDialog, ExchangeTermPreviewDialog, type RevisaoTroca } from '../components/exchange/StockExchangeDialogs';
import { AdjustmentWarnings } from '../components/adjustment/AdjustmentWarnings';
import { ReciboEntregaDialog } from '../components/ReciboEntregaDialog';
import { getEntregaRecibo, type ReciboEntrega } from '../services/inventoryApi';
import type { AjusteAviso } from '../hooks/useStockAdjustment';
import { useResourceAccess } from '@/hooks/useResourceAccess';

const chip = 'inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground';

export function TrocaView() {
  const navigate = useNavigate();
  const x = useStockExchange();
  const [revisar, setRevisar] = useState(false);

  // Permissões desta tela (ver src/config/permissions.ts).
  const acesso = useResourceAccess('est_troca');
  const podeRegistrar = acesso.podeCriar;
  const [termo, setTermo] = useState(false);
  const [recibo, setRecibo] = useState<ReciboEntrega | null>(null);

  const unidadeNomeMap = useMemo(() => new Map(x.unidades.map((u) => [u.id, u.nome])), [x.unidades]);
  const unidadeNome = x.entrega ? (unidadeNomeMap.get(x.entrega.unidade_id) ?? null) : null;

  const avisos = useMemo<AjusteAviso[]>(() => {
    const out: AjusteAviso[] = [];
    if (x.excedeDisp) out.push({ tipo: 'danger', texto: `Quantidade excede o disponível para troca (${x.dispQtd}).` });
    if (x.excedeSaldo && !x.excedeDisp) out.push({ tipo: 'danger', texto: `Saldo insuficiente do novo item nesta unidade (${x.saldoNova}).` });
    if (x.mesmaVariante) out.push({ tipo: 'danger', texto: 'O novo item deve ser diferente do item devolvido.' });
    if (x.varianteNova && x.qtdValida && x.minimoNova > 0 && x.saldoNovaFinal <= x.minimoNova) out.push({ tipo: 'warn', texto: 'O novo item ficará abaixo do estoque mínimo após a troca.' });
    if (x.varianteNova && x.tamanhoSugerido && !x.compat) out.push({ tipo: 'info', texto: `Tamanho ${x.fardNova?.tamanhoRotulo} difere do cadastrado do colaborador (${x.tamanhoSugerido}).` });
    if (x.historico.length > 0) out.push({ tipo: 'info', texto: `Esta entrega já possui ${x.historico.length} troca(s) registrada(s).` });
    return out;
  }, [x.excedeDisp, x.dispQtd, x.excedeSaldo, x.saldoNova, x.mesmaVariante, x.varianteNova, x.qtdValida, x.minimoNova, x.saldoNovaFinal, x.tamanhoSugerido, x.compat, x.fardNova, x.historico.length]);

  const revisao = useMemo<RevisaoTroca | null>(() => {
    if (!x.entrega || !x.varianteDevolvida || !x.varianteNova || x.mesmaVariante || !x.qtdValida) return null;
    return {
      recibo: x.entrega.recibo, colaborador: x.funcionario?.nome ?? x.entrega.funcionario?.nome ?? '—',
      itemAntigo: `${x.fardDevolvida?.variante.nome ?? '—'}${x.fardDevolvida?.tamanhoRotulo ? ` · ${x.fardDevolvida.tamanhoRotulo}` : ''}`,
      itemNovo: `${x.fardNova?.variante.nome ?? '—'}${x.fardNova?.tamanhoRotulo ? ` · ${x.fardNova.tamanhoRotulo}` : ''}`,
      qtd: x.qtd, saldoDevAtual: x.saldoDevolvida, saldoDevFinal: x.saldoDevolvidaFinal, saldoNovaAtual: x.saldoNova, saldoNovaFinal: x.saldoNovaFinal,
      motivo: x.motivo, diferenca: x.financeiro.temCusto ? x.financeiro.diferenca : null, usuario: x.usuario,
    };
  }, [x.entrega, x.varianteDevolvida, x.varianteNova, x.mesmaVariante, x.qtdValida, x.funcionario, x.fardDevolvida, x.fardNova, x.qtd, x.saldoDevolvida, x.saldoDevolvidaFinal, x.saldoNova, x.saldoNovaFinal, x.motivo, x.financeiro, x.usuario]);

  const confirmar = async () => {
    if (!podeRegistrar) return; const ok = await x.confirmar(); if (ok) setRevisar(false); };
  const verRecibo = async (id: string) => { try { setRecibo(await getEntregaRecibo(id)); } catch { /* toast global */ } };

  const acoes = (
    <div className="flex items-center gap-2">
      <Button variant="outline" className="gap-2" onClick={() => navigate('/controle-estoque/movimentacoes')}><History className="h-4 w-4" /><span className="hidden sm:inline">Ver histórico de trocas</span></Button>
      <Button variant="ghost" className="gap-2" onClick={() => navigate('/controle-estoque/movimentacoes')}><ArrowLeftRight className="h-4 w-4" /><span className="hidden sm:inline">Abrir movimentações</span></Button>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <PageHeader icon={Replace} title="Troca de item" description="Devolva o item original e entregue outro em uma única operação." actions={acoes} />

      <div className="-mt-2 flex flex-wrap items-center gap-2">
        <span className={chip}><ShieldCheck className="h-3 w-3" /> Operação atômica</span>
        <span className={chip}><ArrowLeftRight className="h-3 w-3" /> Devolução e nova entrega vinculadas</span>
        <span className={chip}><PackageCheck className="h-3 w-3" /> Saldo validado por unidade</span>
        <span className={chip}><FileText className="h-3 w-3" /> Novo termo automático</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
        {/* Esquerda: origem + histórico + recentes */}
        <div className="space-y-5">
          <DeliveryOriginPanel
            buscaRaw={x.buscaRaw} setBusca={x.setBusca} fUnidade={x.fUnidade} setFUnidade={x.setFUnidade} fComDisponivel={x.fComDisponivel} setFComDisponivel={x.setFComDisponivel}
            unidades={x.unidades} lista={x.lista} loading={x.loadingEntregas} entrega={x.entrega} funcionario={x.funcionario} disponiveis={x.disponiveis}
            onSelect={x.selecionarEntrega} onLimpar={x.limparEntrega} onVerRecibo={verRecibo} onAbrirEntrega={() => navigate('/controle-estoque/movimentacoes')}
          />
          {x.entrega && <PreviousExchanges historico={x.historico} />}
          <RecentExchanges recentes={x.recentes} unidadeNome={unidadeNomeMap} loading={x.loadingRecentes} />
        </div>

        {/* Direita: formulário + painéis + revisão */}
        <div className="space-y-5">
          <SectionCard title="Nova troca" description="Item devolvido, novo item, quantidade e motivo.">
            <ExchangeForm hasEntrega={!!x.entrega} loadingDisp={x.loadingDisp} disponiveis={x.disponiveis} fardamentos={x.fardamentos}
              varianteDevolvida={x.varianteDevolvida} setVarianteDevolvida={x.setVarianteDevolvida} varianteNova={x.varianteNova} setVarianteNova={x.setVarianteNova}
              fardDevolvida={x.fardDevolvida} fardNova={x.fardNova} unidadeId={x.unidadeId}
              quantidadeRaw={x.quantidadeRaw} setQuantidadeRaw={x.setQuantidadeRaw} dispQtd={x.dispQtd} qtd={x.qtd} qtdValida={x.qtdValida} excedeDisp={x.excedeDisp} excedeSaldo={x.excedeSaldo} saldoNova={x.saldoNova}
              saldoDevolvida={x.saldoDevolvida} saldoDevolvidaFinal={x.saldoDevolvidaFinal} saldoNovaFinal={x.saldoNovaFinal}
              tamanhoSugerido={x.tamanhoSugerido} compat={x.compat} mesmaVariante={x.mesmaVariante} motivo={x.motivo} setMotivo={x.setMotivo} motivoMax={x.MOTIVO_MAX} />
          </SectionCard>

          {x.entrega && x.varianteDevolvida && x.varianteNova && !x.mesmaVariante && (
            <div className="grid gap-5 sm:grid-cols-2">
              <ExchangeFinancialPanel ativo={x.qtdValida} financeiro={x.financeiro} />
              <ExchangeTermCard podeVer={x.podeRevisar} onVer={() => setTermo(true)} />
            </div>
          )}

          <AdjustmentWarnings avisos={avisos} />

          <SectionCard title="Revisão e confirmação" description="Revise antes de registrar a troca.">
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">{!podeRegistrar ? 'Você tem acesso de consulta a esta tela, mas não tem permissão para registrar a operação.' : x.podeRevisar ? 'Tudo pronto — revise antes de confirmar.' : 'Selecione a entrega, item devolvido, novo item (diferente), quantidade e motivo.'}</p>
              <Button size="lg" className="gap-2" disabled={!podeRegistrar || !x.podeRevisar || x.saving} onClick={() => setRevisar(true)}>{x.saving && <Loader2 className="h-4 w-4 animate-spin" />} Revisar troca</Button>
            </div>
            {x.erro && <p className="mt-2 text-sm text-destructive">{x.erro}</p>}
          </SectionCard>
        </div>
      </div>

      <StockExchangeReviewDialog open={revisar && podeRegistrar} onOpenChange={setRevisar} saving={x.saving} onConfirm={confirmar} dados={revisao} />
      <StockExchangeSuccessDialog recibo={x.sucesso} itemNovo={x.fardNova?.variante.nome ?? '—'} onOpenChange={(o) => { if (!o) x.reset(); }}
        onNova={x.reset} onVerMovimentacoes={() => navigate('/controle-estoque/movimentacoes')} onVoltar={() => navigate('/controle-estoque/fardamentos')} />
      <ExchangeTermPreviewDialog open={termo} onOpenChange={setTermo} colaborador={x.funcionario?.nome ?? '—'} itemNovo={x.fardNova?.variante.nome ?? '—'} itemNovoTam={x.fardNova?.tamanhoRotulo ?? ''} qtd={x.qtdValida ? x.qtd : 0} motivo={x.motivo} unidade={unidadeNome ?? '—'} reciboAnterior={x.entrega?.recibo ?? '—'} />
      <ReciboEntregaDialog recibo={recibo} onOpenChange={(o) => { if (!o) setRecibo(null); }} />
    </div>
  );
}
