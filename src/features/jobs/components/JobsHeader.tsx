import type { ReactNode } from 'react';
import { Briefcase, Plus } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props {
  onNovoCargo: () => void;
  children?: ReactNode;
}

/** Cabeçalho compacto da Central de Estrutura de Cargos + navegação e ação principal. */
export function JobsHeader({ onNovoCargo, children }: Props) {
  const acesso = useResourceAccess('cs_cargos');
  return (
    <div className="space-y-4">
      <PageHeader
        icon={Briefcase}
        title="Central de Estrutura de Cargos"
        description="Cadastre, organize e acompanhe os cargos que formam a estrutura organizacional."
        actions={acesso.podeCriar ? <Button className="gap-2" onClick={onNovoCargo}><Plus className="h-4 w-4" /> Novo cargo</Button> : undefined}
      />
      {children}
    </div>
  );
}
