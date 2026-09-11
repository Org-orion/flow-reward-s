import { ShieldCheck, AlertTriangle, SlidersHorizontal } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { accessSummary } from '../domain/userAccess';
import type { UserAccess } from '../domain/userAccess';

interface Props {
  access: UserAccess;
  /** O usuário está sob permissões detalhadas (perfil de acesso e/ou exceções). */
  granular?: boolean;
}

/**
 * Resumo compacto do acesso (sem dezenas de chips). O selo "detalhado" evita a
 * leitura errada de "Sem acesso" em quem tem permissões por tela/campo mas
 * nenhuma seção marcada.
 */
export function UserAccessSummary({ access, granular }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      {access.kind === 'total' && <ShieldCheck className="h-3.5 w-3.5 text-[#7a5f16]" />}
      <span className={access.kind === 'total' ? 'text-sm font-medium text-[#7a5f16]' : 'text-sm text-foreground'}>
        {granular && access.kind === 'sem_acesso' ? 'Acesso detalhado' : accessSummary(access)}
      </span>
      {granular && access.kind !== 'total' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              <SlidersHorizontal className="h-3 w-3" /> detalhado
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-[240px]">Permissões por tela e por campo (perfil de acesso e/ou exceções). Abra "Editar acessos" para ver.</TooltipContent>
        </Tooltip>
      )}
      {access.desconhecidas.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-status-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-status-warning"><AlertTriangle className="h-3 w-3" /> {access.desconhecidas.length}</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-[240px]">Permissões não reconhecidas (revisar): {access.desconhecidas.join(', ')}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
