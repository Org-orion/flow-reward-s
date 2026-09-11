import type { ReactNode } from 'react';
import { Users, Plus } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props {
  onNovoFuncionario: () => void;
  children?: ReactNode;
}

/** Cabeçalho compacto da Central de Enquadramento de Colaboradores. */
export function JobEmployeesHeader({ onNovoFuncionario, children }: Props) {
  const acesso = useResourceAccess('cs_funcionarios');
  return (
    <div className="space-y-4">
      <PageHeader
        icon={Users}
        title="Central de Enquadramento de Colaboradores"
        description="Gerencie vínculos entre colaboradores, cargos, níveis, setores e faixas salariais."
        actions={acesso.podeCriar ? <Button className="gap-2" onClick={onNovoFuncionario}><Plus className="h-4 w-4" /> Novo funcionário</Button> : undefined}
      />
      {children}
    </div>
  );
}
