import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Eye, PackagePlus, SlidersHorizontal, Pencil, History, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/app/StatusBadge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatNumberBR } from '@/lib/formatters';
import { formatDateBR } from '@/lib/dateTime';
import { StockByUnitBadges } from './StockByUnitBadges';
import { FardamentoStatusBadge } from './FardamentoStatusBadge';
import { situacaoDaLinha, SITUACAO_VARIANT } from './situacao';
import { MOVEMENT_TYPE_LABEL, MOVEMENT_IS_ENTRADA } from '../../domain/domainConstants';
import type { FardamentoRow } from '../../types/db.types';
import type { UltimaMov } from '../../hooks/useInventoryScreen';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props {
  rows: FardamentoRow[];
  ultimaMov: Map<string, UltimaMov>;
  loadingMov: boolean;
  onOpen: (f: FardamentoRow, aba?: string) => void;
  onToggleAtivo: (f: FardamentoRow) => void;
}

export function FardamentosTable({ rows, ultimaMov, loadingMov, onOpen, onToggleAtivo }: Props) {
  const maxSaldo = Math.max(1, ...rows.map((r) => r.saldoTotal));

  return (
    <>
      {/* Desktop / tablet */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
              <th className="pb-2.5 pr-3 font-medium">Item</th>
              <th className="pb-2.5 pr-3 font-medium">Categoria / Modelo</th>
              <th className="pb-2.5 pr-3 font-medium">Tam.</th>
              <th className="pb-2.5 pr-3 font-medium">Saldo total</th>
              <th className="hidden pb-2.5 pr-3 font-medium lg:table-cell">Mínimo</th>
              <th className="pb-2.5 pr-3 font-medium">Situação</th>
              <th className="hidden pb-2.5 pr-3 font-medium xl:table-cell">Saldo por local</th>
              <th className="hidden pb-2.5 pr-3 font-medium lg:table-cell">Última mov.</th>
              <th className="pb-2.5 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <FardamentoRow key={f.variante.id} f={f} maxSaldo={maxSaldo} ultima={ultimaMov.get(f.variante.id)} loadingMov={loadingMov} onOpen={onOpen} onToggleAtivo={onToggleAtivo} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="space-y-2.5 md:hidden">
        {rows.map((f) => <FardamentoCard key={f.variante.id} f={f} ultima={ultimaMov.get(f.variante.id)} onOpen={onOpen} onToggleAtivo={onToggleAtivo} />)}
      </div>
    </>
  );
}

function ultimaMovResumo(u: UltimaMov) {
  const label = MOVEMENT_TYPE_LABEL[u.tipo as keyof typeof MOVEMENT_TYPE_LABEL] ?? u.tipo;
  const entrada = MOVEMENT_IS_ENTRADA[u.tipo as keyof typeof MOVEMENT_IS_ENTRADA] ?? true;
  const sinal = u.direcao === 'IN' ? '+' : '−';
  return { label, entrada, sinal };
}

function RowMenu({ f, onOpen, onToggleAtivo }: Pick<Props, 'onOpen' | 'onToggleAtivo'> & { f: FardamentoRow }) {
  const acesso = useResourceAccess('est_fardamentos');
  const navigate = useNavigate();
  const ativo = f.variante.ativo !== false;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ações de ${f.variante.nome}`} onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => onOpen(f)}><Eye className="mr-2 h-4 w-4" /> Ver detalhes</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onOpen(f, 'movimentacoes')}><History className="mr-2 h-4 w-4" /> Ver histórico</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/controle-estoque/entradas')}><PackagePlus className="mr-2 h-4 w-4" /> Registrar entrada</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/controle-estoque/ajuste')}><SlidersHorizontal className="mr-2 h-4 w-4" /> Ajustar saldo</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/controle-estoque/cadastros')}><Pencil className="mr-2 h-4 w-4" /> Editar cadastro</DropdownMenuItem>
        <DropdownMenuSeparator />
        {ativo
          ? acesso.podeEditar && <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onToggleAtivo(f)}><PowerOff className="mr-2 h-4 w-4" /> Inativar</DropdownMenuItem>
          : acesso.podeEditar && <DropdownMenuItem onClick={() => onToggleAtivo(f)}><Power className="mr-2 h-4 w-4" /> Reativar</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FardamentoRow({ f, maxSaldo, ultima, loadingMov, onOpen, onToggleAtivo }: {
  f: FardamentoRow; maxSaldo: number; ultima?: UltimaMov; loadingMov: boolean;
} & Pick<Props, 'onOpen' | 'onToggleAtivo'>) {
  const situacao = situacaoDaLinha(f);
  const ativo = f.variante.ativo !== false;
  const minimo = f.variante.estoque_minimo_padrao ?? 0;
  const pct = Math.round((f.saldoTotal / maxSaldo) * 100);
  const barColor = SITUACAO_VARIANT[situacao] === 'danger' ? 'bg-destructive' : SITUACAO_VARIANT[situacao] === 'warning' ? 'bg-status-warning' : 'bg-primary';

  return (
    <tr
      className={cn('cursor-pointer border-b border-border/40 align-top transition-colors last:border-0 hover:bg-muted/40', !ativo && 'opacity-60')}
      onClick={() => onOpen(f)} tabIndex={0} role="button" aria-label={`Detalhes de ${f.variante.nome}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(f); } }}
    >
      <td className="py-3 pr-3">
        <div className="font-medium text-foreground">{f.variante.nome}</div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-mono">{f.variante.codigo_interno}</span>
          {!ativo && <StatusBadge variant="neutral">Inativo</StatusBadge>}
        </div>
      </td>
      <td className="py-3 pr-3 text-muted-foreground">{f.categoriaNome ?? '—'}{f.modeloNome ? <span className="block text-xs">{f.modeloNome}</span> : null}</td>
      <td className="py-3 pr-3 text-muted-foreground">{f.tamanhoRotulo ?? '—'}</td>
      <td className="py-3 pr-3">
        <div className="font-semibold tabular-nums text-foreground">{formatNumberBR(f.saldoTotal)}</div>
        <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full', barColor)} style={{ width: `${Math.max(pct, 3)}%` }} /></div>
      </td>
      <td className="hidden py-3 pr-3 tabular-nums text-muted-foreground lg:table-cell">{minimo > 0 ? formatNumberBR(minimo) : '—'}</td>
      <td className="py-3 pr-3"><FardamentoStatusBadge situacao={situacao} /></td>
      <td className="hidden py-3 pr-3 xl:table-cell"><StockByUnitBadges saldos={f.saldos} /></td>
      <td className="hidden py-3 pr-3 lg:table-cell">
        {loadingMov ? <span className="text-xs text-muted-foreground">…</span> : ultima ? <UltimaMovCell u={ultima} /> : <span className="text-xs text-muted-foreground">—</span>}
      </td>
      <td className="py-3 text-right"><RowMenu f={f} onOpen={onOpen} onToggleAtivo={onToggleAtivo} /></td>
    </tr>
  );
}

