import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, History, Shirt, ShieldCheck, Building2, TrendingDown, AlertTriangle, Boxes, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { SectionCard } from '@/components/app/SectionCard';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useStockAdjustment } from '../hooks/useStockAdjustment';
import { StockItemSelector } from '../components/adjustment/StockItemSelector';
import { StockUnitSelector, UnitHint } from '../components/adjustment/StockUnitSelector';
import { PhysicalCountField } from '../components/adjustment/PhysicalCountField';
import { AdjustmentReasonField } from '../components/adjustment/AdjustmentReasonField';
import { AdjustmentImpactPanel } from '../components/adjustment/AdjustmentImpactPanel';
import { AdjustmentWarnings } from '../components/adjustment/AdjustmentWarnings';
import { OtherUnitsBalance, RecentItemMovements } from '../components/adjustment/AdjustmentSideInfo';
import { AdjustmentReviewDialog, AdjustmentSuccessDialog, type RevisaoDados } from '../components/adjustment/AdjustmentDialogs';
import { useResourceAccess } from '@/hooks/useResourceAccess';

const chip = 'inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground';

export function AjusteView() {
  const navigate = useNavigate();
  const a = useStockAdjustment();
  const [revisar, setRevisar] = useState(false);

  // Permissões desta tela (ver src/config/permissions.ts).
  const acesso = useResourceAccess('est_ajuste');
  const podeRegistrar = acesso.podeEditar;

  const unidadeNome = a.saldoUnidade?.unidadeNome ?? a.unidades.find((u) => u.id === a.unidadeId)?.nome ?? null;

  const revisao = useMemo<RevisaoDados | null>(() => {
    if (!a.fardamento || !a.previa.result || !unidadeNome) return null;
    return {
      item: a.fardamento.variante.nome, codigo: a.fardamento.variante.codigo_interno, unidade: unidadeNome,
      saldoAtual: a.saldoAtual, contagem: a.previa.result.saldoNovo, diferenca: a.previa.result.diferenca,
      saldoFinal: a.previa.result.saldoNovo, entrada: a.previa.result.direcao === 'IN', motivo: a.motivoFinal,
      impacto: a.impactoFinanceiro, usuario: a.usuario,
    };
  }, [a.fardamento, a.previa.result, unidadeNome, a.saldoAtual, a.motivoFinal, a.impactoFinanceiro, a.usuario]);

  const confirmar = async () => {
    if (!podeRegistrar) return; const ok = await a.confirmar(); if (ok) setRevisar(false); };

  const acoes = (
    <div className="flex items-center gap-2">
      <Button variant="outline" className="gap-2" onClick={() => navigate('/controle-estoque/movimentacoes')}><History className="h-4 w-4" /><span className="hidden sm:inline">Ver histórico de ajustes</span></Button>
      <Button variant="ghost" className="gap-2" onClick={() => navigate('/controle-estoque/fardamentos')}><Shirt className="h-4 w-4" /><span className="hidden sm:inline">Abrir fardamentos</span></Button>
    </div>
  );

  const semItens = !a.loading && a.fardamentos.length === 0;
  const semUnidades = !a.loading && a.unidades.length === 0;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <PageHeader icon={SlidersHorizontal} title="Ajuste de saldo" description="Corrija o saldo físico de um item em uma unidade específica." actions={acoes} />

      <div className="-mt-2 flex flex-wrap items-center gap-2">
        <span className={chip}><ShieldCheck className="h-3 w-3" /> Operação auditada</span>
        <span className={chip}><Building2 className="h-3 w-3" /> Ajuste por unidade</span>
        <span className={chip}><TrendingDown className="h-3 w-3" /> Saldo nunca negativo</span>
        <span className={chip}>Responsável: {a.usuario}</span>
      </div>

      {a.error ? (
        <SectionCard title="Ajuste"><div className="flex flex-col items-center gap-3 py-12 text-center"><AlertTriangle className="h-8 w-8 text-destructive" /><p className="text-sm font-medium text-foreground">Não foi possível carregar os dados</p><Button variant="outline" size="sm" onClick={a.refetch}>Tentar novamente</Button></div></SectionCard>
      ) : semItens ? (
        <SectionCard title="Ajuste"><EmptyState icon={Boxes} title="Nenhum item cadastrado" description="Cadastre variantes de fardamento antes de ajustar saldos." action={<Button onClick={() => navigate('/controle-estoque/fardamentos')}>Ir para fardamentos</Button>} /></SectionCard>
      ) : semUnidades ? (
        <SectionCard title="Ajuste"><EmptyState icon={Building2} title="Nenhuma unidade cadastrada" description="Cadastre ao menos um local de estoque para registrar ajustes." action={<Button onClick={() => navigate('/controle-estoque/cadastros')}>Ir para cadastros</Button>} /></SectionCard>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          {/* Coluna principal — formulário em etapas */}
          <div className="space-y-5">
            <SectionCard title="1. Item e unidade" description="Escolha o item e o local a ajustar.">
              {a.loading ? <div className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> : (
                <div className="space-y-4">
                  <div className="space-y-1.5"><Label>Item *</Label><StockItemSelector fardamentos={a.fardamentos} value={a.varianteId} onChange={a.selecionarItem} /></div>
                  <div className="space-y-1.5">
                    <Label>Local de estoque *</Label>
                    <StockUnitSelector fardamento={a.fardamento} unidades={a.unidades} value={a.unidadeId} onChange={a.setUnidadeId} unidadeUnica={a.unidadeUnica} disabled={!a.varianteId} />
                    <UnitHint />
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard title="2. Contagem física e motivo" description="Informe o total contado e a justificativa.">
              <div className="space-y-5">
                <PhysicalCountField value={a.contadoRaw} onChange={a.setContadoRaw} disabled={a.loading} saldoAtual={a.saldoAtual} ativo={!!a.varianteId && !!a.unidadeId} previa={a.previa} />
                <AdjustmentReasonField tipo={a.motivoTipo} desc={a.motivoDesc} max={a.MOTIVO_MAX} valido={a.motivoValido}
                  mostrarErro={a.motivoDesc.trim().length > 0 && !a.motivoValido} onTipo={a.setMotivoTipo} onDesc={a.setMotivoDesc} />
              </div>
            </SectionCard>

            <AdjustmentWarnings avisos={a.avisos} />

            <SectionCard title="3. Revisão e confirmação" description="Revise antes de aplicar o ajuste.">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">{!podeRegistrar ? 'Você tem acesso de consulta a esta tela, mas não tem permissão para registrar a operação.' : a.podeRevisar ? 'Tudo pronto — revise os dados antes de confirmar.' : 'Selecione item, unidade, informe a contagem (diferente do saldo) e o motivo.'}</p>
                <Button size="lg" className="gap-2" disabled={!podeRegistrar || !a.podeRevisar || a.saving} onClick={() => setRevisar(true)}>
                  {a.saving && <Loader2 className="h-4 w-4 animate-spin" />} Revisar ajuste
                </Button>
              </div>
              {a.erro && <p className="mt-2 text-sm text-destructive">{a.erro}</p>}
            </SectionCard>
          </div>

          {/* Coluna lateral */}
          <div className="space-y-5 lg:sticky lg:top-4 lg:self-start">
            <AdjustmentImpactPanel fardamento={a.fardamento} unidadeNome={unidadeNome} temContagem={a.contadoRaw.trim() !== ''}
              saldoAtual={a.saldoAtual} minimo={a.minimo} custo={a.custo} temCusto={a.temCusto} previa={a.previa} impactoFinanceiro={a.impactoFinanceiro} />
            {a.fardamento && a.unidadeId && <OtherUnitsBalance outras={a.outrasUnidades} onAbrirItem={() => navigate('/controle-estoque/fardamentos')} />}
            {a.fardamento && a.unidadeId && <RecentItemMovements movs={a.movs} loading={a.loadingMovs} />}
          </div>
        </div>
      )}

      <AdjustmentReviewDialog open={revisar && podeRegistrar} onOpenChange={setRevisar} dados={revisao} saving={a.saving} onConfirm={confirmar} />
      <AdjustmentSuccessDialog sucesso={a.sucesso} onOpenChange={(o) => { if (!o) a.reset(); }}
        onNovo={a.reset} onVerMovimentacoes={() => navigate('/controle-estoque/movimentacoes')} onVoltar={() => navigate('/controle-estoque/fardamentos')} />
    </div>
  );
}
