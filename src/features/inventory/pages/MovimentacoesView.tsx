import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, RefreshCw, Download, MoreVertical, PackagePlus, ClipboardCheck, SlidersHorizontal, Undo2, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { SectionCard } from '@/components/app/SectionCard';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useInventoryMovements } from '../hooks/useInventoryMovements';
import { InventoryMovementsStats, FlowSummary } from '../components/movements/InventoryMovementsStats';
import { InventoryMovementsFilters } from '../components/movements/InventoryMovementsFilters';
import { InventoryMovementsTable } from '../components/movements/InventoryMovementsTable';
import { InventoryMovementDrawer } from '../components/movements/InventoryMovementDrawer';
import { MovementGroups } from '../components/movements/MovementGroups';
import { tipoMeta, direcaoMov, ORIGEM_LABEL, DIRECAO_LABEL } from '../components/movements/movementMeta';
import { formatDateTimeBR } from '@/lib/dateTime';
import { competenciaLabelLong } from '@/features/dashboard/utils/dates';
import { formatNumberBR } from '@/lib/formatters';
import type { MovDetalhada } from '../services/inventoryApi';
import { useResourceAccess } from '@/hooks/useResourceAccess';

export function MovimentacoesView() {
  const acesso = useResourceAccess('est_movimentacoes');
  const navigate = useNavigate();
  const m = useInventoryMovements();
  const [drawer, setDrawer] = useState<MovDetalhada | null>(null);

  const siblings = useMemo(() => {
    if (!drawer?.operacaoId) return [];
    const ids = m.operacaoMap.get(drawer.operacaoId) ?? [];
    return m.movs.filter((x) => ids.includes(x.id) && x.id !== drawer.id);
  }, [drawer, m.operacaoMap, m.movs]);

  const onSelectStat = (k: string) => {
    if (k === 'total') { m.setFiltro('direcao', ''); m.setFiltro('tipo', ''); }
    else if (k === 'entradas') m.setFiltro('direcao', 'IN');
    else if (k === 'saidas') m.setFiltro('direcao', 'OUT');
    else if (k === 'ajustes') m.setFiltro('origem', 'AJUSTE');
  };

  const exportar = () => {
    const cab = ['Número', 'Tipo', 'Data', 'Local', 'Item', 'Código', 'Qtd', 'Direção', 'Saldo anterior', 'Saldo posterior', 'Origem', 'Responsável', 'Observação', 'Documento', 'OperacaoId'];
    const linhas: string[][] = [];
    for (const mv of m.filtradas) for (const it of mv.itens) {
      const v = m.varInfo.get(it.varianteId);
      linhas.push([mv.numero, tipoMeta(mv.tipo).label, formatDateTimeBR(mv.createdAt), m.unidadeNome.get(mv.unidadeId) ?? '', v?.nome ?? '', v?.codigo ?? '', String(it.quantidade), DIRECAO_LABEL[it.direcao === 'IN' ? 'IN' : 'OUT'], String(it.saldoAnterior), String(it.saldoPosterior), mv.referenciaTipo ? (ORIGEM_LABEL[mv.referenciaTipo] ?? mv.referenciaTipo) : '', mv.operadorNome, mv.observacao ?? '', mv.documento ? 'NF' : '', mv.operacaoId ?? '']);
    }
    const csv = [cab, ...linhas].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'movimentacoes.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const acoes = (
    <div className="flex items-center gap-2">
      <Button variant="outline" className="gap-2" onClick={m.refetch}><RefreshCw className="h-4 w-4" /><span className="hidden sm:inline">Atualizar</span></Button>
      {acesso.podeExportar && <Button className="gap-2" onClick={exportar} disabled={m.filtradas.length === 0}><Download className="h-4 w-4" /><span className="hidden sm:inline">Exportar histórico</span></Button>}
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Mais ações"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => navigate('/controle-estoque/entradas')}><PackagePlus className="mr-2 h-4 w-4" /> Registrar entrada</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/controle-estoque/entregas')}><ClipboardCheck className="mr-2 h-4 w-4" /> Nova entrega</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/controle-estoque/ajuste')}><SlidersHorizontal className="mr-2 h-4 w-4" /> Ajustar saldo</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/controle-estoque/estornos')}><Undo2 className="mr-2 h-4 w-4" /> Ver estornos</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-5">
      <PageHeader icon={ArrowLeftRight} title="Movimentações" description="Histórico completo de entradas, saídas, devoluções, ajustes e estornos." actions={acoes} />

      <div className="-mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{formatNumberBR(m.stats.total)} movimentações no filtro</span>
        <span>{formatNumberBR(m.stats.pecas)} peças</span>
        <span>Atualizado {formatDateTimeBR(m.atualizadoEm.toISOString())}</span>
      </div>

      {m.error ? (
        <SectionCard title="Movimentações"><div className="flex flex-col items-center gap-3 py-12 text-center"><AlertTriangle className="h-8 w-8 text-destructive" /><p className="text-sm font-medium text-foreground">Não foi possível carregar as movimentações</p><Button variant="outline" size="sm" onClick={m.refetch}>Tentar novamente</Button></div></SectionCard>
      ) : (
        <>
          <InventoryMovementsStats stats={m.stats} loading={m.loading} onSelect={onSelectStat} />
          <FlowSummary pecasIn={m.fluxo.pecasIn} pecasOut={m.fluxo.pecasOut} liquido={m.fluxo.liquido} operacoes={m.fluxo.operacoes} unidadeMais={m.fluxo.unidadeMais} itemMais={m.fluxo.itemMais} loading={m.loading} />
          <InventoryMovementsFilters filtros={m.filtros} buscaRaw={m.buscaRaw} opcoes={m.opcoes} ordenacao={m.ordenacao} agrupamento={m.agrupamento} resultado={m.filtradas.length}
            onSetBusca={m.setBusca} onSetFiltro={m.setFiltro} onSetOrdenacao={m.setOrdenacao} onSetAgrupamento={m.setAgrupamento} onLimpar={m.limpar} onSetMesRef={m.setMesRef} />

          <SectionCard
            title={m.agrupamento === 'lista' ? 'Histórico' : 'Resumo agrupado'}
            description={m.mesRange
              // Mês fechado é consultado no servidor: o histórico inteiro do mês
              // está aqui, não só o pedaço que couber na janela das mais recentes.
              ? `Mês de ${competenciaLabelLong(m.filtros.mesRef)} — ${m.totalCarregado} movimentação(ões) no mês.`
              : `Janela: até ${m.janela} movimentações mais recentes (${m.totalCarregado} carregadas).`}
          >
            {m.loading ? (
              <div className="space-y-2.5">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-11 w-full animate-pulse rounded bg-muted" />)}</div>
            ) : m.filtradas.length === 0 ? (
              // Com um mês fechado selecionado, vazio significa "nada NAQUELE mês" —
              // não "nada registrado no sistema". Confundir os dois faria o usuário
              // achar que perdeu o histórico.
              m.mesRange ? (
                <EmptyState icon={ArrowLeftRight} title={`Nenhuma movimentação em ${competenciaLabelLong(m.filtros.mesRef)}`}
                  description="Escolha outro mês ou volte para um dos períodos rápidos."
                  action={<Button variant="outline" onClick={() => m.setFiltro('periodo', '30d')}>Voltar para 30 dias</Button>} />
              ) : m.totalCarregado === 0 ? (
                <EmptyState icon={ArrowLeftRight} title="Nenhuma movimentação registrada" description="As entradas, entregas, devoluções e ajustes aparecerão aqui."
                  action={<div className="flex gap-2"><Button onClick={() => navigate('/controle-estoque/entradas')}>Registrar entrada</Button><Button variant="outline" onClick={() => navigate('/controle-estoque/entregas')}>Nova entrega</Button></div>} />
              ) : (
                <EmptyState icon={ArrowLeftRight} title="Nenhum resultado com os filtros" description="Ajuste ou amplie o período." action={<Button variant="outline" onClick={m.limpar}>Limpar filtros</Button>} />
              )
            ) : m.agrupamento === 'lista' ? (
              <InventoryMovementsTable pagina={m.pagina} varInfo={m.varInfo} unidadeNome={m.unidadeNome} operacaoMap={m.operacaoMap} onOpen={setDrawer}
                page={m.page} setPage={m.setPage} pageSize={m.pageSize} setPageSize={m.setPageSize} totalPaginas={m.totalPaginas} total={m.filtradas.length} />
            ) : (
              <MovementGroups agrupamento={m.agrupamento} movs={m.filtradas} varInfo={m.varInfo} unidadeNome={m.unidadeNome} />
            )}
          </SectionCard>
        </>
      )}

      <InventoryMovementDrawer mov={drawer} varInfo={m.varInfo} unidadeNome={m.unidadeNome} custoDe={m.custoDe} siblings={siblings} onOpenChange={(o) => { if (!o) setDrawer(null); }} onOpenMov={setDrawer} />
    </div>
  );
}