function UltimaMovCell({ u }: { u: UltimaMov }) {
  const { label, entrada, sinal } = ultimaMovResumo(u);
  return (
    <div className="text-xs">
      <div className="flex items-center gap-1.5">
        <StatusBadge variant={entrada ? 'success' : 'warning'}>{label}</StatusBadge>
        <span className={cn('tabular-nums font-medium', entrada ? 'text-success' : 'text-status-warning')}>{sinal}{formatNumberBR(u.quantidade)}</span>
      </div>
      <div className="mt-0.5 text-muted-foreground">{formatDateBR(u.createdAt)} · {u.operadorNome}</div>
    </div>
  );
}

function FardamentoCard({ f, ultima, onOpen, onToggleAtivo }: { f: FardamentoRow; ultima?: UltimaMov } & Pick<Props, 'onOpen' | 'onToggleAtivo'>) {
  const situacao = situacaoDaLinha(f);
  const ativo = f.variante.ativo !== false;
  return (
    <div className={cn('rounded-xl border border-border/70 bg-card p-3.5 shadow-[var(--shadow-card)]', !ativo && 'opacity-60')}>
      <div className="flex items-start justify-between gap-2">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(f)}>
          <div className="truncate font-medium text-foreground">{f.variante.nome}</div>
          <div className="truncate font-mono text-xs text-muted-foreground">{f.variante.codigo_interno}</div>
        </button>
        <RowMenu f={f} onOpen={onOpen} onToggleAtivo={onToggleAtivo} />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <FardamentoStatusBadge situacao={situacao} />
        <div className="text-right"><span className="text-lg font-bold tabular-nums text-foreground">{formatNumberBR(f.saldoTotal)}</span><span className="ml-1 text-xs text-muted-foreground">em saldo</span></div>
      </div>
      <div className="mt-2.5"><StockByUnitBadges saldos={f.saldos} /></div>
      {ultima && <div className="mt-2 border-t border-border/40 pt-2"><UltimaMovCell u={ultima} /></div>}
    </div>
  );
}
