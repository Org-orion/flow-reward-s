import { Search, X, ListFilter, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { MOVEMENT_TYPE_LABEL } from '../../domain/domainConstants';
import { ORIGEM_LABEL, DIRECAO_LABEL } from './movementMeta';
import { PERIODO_LABEL, type Periodo } from '../dashboard/derive';
import { CompetenciaPicker } from '@/components/dashboard/CompetenciaPicker';
import { MES_ANO_MIN, MES_ANO_MAX } from '../../domain/movementPeriod';
import { competenciaLabelLong } from '@/features/dashboard/utils/dates';
import { descreverFiltrosMov } from '../../domain/movementFilters';
import type { MovFiltros, Ordenacao, Agrupamento } from '../../hooks/useInventoryMovements';

const ALL = '__all__';
const PERIODOS: (Periodo | 'todos')[] = ['hoje', '7d', '30d', 'mes', 'mes_anterior', 'todos'];
const perLabel = (p: Periodo | 'todos') => (p === 'todos' ? 'Todos' : PERIODO_LABEL[p]);
const ORDENS: { k: Ordenacao; l: string }[] = [{ k: 'recentes', l: 'Mais recentes' }, { k: 'antigas', l: 'Mais antigas' }, { k: 'maior_qtd', l: 'Maior quantidade' }, { k: 'numero', l: 'Número' }, { k: 'tipo', l: 'Tipo' }];
const AGRUPS: { k: Agrupamento; l: string }[] = [{ k: 'lista', l: 'Lista' }, { k: 'tipo', l: 'Tipo' }, { k: 'unidade', l: 'Unidade' }, { k: 'item', l: 'Item' }, { k: 'responsavel', l: 'Responsável' }];

interface Opcoes { tipos: string[]; origens: string[]; responsaveis: string[]; unidades: { id: string; nome: string }[]; categorias: string[]; variantes: { id: string; nome: string }[] }
interface Props {
  filtros: MovFiltros; buscaRaw: string; opcoes: Opcoes; ordenacao: Ordenacao; agrupamento: Agrupamento; resultado: number;
  onSetBusca: (v: string) => void; onSetFiltro: <K extends keyof MovFiltros>(k: K, v: MovFiltros[K]) => void;
  onSetOrdenacao: (o: Ordenacao) => void; onSetAgrupamento: (a: Agrupamento) => void; onLimpar: () => void;
  /** Seleciona um mês/ano fechado (consulta o servidor, fora da janela recente). */
  onSetMesRef: (mesRef: string) => void;
}

export function InventoryMovementsFilters({ filtros, buscaRaw, opcoes, ordenacao, agrupamento, resultado, onSetBusca, onSetFiltro, onSetOrdenacao, onSetAgrupamento, onLimpar, onSetMesRef }: Props) {
  // Rótulos vêm da MESMA função usada pelo PDF (domain/movementFilters), para a
  // tela e o relatório nunca descreverem filtros diferentes.
  const chips: { rot: string; on: () => void }[] = descreverFiltrosMov(filtros, opcoes).map((f) => ({
    rot: f.rotulo,
    on: () => onSetFiltro(f.chave, (f.chave === 'comNf' || f.chave === 'comObs' ? false : '') as never),
  }));
  if (filtros.periodo === 'mes_ref' && filtros.mesRef) {
    chips.push({ rot: `Mês: ${competenciaLabelLong(filtros.mesRef)}`, on: () => onSetFiltro('periodo', '30d') });
  }
  const temFiltro = chips.length > 0 || filtros.periodo !== '30d' || buscaRaw.trim() !== '';


  const controles = (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <Sel label="Tipo" value={filtros.tipo || ALL} onChange={(v) => onSetFiltro('tipo', v === ALL ? '' : v)} options={opcoes.tipos.map((t) => ({ id: t, nome: MOVEMENT_TYPE_LABEL[t as keyof typeof MOVEMENT_TYPE_LABEL] ?? t }))} ph="Todos" />
      <Sel label="Direção" value={filtros.direcao || ALL} onChange={(v) => onSetFiltro('direcao', (v === ALL ? '' : v) as MovFiltros['direcao'])} options={[{ id: 'IN', nome: 'Entrada' }, { id: 'OUT', nome: 'Saída' }, { id: 'MISTA', nome: 'Mista' }]} ph="Todas" />
      <Sel label="Local" value={filtros.unidadeId || ALL} onChange={(v) => onSetFiltro('unidadeId', v === ALL ? '' : v)} options={opcoes.unidades} ph="Todos" />
      <Sel label="Origem" value={filtros.origem || ALL} onChange={(v) => onSetFiltro('origem', v === ALL ? '' : v)} options={opcoes.origens.map((o) => ({ id: o, nome: ORIGEM_LABEL[o] ?? o }))} ph="Todas" />
      <Sel label="Categoria" value={filtros.categoria || ALL} onChange={(v) => onSetFiltro('categoria', v === ALL ? '' : v)} options={opcoes.categorias.map((c) => ({ id: c, nome: c }))} ph="Todas" />
      <Sel label="Item" value={filtros.varianteId || ALL} onChange={(v) => onSetFiltro('varianteId', v === ALL ? '' : v)} options={opcoes.variantes} ph="Todos" />
      <Sel label="Responsável" value={filtros.responsavel || ALL} onChange={(v) => onSetFiltro('responsavel', v === ALL ? '' : v)} options={opcoes.responsaveis.map((rr) => ({ id: rr, nome: rr }))} ph="Todos" />
      <div className="flex flex-col gap-1.5">
        <label className="flex h-9 cursor-pointer items-center gap-2 text-sm text-foreground"><Checkbox checked={filtros.comNf} onCheckedChange={(v) => onSetFiltro('comNf', Boolean(v))} /> Com NF</label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground"><Checkbox checked={filtros.comObs} onCheckedChange={(v) => onSetFiltro('comObs', Boolean(v))} /> Com observação</label>
      </div>
    </div>
  );

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-card p-3.5 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={buscaRaw} onChange={(e) => onSetBusca(e.target.value)} placeholder="Buscar por número, item, código, local, responsável ou observação..." className="pl-9" aria-label="Buscar movimentações" />
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Período">
          {PERIODOS.map((p) => (
            <button key={p} type="button" onClick={() => onSetFiltro('periodo', p)} aria-pressed={filtros.periodo === p}
              className={cn('rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors', filtros.periodo === p ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground')}>{perLabel(p)}</button>
          ))}
        </div>
        <CompetenciaPicker
          value={filtros.periodo === 'mes_ref' ? filtros.mesRef : ''}
          onChange={onSetMesRef}
          minYear={MES_ANO_MIN}
          maxYear={MES_ANO_MAX}
          placeholder="Mês/ano"
          className={cn('w-[150px]', filtros.periodo === 'mes_ref' && 'border-primary/50 bg-primary/5 font-medium')}
        />
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <Select value={ordenacao} onValueChange={(v) => onSetOrdenacao(v as Ordenacao)}><SelectTrigger className="h-9 w-40" aria-label="Ordenar"><SelectValue /></SelectTrigger><SelectContent>{ORDENS.map((o) => <SelectItem key={o.k} value={o.k}>{o.l}</SelectItem>)}</SelectContent></Select>
        </div>
        <Sheet>
          <SheetTrigger asChild><Button variant="outline" className="shrink-0 gap-2 md:hidden" aria-label="Filtros"><ListFilter className="h-4 w-4" /> Filtros{chips.length > 0 && <Badge variant="secondary" className="ml-1">{chips.length}</Badge>}</Button></SheetTrigger>
          <SheetContent side="right" className="w-[90vw] max-w-sm overflow-y-auto"><SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader><div className="mt-4">{controles}</div>{temFiltro && <Button variant="ghost" className="mt-4 gap-1.5" onClick={onLimpar}><X className="h-4 w-4" /> Limpar</Button>}</SheetContent>
        </Sheet>
        {temFiltro && <Button variant="ghost" className="hidden shrink-0 gap-1.5 md:inline-flex" onClick={onLimpar}><X className="h-4 w-4" /> Limpar</Button>}
      </div>

      <div className="hidden md:block">{controles}</div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex rounded-lg border border-border/70 p-0.5" role="group" aria-label="Agrupar">
          {AGRUPS.map((a) => <button key={a.k} type="button" onClick={() => onSetAgrupamento(a.k)} aria-pressed={agrupamento === a.k} className={cn('rounded-md px-2.5 py-1 text-xs font-medium transition-colors', agrupamento === a.k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>{a.l}</button>)}
        </div>
        <span className="text-xs text-muted-foreground">{resultado} resultado(s)</span>
        {chips.map((c, i) => <button key={i} type="button" onClick={c.on} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-foreground hover:bg-muted" aria-label={`Remover ${c.rot}`}>{c.rot} <X className="h-3 w-3" /></button>)}
      </div>
    </div>
  );
}

function Sel({ label, value, onChange, options, ph }: { label: string; value: string; onChange: (v: string) => void; options: { id: string; nome: string }[]; ph: string }) {
  return (
    <div className="space-y-1"><Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}><SelectTrigger className="h-9 w-full sm:w-40"><SelectValue placeholder={ph} /></SelectTrigger><SelectContent><SelectItem value={ALL}>{ph}</SelectItem>{options.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent></Select>
    </div>
  );
}
