import { useMemo, useState } from 'react';
import { ChevronRight, Minus, Plus, ShieldCheck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  PERMISSION_RESOURCES, ACTION_LABEL, actionGrant, fieldGrant,
  type PermissionResourceDef,
} from '@/config/permissions';
import { toggleGrant, toggleResource } from '@/domain/permissions/grantToggle';

interface Props {
  /** Conjunto efetivo em edição. */
  value: string[];
  onChange: (next: string[]) => void;
  /**
   * Concessões herdadas de um perfil de acesso. Quando informado, cada item
   * marcado/desmarcado fora do herdado é sinalizado como exceção (+/−).
   */
  inherited?: string[];
  /** Somente leitura (ex.: usuário administrador, que tem acesso total). */
  readOnly?: boolean;
}

/**
 * Árvore de permissões: módulo → grupo → recurso (tela) → ações, com os campos
 * controlados de cada tela em um nível expansível. É o mesmo componente usado
 * para montar um perfil de acesso e para ajustar as exceções de um usuário —
 * quando `inherited` é passado, marca o que difere do perfil.
 */
export function PermissionTreeEditor({ value, onChange, inherited, readOnly = false }: Props) {
  const effective = useMemo(() => new Set(value), [value]);
  const base = useMemo(() => new Set(inherited ?? []), [inherited]);
  const comparando = inherited !== undefined;

  const [aberto, setAberto] = useState<Set<string>>(new Set());
  const alternarExpansao = (key: string) => setAberto(prev => {
    const n = new Set(prev);
    if (n.has(key)) n.delete(key); else n.add(key);
    return n;
  });

  const set = (next: Set<string>) => onChange([...next].sort());
  const marcar = (grant: string, next: boolean) => { if (!readOnly) set(toggleGrant(effective, grant, next)); };
  const marcarRecurso = (resource: string, next: boolean) => { if (!readOnly) set(toggleResource(effective, resource, next)); };

  // Agrupa por módulo → grupo, preservando a ordem declarada no registro.
  const grupos = useMemo(() => {
    const map = new Map<string, PermissionResourceDef[]>();
    for (const r of [...PERMISSION_RESOURCES].sort((a, b) => a.order - b.order)) {
      const k = `${r.module}|${r.group}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return [...map.entries()];
  }, []);

  /** Sinal de exceção do recurso em relação ao perfil herdado. */
  const excecao = (grant: string): 'mais' | 'menos' | null => {
    if (!comparando) return null;
    const temEfetivo = effective.has(grant);
    const temBase = base.has(grant);
    if (temEfetivo && !temBase) return 'mais';
    if (!temEfetivo && temBase) return 'menos';
    return null;
  };

  return (
    <div className="space-y-3">
      {grupos.map(([key, recursos]) => {
        const [, grupoLabel] = key.split('|');
        return (
          <div key={key} className="rounded-xl border border-border/70">
            <p className="border-b border-border/70 bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {grupoLabel}
            </p>
            <div className="divide-y divide-border/60">
              {recursos.map(def => {
                const podeVer = effective.has(actionGrant(def.key, 'ver'));
                const expandido = aberto.has(def.key);
                const temCampos = !!def.fields?.length;
                const todas = def.actions.every(a => effective.has(actionGrant(def.key, a)));

                return (
                  <div key={def.key} className="px-3 py-2.5">
                    <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {temCampos && (
                            <button
                              type="button"
                              onClick={() => alternarExpansao(def.key)}
                              aria-expanded={expandido}
                              aria-label={`${expandido ? 'Recolher' : 'Expandir'} campos de ${def.label}`}
                              className="-ml-1 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', expandido && 'rotate-90')} />
                            </button>
                          )}
                          <span className="truncate text-sm font-medium text-foreground">{def.label}</span>
                          {temCampos && (
                            <span className="shrink-0 rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                              {def.fields!.length} campos
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{def.description}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        {def.actions.map(a => {
                          const grant = actionGrant(def.key, a);
                          const marcado = effective.has(grant);
                          const exc = excecao(grant);
                          return (
                            <label key={a} className={cn('flex items-center gap-1.5 text-xs', readOnly && 'opacity-60')}>
                              <Checkbox
                                checked={marcado}
                                disabled={readOnly}
                                onCheckedChange={(c) => marcar(grant, c === true)}
                                aria-label={`${ACTION_LABEL[a]} — ${def.label}`}
                                className="h-3.5 w-3.5"
                              />
                              <span className={cn(marcado ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                                {ACTION_LABEL[a]}
                              </span>
                              {exc && <SinalExcecao tipo={exc} />}
                            </label>
                          );
                        })}
                        {!readOnly && (
                          <Button
                            type="button" variant="ghost" size="sm"
                            className="h-6 px-1.5 text-[11px] text-muted-foreground"
                            onClick={() => marcarRecurso(def.key, !todas)}
                          >
                            {todas ? 'Limpar' : 'Tudo'}
                          </Button>
                        )}
                      </div>
                    </div>

                    {temCampos && expandido && (
                      <div className="mt-2 ml-4 space-y-1.5 rounded-lg border border-dashed border-border/70 bg-muted/20 p-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Campos controlados
                        </p>
                        {!podeVer && (
                          <p className="text-xs text-muted-foreground">
                            Conceda <strong>Ver</strong> nesta tela para liberar campos.
                          </p>
                        )}
                        {def.fields!.map(f => (
                          <div key={f.key} className="flex flex-wrap items-start gap-x-3 gap-y-1">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-foreground">{f.label}</p>
                              {f.description && <p className="text-[11px] text-muted-foreground">{f.description}</p>}
                            </div>
                            <div className="flex items-center gap-3">
                              {f.actions.map(a => {
                                const grant = fieldGrant(def.key, f.key, a);
                                const marcado = effective.has(grant);
                                const exc = excecao(grant);
                                return (
                                  <label key={a} className={cn('flex items-center gap-1.5 text-[11px]', readOnly && 'opacity-60')}>
                                    <Checkbox
                                      checked={marcado}
                                      disabled={readOnly}
                                      onCheckedChange={(c) => marcar(grant, c === true)}
                                      aria-label={`${ACTION_LABEL[a]} campo ${f.label} — ${def.label}`}
                                      className="h-3.5 w-3.5"
                                    />
                                    <span className={cn(marcado ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                                      {ACTION_LABEL[a]}
                                    </span>
                                    {exc && <SinalExcecao tipo={exc} />}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Sem <strong>Ver</strong>, a tela não aparece na navegação e a rota é bloqueada.
        As travas valem na interface; o servidor é a barreira final.
      </p>
    </div>
  );
}

function SinalExcecao({ tipo }: { tipo: 'mais' | 'menos' }) {
  const Icon = tipo === 'mais' ? Plus : Minus;
  return (
    <span
      title={tipo === 'mais' ? 'Concedido além do perfil de acesso' : 'Retirado do perfil de acesso'}
      className={cn(
        'inline-flex h-3.5 w-3.5 items-center justify-center rounded-full',
        tipo === 'mais' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive',
      )}
    >
      <Icon className="h-2.5 w-2.5" />
    </span>
  );
}
