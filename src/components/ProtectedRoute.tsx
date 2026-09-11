import { Navigate } from 'react-router-dom';
import { useAuth, UserPerfil, DEFAULT_ROUTE, type SectionKey } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { AccessDenied } from '@/components/AccessDenied';
import { resourceDef } from '@/config/permissions';
import { sectionLabel } from '@/features/users/domain/permissionDefinitions';
import { decidirAcessoRota } from '@/domain/permissions/routeGuard';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Restrição por perfil (mantida para as rotas que já usavam). */
  allowedPerfis?: UserPerfil[];
  /** Restrição por SEÇÃO (canAccess — admin sempre passa). Fonte única de acesso ao módulo. */
  section?: SectionKey;
  /**
   * Restrição por RECURSO (tela) — exige a ação 'ver' das permissões granulares.
   * Aplicada SOMENTE a usuários já migrados para o modelo granular; usuário
   * legado continua governado por perfil/seção, sem qualquer mudança de
   * comportamento. Ver src/config/permissions.ts.
   */
  resource?: string;
}

/**
 * Guarda de rota. A DECISÃO (e a ordem de precedência entre perfil, seção e
 * recurso) vive em src/domain/permissions/routeGuard.ts, pura e testada — aqui
 * fica só a renderização de cada desfecho.
 */
export function ProtectedRoute({ children, allowedPerfis, section, resource }: ProtectedRouteProps) {
  const { profile, loading, canAccess, can, isGranular } = useAuth();

  const decisao = decidirAcessoRota({
    loading,
    autenticado: !!profile,
    perfil: profile?.perfil ?? '',
    allowedPerfis,
    section,
    resource,
    isGranular,
    canAccess: (s) => canAccess(s as SectionKey),
    can,
  });

  switch (decisao.kind) {
    // Aguarda a restauração da sessão antes de decidir (evita piscar conteúdo/loop).
    case 'carregando':
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-700" />
        </div>
      );

    case 'login':
      return <Navigate to="/login" replace />;

    case 'redirecionar':
      return <Navigate to={DEFAULT_ROUTE[profile!.perfil]} replace />;

    // Acesso negado com nome amigável da tela/seção (não redireciona em loop,
    // não usa 404). O servidor é a barreira final.
    case 'negado':
      return decisao.motivo === 'secao'
        ? <AccessDenied area={sectionLabel(section!)} />
        : <AccessDenied area={resourceDef(resource!)?.label} />;

    default:
      return <>{children}</>;
  }
}
