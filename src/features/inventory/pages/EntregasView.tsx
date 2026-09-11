import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, History, ArrowLeftRight, ShieldCheck, Building2, FileText, AlertTriangle, Boxes, Loader2, X } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { SectionCard } from '@/components/app/SectionCard';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/app/StatusBadge';
import { useStockDelivery } from '../hooks/useStockDelivery';
import { StockLocationSelector } from '../components/entry/StockLocationSelector';
import { EmployeeSearch } from '../components/delivery/EmployeeSearch';
import { EmployeePanel } from '../components/delivery/EmployeePanel';
import { StockDeliveryItems } from '../components/delivery/StockDeliveryItems';
import { StockDeliverySummary } from '../components/delivery/StockDeliverySummary';
import { ResponsibilityTermPreview } from '../components/delivery/ResponsibilityTermPreview';
import { RecentStockDeliveries } from '../components/delivery/RecentStockDeliveries';
import { StockDeliveryReviewDialog, StockDeliverySuccessDialog } from '../components/delivery/StockDeliveryDialogs';
import { AdjustmentWarnings } from '../components/adjustment/AdjustmentWarnings';
import { DELIVERY_TYPES, DELIVERY_TYPE_LABEL } from '../domain/domainConstants';
import type { DeliveryType } from '../types/inventory.types';
import { useResourceAccess } from '@/hooks/useResourceAccess';

const chip = 'inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground';

