import { Plus, Minus, AlertTriangle } from 'lucide-react';
import { grantLabel, isKnownGrant } from '@/config/permissions';

interface Props {
  mais: string[];
  menos: string[];
  /** Texto quando não há exceção alguma. */
  vazio?: string;
}

/** Lista legível das exceções de permissão (concedidas / retiradas do perfil). */
export function PermissionGrantComparison({ mais, menos, vazio = 'Nenhuma exceção — o usuário segue exatamente o perfil de acesso.' }: Props) {
  if (mais.length === 0 && menos.length === 0) {
    return <p className="text-sm text-muted-foreground">{vazio}</p>;
  }
  return (
    <div className="space-y-1.5 text-sm">
      {mais.map(g => (
        <div key={`a-${g}`} className="flex items-start gap-1.5 text-success">
          <Plus className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{grantLabel(g)}</span>
          {!isKnownGrant(g) && <Desconhecida />}
        </div>
      ))}
      {menos.map(g => (
        <div key={`r-${g}`} className="flex items-start gap-1.5 text-destructive">
          <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{grantLabel(g)}</span>
          {!isKnownGrant(g) && <Desconhecida />}
        </div>
      ))}
    </div>
  );
}

function Desconhecida() {
  return (
    <span
      title="Permissão fora do registro atual — preservada, mas deve ser revisada."
      className="inline-flex items-center gap-1 text-[10px] text-status-warning"
    >
      <AlertTriangle className="h-3 w-3" /> a revisar
    </span>
  );
}
