import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackagePlus, History, ArrowLeftRight, ShieldCheck, Layers, FileText, AlertTriangle, Boxes, Building2, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { SectionCard } from '@/components/app/SectionCard';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useStockEntry } from '../hooks/useStockEntry';
import { StockLocationSelector } from '../components/entry/StockLocationSelector';
import { StockEntryItems } from '../components/entry/StockEntryItems';
import { StockInvoiceUploader } from '../components/entry/StockInvoiceUploader';
import { StockEntrySummary } from '../components/entry/StockEntrySummary';
import { RecentStockEntries } from '../components/entry/RecentStockEntries';
import { StockEntryReviewDialog, StockEntrySuccessDialog } from '../components/entry/StockEntryDialogs';
import { useResourceAccess } from '@/hooks/useResourceAccess';

const chip = 'inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground';

export function EntradasView() {
  const navigate = useNavigate();
  const e = useStockEntry();
  const [revisar, setRevisar] = useState(false);

  // Permissões desta tela (ver src/config/permissions.ts).
  const acesso = useResourceAccess('est_entradas');
  const podeRegistrar = acesso.podeCriar;

  const unidadeNomeMap = useMemo(() => new Map(e.unidades.map((u) => [u.id, u.nome])), [e.unidades]);
  const varNomeMap = useMemo(() => new Map(e.fardamentos.map((f) => [f.variante.id, f.variante.nome])), [e.fardamentos]);

  const confirmar = async () => {
    if (!podeRegistrar) return; const ok = await e.confirmar(); if (ok) setRevisar(false); };

  const acoes = (
    <div className="flex items-center gap-2">
      <Button variant="outline" className="gap-2" onClick={() => navigate('/controle-estoque/movimentacoes')}><History className="h-4 w-4" /><span className="hidden sm:inline">Ver histórico de entradas</span></Button>
      <Button variant="ghost" className="gap-2" onClick={() => navigate('/controle-estoque/movimentacoes')}><ArrowLeftRight className="h-4 w-4" /><span className="hidden sm:inline">Abrir movimentações</span></Button>
    </div>
  );

  const semItens = !e.loading && e.fardamentos.length === 0;
  const semUnidades = !e.loading && e.unidades.length === 0;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <PageHeader icon={PackagePlus} title="Entrada de estoque" description="Registre o recebimento de fardamentos em uma unidade de estoque." actions={acoes} />

      <div className="-mt-2 flex flex-wrap items-center gap-2">
        <span className={chip}><ShieldCheck className="h-3 w-3" /> Operação transacional</span>
        <span className={chip}><Layers className="h-3 w-3" /> Múltiplos itens</span>
        <span className={chip}><FileText className="h-3 w-3" /> Nota fiscal opcional</span>
        <span className={chip}>Saldo atualizado após confirmação</span>
      </div>

      {e.error ? (
        <SectionCard title="Entrada"><div className="flex flex-col items-center gap-3 py-12 text-center"><AlertTriangle className="h-8 w-8 text-destructive" /><p className="text-sm font-medium text-foreground">Não foi possível carregar os dados</p><Button variant="outline" size="sm" onClick={e.refetch}>Tentar novamente</Button></div></SectionCard>
      ) : semUnidades ? (
        <SectionCard title="Entrada"><EmptyState icon={Building2} title="Nenhuma unidade cadastrada" description="Cadastre um local de estoque antes de registrar entradas." action={<Button onClick={() => navigate('/controle-estoque/cadastros')}>Ir para cadastros</Button>} /></SectionCard>
      ) : semItens ? (
        <SectionCard title="Entrada"><EmptyState icon={Boxes} title="Nenhum item cadastrado" description="Cadastre variantes de fardamento para poder dar entrada." action={<Button onClick={() => navigate('/controle-estoque/fardamentos')}>Ir para fardamentos</Button>} /></SectionCard>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          {/* Coluna principal */}
          <div className="space-y-5">
            <SectionCard title="1. Dados da entrada" description="Unidade e data do recebimento.">
              {e.loading ? <div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label>Unidade de estoque *</Label><StockLocationSelector fardamentos={e.fardamentos} unidades={e.unidades} value={e.unidadeId} onChange={e.setUnidadeId} unidadeUnica={e.unidadeUnica} /></div>
                  <div className="space-y-1.5">
                    <Label htmlFor="data">Data de chegada *</Label>
                    <Input id="data" type="date" value={e.data} max={e.hoje} onChange={(ev) => e.setData(ev.target.value)} aria-invalid={e.dataFutura} />
                    {e.dataFutura ? <p className="text-xs text-destructive">A data não pode ser futura.</p> : <p className="text-xs text-muted-foreground">Data física do recebimento (America/São Paulo).</p>}
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard title="2. Itens recebidos" description="Adicione os itens e as quantidades recebidas.">
              <StockEntryItems fardamentos={e.fardamentos} unidadeId={e.unidadeId} jaAdicionados={e.jaAdicionados} rows={e.rows} totais={e.totais} onAdd={e.addItem} onSetQtd={e.setQtd} onRemove={e.removeItem} />
            </SectionCard>

            <SectionCard title="3. Documento e observação" description="Anexe a nota fiscal (opcional) e registre observações.">
              <div className="space-y-4">
                <StockInvoiceUploader nf={e.nf} uploading={e.uploading} onSelect={e.selecionarNf} onRemove={() => e.setNf(null)} />
                <div className="space-y-1.5">
                  <Label htmlFor="obs">Observação da entrada</Label>
                  <Textarea id="obs" rows={2} maxLength={e.OBS_MAX} value={e.observacao} onChange={(ev) => e.setObservacao(ev.target.value)} placeholder="Ex.: material conferido; divergência na nota; embalagem avariada; responsável pela conferência..." />
                  <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Ficará registrada na movimentação e auditoria.</span><span className="tabular-nums">{e.observacao.length}/{e.OBS_MAX}</span></div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="4. Revisão e confirmação" description="Revise antes de registrar a entrada.">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">{!podeRegistrar ? 'Você tem acesso de consulta a esta tela, mas não tem permissão para registrar a operação.' : e.podeRevisar ? 'Tudo pronto — revise antes de confirmar.' : 'Informe unidade, data válida e ao menos um item com quantidade.'}</p>
                <Button size="lg" className="gap-2" disabled={!podeRegistrar || !e.podeRevisar || e.saving || e.uploading} onClick={() => setRevisar(true)}>{(e.saving || e.uploading) && <Loader2 className="h-4 w-4 animate-spin" />} Revisar entrada</Button>
              </div>
              {e.erro && <p className="mt-2 text-sm text-destructive">{e.erro}</p>}
            </SectionCard>
          </div>

          {/* Coluna lateral */}
          <div className="space-y-5 lg:sticky lg:top-4 lg:self-start">
            <StockEntrySummary unidadeNome={e.unidadeNome} data={e.data} rows={e.rows} totais={e.totais} temNf={!!e.nf} observacao={e.observacao} usuario={e.usuario} itensValidos={e.itensValidos} />
            <RecentStockEntries recentes={e.recentes} unidadeNome={unidadeNomeMap} varNome={varNomeMap} loading={e.loadingRecentes} />
          </div>
        </div>
      )}

      <StockEntryReviewDialog open={revisar && podeRegistrar} onOpenChange={setRevisar} saving={e.saving} uploading={e.uploading} onConfirm={confirmar}
        unidade={e.unidadeNome} data={e.data} rows={e.rows} totais={e.totais} temNf={!!e.nf} observacao={e.observacao} usuario={e.usuario} />
      <StockEntrySuccessDialog sucesso={e.sucesso} onOpenChange={(o) => { if (!o) e.reset(); }}
        onNova={e.reset} onVerMovimentacoes={() => navigate('/controle-estoque/movimentacoes')} onVoltar={() => navigate('/controle-estoque/fardamentos')} />
    </div>
  );
}
