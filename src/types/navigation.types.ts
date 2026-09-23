import type { LucideIcon } from 'lucide-react';
import type { SectionKey } from '@/contexts/AuthContext';

/** Módulos que possuem árvore de navegação própria na sidebar global. */
export type SidebarModuleId = 'premiacoes' | 'cargos-salarios' | 'controle-estoque' | 'horas-extras';

/**
 * Item de navegação da sidebar global. Apenas DADOS — o componente que
 * renderiza é único (AppSidebar). `section`/`adminOnly` refletem as permissões
 * já existentes (não criam um sistema paralelo).
 */
export interface SidebarNavItem {
  id: string;
  title: string;
  icon: LucideIcon;
  /** Rota do item folha (ou do cabeçalho do grupo, quando navegável). */
  href?: string;
  /** Subitens (torna o item um grupo expansível). */
  children?: SidebarNavItem[];
  /** Seção exigida (canAccess). admin sempre passa (via canAccess). */
  section?: SectionKey;
  /**
   * Recurso (tela) exigido — exige a ação 'ver' nas permissões granulares.
   * Ver src/config/permissions.ts. Para usuário legado a checagem equivale à
   * seção do recurso, então não altera o que ele já enxergava.
   */
  resource?: string;
  /** Visível apenas para administradores. */
  adminOnly?: boolean;
  /** Correspondência exata para o estado ativo (raízes de dashboard). */
  exactActive?: boolean;
}

/** Contexto de permissões usado para filtrar a navegação. */
export interface NavPermissionContext {
  isAdmin: boolean;
  canAccess: (section: SectionKey) => boolean;
  /** Ação em um recurso (tela). Ver src/config/permissions.ts. */
  can: (resource: string, action: 'ver') => boolean;
  /**
   * O usuário já está no modelo granular? O filtro por `resource` só se aplica
   * a ele — usuário legado continua governado apenas por seção/perfil, sem
   * qualquer mudança no que já enxergava.
   */
  isGranular: boolean;
}
