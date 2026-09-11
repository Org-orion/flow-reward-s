import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, RefreshCw, PackagePlus, MoreVertical, SlidersHorizontal, Download, Settings, ArrowLeftRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { SectionCard } from '@/components/app/SectionCard';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FardamentosTableSkeleton } from '../components/fardamentos/FardamentosSkeleton';
import { FardamentoDetailsDrawer } from '../components/fardamentos/FardamentoDetailsDrawer';
import { useInventoryAlerts } from '../hooks/useInventoryAlerts';
import { InventoryAlertsStats } from '../components/alerts/InventoryAlertsStats';
import { InventoryHealthBar } from '../components/alerts/InventoryHealthBar';
import { InventoryAlertsFilters } from '../components/alerts/InventoryAlertsFilters';
import { InventoryAlertsTable } from '../components/alerts/InventoryAlertsTable';
import { CriticalUnitsPanel, AffectedCategoriesPanel, RecommendationsPanel, RelatedMovementsPanel } from '../components/alerts/InventoryAlertsPanels';
import { SEV_LABEL } from '../components/alerts/severity';
import { formatDateTimeBR, formatDateBR } from '@/lib/dateTime';
import type { FardamentoRow } from '../types/db.types';
import { useResourceAccess } from '@/hooks/useResourceAccess';

function baixarCsv(nome: string, cab: string[], linhas: string[][]) {
  const csv = [cab, ...linhas].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = nome; a.click();
  URL.revokeObjectURL(url);
}