export function EntregasView() {
  const navigate = useNavigate();
  const d = useStockDelivery();
  const [revisar, setRevisar] = useState(false);

  // Permissões desta tela (ver src/config/permissions.ts).
  const acesso = useResourceAccess('est_entregas');
  const podeRegistrar = acesso.podeCriar;
  const [termo, setTermo] = useState(false);

  const unidadeNomeMap = useMemo(() => new Map(d.unidades.map((u) => [u.id, u.nome])), [d.unidades]);
  const tipoLabel = DELIVERY_TYPE_LABEL[d.tipo as DeliveryType] ?? d.tipo;
  const confirmar = async () => {
    if (!podeRegistrar) return; const ok = await d.confirmar(); if (ok) setRevisar(false); };

  const acoes = (
    <div className="flex items-center gap-2">
      <Button variant="outline" className="gap-2" onClick={() => navigate('/controle-estoque/movimentacoes')}><History className="h-4 w-4" /><span className="hidden sm:inline">Ver histórico de entregas</span></Button>
      <Button variant="ghost" className="gap-2" onClick={() => navigate('/controle-estoque/movimentacoes')}><ArrowLeftRight className="h-4 w-4" /><span className="hidden sm:inline">Abrir movimentações</span></Button>
    </div>
  );

  const semUnidades = !d.loading && d.unidades.length === 0;
  const semItens = !d.loading && d.fardamentos.length === 0;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <PageHeader icon={ClipboardCheck} title="Entrega ao colaborador" description="Registre a entrega de fardamentos com baixa de saldo e termo de responsabilidade." actions={acoes} />

      <div className="-mt-2 flex flex-wrap items-center gap-2">
        <span className={chip}><ShieldCheck className="h-3 w-3" /> Operação transacional</span>
        <span className={chip}><Building2 className="h-3 w-3" /> Saldo validado por unidade</span>
        <span className={chip}><FileText className="h-3 w-3" /> Termo gerado automaticamente</span>
        <span className={chip}>Vinculada ao cadastro do RH</span>
      </div>

      {d.error ? (
        <SectionCard title="Entrega"><div className="flex flex-col items-center gap-3 py-12 text-center"><AlertTriangle className="h-8 w-8 text-destructive" /><p className="text-sm font-medium text-foreground">Não foi possível carregar os dados</p><Button variant="outline" size="sm" onClick={d.refetch}>Tentar novamente</Button></div></SectionCard>
      ) : semUnidades ? (
        <SectionCard title="Entrega"><EmptyState icon={Building2} title="Nenhuma unidade cadastrada" description="Cadastre um local de estoque antes de registrar entregas." action={<Button onClick={() => navigate('/controle-estoque/cadastros')}>Ir para cadastros</Button>} /></SectionCard>
      ) : semItens ? (
        <SectionCard title="Entrega"><EmptyState icon={Boxes} title="Nenhum item cadastrado" description="Cadastre variantes de fardamento para poder entregar." action={<Button onClick={() => navigate('/controle-estoque/fardamentos')}>Ir para fardamentos</Button>} /></SectionCard>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <SectionCard title="1. Dados da entrega" description="Unidade e tipo da operação.">
              {d.loading ? <div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label>Unidade de estoque *</Label><StockLocationSelector fardamentos={d.fardamentos} unidades={d.unidades} value={d.unidadeId} onChange={d.setUnidadeId} unidadeUnica={d.unidadeUnica} /></div>
                  <div className="space-y-1.5">
                    <Label>Tipo de entrega *</Label>
                    <Select value={d.tipo} onValueChange={d.setTipo}><SelectTrigger aria-label="Tipo de entrega"><SelectValue /></SelectTrigger>
                      <SelectContent>{DELIVERY_TYPES.map((t) => <SelectItem key={t} value={t}>{DELIVERY_TYPE_LABEL[t]}</SelectItem>)}</SelectContent></Select>
                  </div>
                  {d.tipo === 'COMPRA' && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="valor">Valor da compra (R$) *</Label>
                      <Input id="valor" type="number" min={0} step="0.01" value={d.valorCompra} onChange={(e) => d.setValorCompra(e.target.value)} placeholder="0,00" aria-invalid={!d.compraOk} />
                      <p className="text-xs text-muted-foreground">Obrigatório para entregas do tipo Compra — valor cobrado do colaborador.</p>
                    </div>
                  )}
                </div>
              )}
            </SectionCard>

            <SectionCard title="2. Colaborador" description="Busque e selecione o colaborador (cadastro do RH).">
              <div className="space-y-2">
                <EmployeeSearch funcionarios={d.funcionarios} value={d.funcionarioId} onChange={d.setFuncionarioId} loading={d.loadingFunc} />
                {d.funcionario && (
                  <div className="flex items-center justify-between gap-2">
                    <button type="button" onClick={() => d.setFuncionarioId('')} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /> Trocar colaborador</button>
                    {d.empresaDivergente && <StatusBadge variant="danger">Empresa incompatível</StatusBadge>}
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard title="3. Itens e quantidades" description="Adicione os itens a entregar.">
              <StockDeliveryItems fardamentos={d.fardamentos} unidadeId={d.unidadeId} jaAdicionados={d.jaAdicionados} rows={d.rows} totais={d.totais} onAdd={d.addItem} onSetQtd={d.setQtd} onRemove={d.removeItem} />
              <div className="mt-4 space-y-1.5">
                <Label htmlFor="obs">Motivo / observação</Label>
                <Textarea id="obs" rows={2} maxLength={d.OBS_MAX} value={d.observacao} onChange={(e) => d.setObservacao(e.target.value)} placeholder="Ex.: admissão; reposição por desgaste; troca de tamanho; mudança de setor..." />
                <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Ficará registrada na entrega, movimentação e auditoria.</span><span className="tabular-nums">{d.observacao.length}/{d.OBS_MAX}</span></div>
              </div>
            </SectionCard>

            <AdjustmentWarnings avisos={d.avisos} />

            <SectionCard title="4. Revisão e confirmação" description="Revise antes de registrar a entrega.">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">{!podeRegistrar ? 'Você tem acesso de consulta a esta tela, mas não tem permissão para registrar a operação.' : d.podeRevisar ? 'Tudo pronto — revise antes de confirmar.' : 'Informe unidade, tipo, colaborador elegível e itens com saldo suficiente.'}</p>
                <Button size="lg" className="gap-2" disabled={!podeRegistrar || !d.podeRevisar || d.saving} onClick={() => setRevisar(true)}>{d.saving && <Loader2 className="h-4 w-4 animate-spin" />} Revisar entrega</Button>
              </div>
              {d.erro && <p className="mt-2 text-sm text-destructive">{d.erro}</p>}
            </SectionCard>
          </div>

          <div className="space-y-5 lg:sticky lg:top-4 lg:self-start">
            {d.funcionario && <EmployeePanel funcionario={d.funcionario} medidas={d.medidas} loadingMedidas={d.loadingMedidas} historico={d.historico} loadingHist={d.loadingHist} />}
            <StockDeliverySummary funcionario={d.funcionario} unidadeNome={d.unidade?.nome ?? null} tipoLabel={tipoLabel} rows={d.rows} totais={d.totais} observacao={d.observacao} usuario={d.usuario} itensValidos={d.itensValidos} onAbrirTermo={() => setTermo(true)} />
            <RecentStockDeliveries recentes={d.recentes} unidadeNome={unidadeNomeMap} loading={d.loadingRecentes} />
          </div>
        </div>
      )}

      <ResponsibilityTermPreview open={termo} onOpenChange={setTermo} funcionario={d.funcionario} unidadeNome={d.unidade?.nome ?? null} tipoLabel={tipoLabel} rows={d.rows} />
      <StockDeliveryReviewDialog open={revisar && podeRegistrar} onOpenChange={setRevisar} saving={d.saving} onConfirm={confirmar}
        funcionario={d.funcionario} unidadeNome={d.unidade?.nome ?? null} tipoLabel={tipoLabel} rows={d.rows} totais={d.totais} valorCompra={d.valorCompra} temCompra={d.tipo === 'COMPRA'} observacao={d.observacao} usuario={d.usuario} />
      <StockDeliverySuccessDialog recibo={d.sucesso} onOpenChange={(o) => { if (!o) d.reset(); }}
        onNova={d.reset} onVerMovimentacoes={() => navigate('/controle-estoque/movimentacoes')} onVoltar={() => navigate('/controle-estoque/fardamentos')} />
    </div>
  );
}
