import { useNavigate } from 'react-router-dom';
import { Pencil, Power, PowerOff, Trash2, ChevronRight, AlertTriangle, Boxes, PackagePlus, SlidersHorizontal, ArrowLeftRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/app/StatusBadge';
import { cn } from '@/lib/utils';
import { formatDateTimeBR } from '@/lib/dateTime';
import { ativoDe, tituloRegistro, type MasterCtx, type Row, type TabConfig } from './masterShared';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props {
  row: Row | null;
  cfg: TabConfig;
  ctx: MasterCtx;
  isAdmin: boolean;
  onOpenChange: (o: boolean) => void;
  onEdit: (r: Row) => void;
  onInativar: (r: Row) => void;
  onReativar: (r: Row) => void;
  onExcluir: (r: Row) => void;
}

const acoesContextuais: Partial<Record<TabConfig['key'], { label: string; icon: typeof Boxes; to: string }[]>> = {
  variantes: [
    { label: 'Ver no estoque', icon: Boxes, to: '/controle-estoque/fardamentos' },
    { label: 'Registrar entrada', icon: PackagePlus, to: '/controle-estoque/entradas' },
    { label: 'Ajustar saldo', icon: SlidersHorizontal, to: '/controle-estoque/ajuste' },
  ],
  unidades: [
    { label: 'Ver movimentações', icon: ArrowLeftRight, to: '/controle-estoque/movimentacoes' },
  ],
};

export function MasterDataDetailsDrawer({ row, cfg, ctx, isAdmin, onOpenChange, onEdit, onInativar, onReativar, onExcluir }: Props) {
  const acesso = useResourceAccess('est_cadastros');
  const navigate = useNavigate();
  const ativo = row ? ativoDe(row) : true;
  const Icon = cfg.icon;
  const pend = row ? cfg.pendencias(row) : [];
  const info = row ? cfg.detail(row) : null;
  const extras = acoesContextuais[cfg.key] ?? [];

  const audit = (r: Row) => {
    const criadoPor = r.created_by ? ctx.usuarioNome(String(r.created_by)) : null;
    const atualizadoPor = r.updated_by ? ctx.usuarioNome(String(r.updated_by)) : null;
    return [
      { rot: 'Criado em', val: formatDateTimeBR(r.created_at ? String(r.created_at) : null) },
      ...(criadoPor ? [{ rot: 'Criado por', val: criadoPor }] : []),
      { rot: 'Atualizado em', val: formatDateTimeBR(r.updated_at ? String(r.updated_at) : null) },
      ...(atualizadoPor ? [{ rot: 'Atualizado por', val: atualizadoPor }] : []),
    ];
  };

  return (
    <Sheet open={row !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-[96vw] flex-col gap-0 p-0 sm:max-w-lg">
        {row && info && (
          <>
            <SheetHeader className="border-b border-border/60 p-5 pb-4 text-left">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate text-lg">{tituloRegistro(cfg.key, row)}</SheetTitle>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <StatusBadge variant={ativo ? 'success' : 'neutral'}>{ativo ? 'Ativo' : 'Inativo'}</StatusBadge>
                    {pend.map((p, i) => (
                      <span key={i} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', p.tone === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-status-warning/10 text-status-warning')}>
                        <AlertTriangle className="h-3 w-3" /> {p.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </SheetHeader>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-5 p-5">
                {info.sections.map((sec) => (
                  <section key={sec.title}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{sec.title}</h3>
                    {sec.fields && (
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                        {sec.fields.map((f, i) => (
                          <div key={i} className={cn('min-w-0', f.full && 'col-span-2')}>
                            <dt className="text-xs text-muted-foreground">{f.label}</dt>
                            <dd className="break-words font-medium text-foreground">{f.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {sec.node}
                  </section>
                ))}

                {/* Dependências */}
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dependências e vínculos</h3>
                  <div className="flex flex-wrap gap-2">
                    {info.dependencies.map((d, i) => {
                      const inner = <><span className="text-foreground">{d.label}</span><span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs font-semibold tabular-nums text-foreground">{d.count}</span></>;
                      return d.to
                        ? <button key={i} type="button" onClick={() => navigate(d.to as string)} className="inline-flex items-center gap-1 rounded-lg border border-border/70 px-2.5 py-1.5 text-xs transition-colors hover:border-primary/40 hover:bg-muted/40">{inner}<ChevronRight className="h-3 w-3 text-muted-foreground" /></button>
                        : <span key={i} className="inline-flex items-center gap-1 rounded-lg border border-border/70 px-2.5 py-1.5 text-xs">{inner}</span>;
                    })}
                  </div>
                </section>

                {/* Pendências */}
                {pend.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pendências cadastrais</h3>
                    <ul className="space-y-1.5">
                      {pend.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', p.tone === 'danger' ? 'text-destructive' : 'text-status-warning')} />
                          <span><span className="font-medium text-foreground">{p.label}.</span> <span className="text-muted-foreground">{p.hint}</span></span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Auditoria */}
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Auditoria</h3>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {audit(row).map((a, i) => (
                      <div key={i}><dt className="text-xs text-muted-foreground">{a.rot}</dt><dd className="tabular-nums text-foreground">{a.val}</dd></div>
                    ))}
                  </dl>
                </section>

                {/* Ações contextuais (navegação) */}
                {extras.length > 0 && (
                  <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
                    {extras.map((a) => { const AI = a.icon; return <Button key={a.to} variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate(a.to)}><AI className="h-4 w-4" /> {a.label}</Button>; })}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Rodapé de ações */}
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 p-4">
              {isAdmin && acesso.podeExcluir && <Button variant="ghost" className="mr-auto gap-1.5 text-destructive hover:text-destructive" onClick={() => onExcluir(row)}><Trash2 className="h-4 w-4" /> Excluir</Button>}
              {acesso.podeEditar && (ativo
                ? <Button variant="outline" className="gap-1.5" onClick={() => onInativar(row)}><PowerOff className="h-4 w-4" /> Inativar</Button>
                : <Button variant="outline" className="gap-1.5" onClick={() => onReativar(row)}><Power className="h-4 w-4" /> Reativar</Button>)}
              {acesso.podeEditar && <Button className="gap-1.5" onClick={() => onEdit(row)}><Pencil className="h-4 w-4" /> Editar</Button>}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