export function AlertasView() {
  const acesso = useResourceAccess('est_alertas');
  const navigate = useNavigate();
  const a = useInventoryAlerts();
  const [drawer, setDrawer] = useState<{ f: FardamentoRow; aba: string } | null>(null);
  const unidadesRef = useRef<HTMLDivElement>(null);

  const unidadeNome = useMemo(() => new Map(a.screen.unidades.map((u) => [u.id, u.nome])), [a.screen.unidades]);
  const fardPorVar = useMemo(() => new Map(a.screen.fardamentos.map((f) => [f.variante.id, f])), [a.screen.fardamentos]);
  const abrirItem = (varianteId: string, aba = 'resumo') => { const f = fardPorVar.get(varianteId); if (f) setDrawer({ f, aba }); };
  const verUnidades = () => unidadesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const filtrarUnidade = (id: string) => { a.setFiltro('unidadeId', id); a.setAgrupamento('item'); };
  const filtrarCategoria = (cat: string) => { a.setFiltro('categoria', cat); a.setAgrupamento('item'); };

  const exportarAlertas = () => baixarCsv('alertas-estoque.csv',
    ['Item', 'Código', 'Categoria', 'Modelo', 'Tamanho', 'Local', 'Saldo', 'Mínimo', 'Diferença', 'Severidade', 'Última mov.'],
    a.filtradas.map((r) => [r.f.variante.nome, r.f.variante.codigo_interno, r.categoria, r.f.modeloNome ?? '', r.f.tamanhoRotulo ?? '', r.unidadeNome, String(r.quantidade), String(r.minimo), String(r.minimo - r.quantidade), SEV_LABEL[r.severidade], r.ultima ? formatDateBR(r.ultima.createdAt) : '']));

  const exportarReposicao = () => baixarCsv('lista-reposicao.csv',
    ['Item', 'Código', 'Local', 'Saldo', 'Mínimo', 'Ideal', 'Repor'],
    a.reposicao.map((r) => [r.f.variante.nome, r.f.variante.codigo_interno, r.unidadeNome, String(r.quantidade), String(r.minimo), r.ideal != null ? String(r.ideal) : '', String(r.reposicao)]));

  const acoes = (
    <div className="flex items-center gap-2">
      <Button variant="outline" className="gap-2" onClick={a.screen.refetch}><RefreshCw className="h-4 w-4" /><span className="hidden sm:inline">Atualizar dados</span></Button>
      <Button className="gap-2" onClick={() => navigate('/controle-estoque/entradas')}><PackagePlus className="h-4 w-4" /><span className="hidden sm:inline">Registrar entrada</span></Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Mais ações"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => navigate('/controle-estoque/ajuste')}><SlidersHorizontal className="mr-2 h-4 w-4" /> Ajustar saldo</DropdownMenuItem>
          {acesso.podeExportar && <DropdownMenuItem onClick={exportarAlertas} disabled={a.filtradas.length === 0}><Download className="mr-2 h-4 w-4" /> Exportar alertas</DropdownMenuItem>}
          {acesso.podeExportar && <DropdownMenuItem onClick={exportarReposicao} disabled={a.reposicao.length === 0}><Download className="mr-2 h-4 w-4" /> Exportar lista de reposição</DropdownMenuItem>}
          <DropdownMenuItem onClick={() => navigate('/controle-estoque/cadastros')}><Settings className="mr-2 h-4 w-4" /> Configurar mínimos</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/controle-estoque/movimentacoes')}><ArrowLeftRight className="mr-2 h-4 w-4" /> Ver movimentações</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-5">
      <PageHeader icon={BellRing} title="Alertas de estoque" description="Monitore riscos de ruptura e níveis abaixo do mínimo por unidade." actions={acoes} />

      <div className="-mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span><span className="font-medium text-foreground">{a.stats.total}</span> alertas ativos</span>
        <span>Local: <span className="font-medium text-foreground">{a.filtros.unidadeId ? (unidadeNome.get(a.filtros.unidadeId) ?? '—') : 'Todos'}</span></span>
        <span>{a.saude.total} combinações analisadas</span>
        <span>Atualizado {formatDateTimeBR(a.atualizadoEm.toISOString())}</span>
      </div>

      {a.screen.error ? (
        <SectionCard title="Alertas">
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm font-medium text-foreground">Não foi possível carregar os alertas</p>
            <Button variant="outline" size="sm" onClick={a.screen.refetch}>Tentar novamente</Button>
          </div>
        </SectionCard>
      ) : (
        <>
          <InventoryAlertsStats stats={a.stats} loading={a.screen.loading} ativo={a.filtros.severidade} onFiltrar={(s) => a.setFiltro('severidade', s)} onVerUnidades={verUnidades} />
          <InventoryHealthBar saude={a.saude} loading={a.screen.loading} onFiltrar={(s) => a.setFiltro('severidade', s)} />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <InventoryAlertsFilters
                filtros={a.filtros} buscaRaw={a.buscaRaw} ordenacao={a.ordenacao} agrupamento={a.agrupamento}
                opcoes={a.opcoes} resultado={a.filtradas.length} total={a.saude.total} ativos={a.totalAtivas}
                onSetBusca={a.setBusca} onSetFiltro={a.setFiltro} onSetOrdenacao={a.setOrdenacao} onSetAgrupamento={a.setAgrupamento} onLimpar={a.limpar}
              />
              <SectionCard title="Alertas" description="Itens que exigem reposição ou revisão.">
                {a.screen.loading ? (
                  <FardamentosTableSkeleton />
                ) : a.totalAtivas === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <CheckCircle2 className="h-9 w-9 text-success" />
                    <p className="text-sm font-medium text-foreground">Estoque dentro dos níveis esperados</p>
                    <p className="max-w-md text-sm text-muted-foreground">Nenhum item está sem saldo ou abaixo do mínimo nas unidades selecionadas.</p>
                    <p className="text-xs text-muted-foreground">{a.saude.total} combinações analisadas · atualizado {formatDateTimeBR(a.atualizadoEm.toISOString())}</p>
                    <div className="mt-2 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate('/controle-estoque/fardamentos')}>Ver todos os fardamentos</Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate('/controle-estoque/cadastros')}>Configurar mínimos</Button>
                    </div>
                  </div>
                ) : a.filtradas.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <BellRing className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Nenhum alerta corresponde aos filtros</p>
                    <Button variant="outline" size="sm" onClick={a.limpar}>Limpar filtros</Button>
                  </div>
                ) : (
                  <InventoryAlertsTable rows={a.filtradas} agrupamento={a.agrupamento} onOpen={abrirItem} onFiltrarUnidade={filtrarUnidade} onFiltrarCategoria={filtrarCategoria} />
                )}
              </SectionCard>
            </div>

            <div className="space-y-5">
              <div ref={unidadesRef} className="scroll-mt-4"><CriticalUnitsPanel dados={a.unidadesCriticas} loading={a.screen.loading} onFiltrar={filtrarUnidade} /></div>
              <AffectedCategoriesPanel dados={a.categoriasAfetadas} loading={a.screen.loading} onFiltrar={filtrarCategoria} />
              <RecommendationsPanel dados={a.recomendacoes} />
              <RelatedMovementsPanel movs={a.movimentacoesRelacionadas} unidadeNome={unidadeNome} loading={a.screen.loadingMov} />
            </div>
          </div>
        </>
      )}

      <FardamentoDetailsDrawer fardamento={drawer?.f ?? null} abaInicial={drawer?.aba} onOpenChange={(o) => { if (!o) setDrawer(null); }} />
    </div>
  );
}
