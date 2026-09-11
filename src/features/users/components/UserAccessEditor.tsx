import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { PERMISSION_DEFS, type PermissionGroup } from '../domain/permissionDefinitions';
import type { SectionKey } from '@/contexts/AuthContext';

interface Props {
  perfil: string;
  secoes: string[];
  onChange: (secoes: string[]) => void;
  desconhecidas?: string[];
  /** Somente leitura (ex.: acesso detalhado ligado — as seções ficam preservadas). */
  readOnly?: boolean;
}

const GROUP_LABEL: Record<PermissionGroup, string> = { operacao: 'Operação', administracao: 'Administração' };

/** Seletor de seções agrupado. Admin ignora seções (acesso total). Preserva
 *  seções desconhecidas (não editáveis aqui, apenas exibidas para revisão). */
export function UserAccessEditor({ perfil, secoes, onChange, desconhecidas = [], readOnly = false }: Props) {
  const isAdmin = perfil === 'admin';
  const travado = isAdmin || readOnly;
  const toggle = (key: SectionKey) => {
    if (secoes.includes(key)) onChange(secoes.filter(s => s !== key));
    else onChange([...secoes, key]);
  };
  const groups: PermissionGroup[] = ['operacao', 'administracao'];

  return (
    <div className="space-y-3">
      {isAdmin && (
        <div className="flex items-start gap-2 rounded-xl border border-[#c8a83f]/40 bg-[#f7f0d7]/40 p-3 text-sm">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#7a5f16]" />
          <span className="text-foreground">Administradores têm <strong>acesso total</strong>. A seleção de seções não se aplica.</span>
        </div>
      )}
      {groups.map(g => (
        <div key={g}>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{GROUP_LABEL[g]}</p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {PERMISSION_DEFS.filter(d => d.group === g).map(d => {
              const checked = isAdmin || secoes.includes(d.key);
              return (
                <label key={d.key} className={cn('flex items-start gap-2 rounded-lg border p-2.5 text-sm', checked && !isAdmin ? 'border-primary/40 bg-primary/5' : 'border-border/70', travado && 'opacity-60')}>
                  <Checkbox checked={checked} disabled={travado} onCheckedChange={() => toggle(d.key)} className="mt-0.5" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">{d.label}{d.sensitivity === 'sensivel' && <span className="rounded-full bg-status-warning/10 px-1.5 text-[10px] font-medium text-status-warning">sensível</span>}</span>
                    <span className="block text-xs text-muted-foreground">{d.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
      {desconhecidas.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-status-warning/40 bg-status-warning/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" />
          <div className="min-w-0">
            <p className="text-foreground">Permissões não reconhecidas (preservadas): {desconhecidas.join(', ')}.</p>
            <p className="text-xs text-muted-foreground">Podem pertencer a outro módulo. Não são removidas automaticamente.</p>
          </div>
        </div>
      )}
    </div>
  );
}
