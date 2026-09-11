import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Undo2, History, ArrowLeftRight, ShieldCheck, FileText, RefreshCw, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { SectionCard } from '@/components/app/SectionCard';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useInventoryReversals } from '../hooks/useInventoryReversals';
import { ReversalStats } from '../components/reversals/ReversalStats';
import { DeliveryCancellationPanel, ReturnReversalPanel } from '../components/reversals/ReversalPanels';
import { ReversalReviewDialog, type ReversalAlvo } from '../components/reversals/ReversalReviewDialog';
import { RecentReversals } from '../components/reversals/RecentReversals';
import { formatDateTimeBR } from '@/lib/dateTime';
import { useResourceAccess } from '@/hooks/useResourceAccess';

const chip = 'inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground';
const ALL = '__all__';

export function EstornosView() {
  const navigate = useNavigate();
  const r = useInventoryReversals();
  const [alvo, setAlvo] = useState<ReversalAlvo | null>(null);

  // Permissões desta tela (ver src/config/permissions.ts).
  const acesso = useResourceAccess('est_estornos');
  const podeEstornar = acesso.pode('estornar');

  const confirmar = async (motivo: string) => {
    if (!alvo || !podeEstornar) return;
    const ok = alvo.kind === 'cancel' ? await r.confirmarCancelamento(alvo.entrega.e, motivo) : await r.confirmarEstorno(alvo.dev.d, motivo);
    if (ok) setAlvo(null);
  };

  const filtrosGlobais = (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={r.fUnidade || ALL} onValueChange={(v) => r.setFUnidade(v === ALL ? '' : v)}>
        <SelectTrigger className="h-9 w-48" aria-label="Filtrar por unidade"><SelectValue placeholder="Todas as unidades" /></SelectTrigger>
        <SelectContent><SelectItem value={ALL}>Todas as unidades</SelectItem>{r.unidades.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent>
      </Select>
      <label className="flex h-9 cursor-pointer items-center gap-2 text-sm text-foreground"><Checkbox checked={r.soElegiveis} onCheckedChange={(v) => r.setSoElegiveis(Boolean(v))} /> Só elegíveis</label>
    </div>
  );

  const painelEntrega = <DeliveryCancellationPanel itens={r.entregasCancel} buscaRaw={r.buscaEntregaRaw} setBusca={r.setBuscaEntrega} unidadeNome={r.unidadeNome} loading={r.loading} onRevisar={(x) => setAlvo({ kind: 'cancel', entrega: x })} podeEstornar={podeEstornar} />;
  const painelDev = <ReturnReversalPanel itens={r.devsEstorno} buscaRaw={r.buscaDevRaw} setBusca={r.setBuscaDev} unidadeNome={r.unidadeNome} loading={r.loading} onRevisar={(x) => setAlvo({ kind: 'estorno', dev: x })} podeEstornar={podeEstornar} />;

  const acoes = (
    <div className="flex items-center gap-2">
      <Button variant="outline" className="gap-2" onClick={r.refetch}><RefreshCw className="h-4 w-4" /><span className="hidden sm:inline">Atualizar</span></Button>
      <Button variant="ghost" className="gap-2" onClick={() => navigate('/controle-estoque/movimentacoes')}><ArrowLeftRight className="h-4 w-4" /><span className="hidden sm:inline">Abrir movimentações</span></Button>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <PageHeader icon={Undo2} title="Estornos" description="Reverta entregas ou devoluções preservando saldo, histórico e auditoria." actions={acoes} />

      <div className="-mt-2 flex flex-wrap items-center gap-2">
        <span className={chip}><ShieldCheck className="h-3 w-3" /> Operação auditada</span>
        <span className={chip}><FileText className="h-3 w-3" /> Motivo obrigatório</span>
        <span className={chip}><History className="h-3 w-3" /> Histórico preservado</span>
        <span className={chip}>Reversão transacional</span>
        <span className="ml-auto text-xs text-muted-foreground">Atualizado {formatDateTimeBR(r.atualizadoEm.toISOString())}</span>
      </div>

      {r.error ? (
        <SectionCard title="Estornos"><div className="flex flex-col items-center gap-3 py-12 text-center"><AlertTriangle className="h-8 w-8 text-destructive" /><p className="text-sm font-medium text-foreground">Não foi possível carregar os dados</p><Button variant="outline" size="sm" onClick={r.refetch}>Tentar novamente</Button></div></SectionCard>
      ) : (
        <>
          <ReversalStats stats={r.stats} loading={r.loading} onSoElegiveis={r.setSoElegiveis} />
          <div className="flex justify-end">{filtrosGlobais}</div>

          {/* Desktop: dois blocos lado a lado */}
          <div className="hidden gap-5 lg:grid lg:grid-cols-2">{painelEntrega}{painelDev}</div>

          {/* Mobile/tablet: abas */}
          <div className="lg:hidden">
            <Tabs defaultValue="entregas">
              <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="entregas">Entregas</TabsTrigger><TabsTrigger value="devolucoes">Devoluções</TabsTrigger></TabsList>
              <TabsContent value="entregas" className="mt-4">{painelEntrega}</TabsContent>
              <TabsContent value="devolucoes" className="mt-4">{painelDev}</TabsContent>
            </Tabs>
          </div>

          <RecentReversals estornos={r.estornos} fardPorVar={r.fardPorVar} unidadeNome={r.unidadeNome} loading={r.loadingHist} />
        </>
      )}

      <ReversalReviewDialog alvo={podeEstornar ? alvo : null} onOpenChange={(o) => { if (!o) setAlvo(null); }} saving={r.saving} saldoDe={r.saldoDe} custoDe={r.custoDe} unidadeNome={r.unidadeNome} onConfirm={confirmar} />
    </div>
  );
}
