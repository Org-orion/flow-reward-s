import {
  LayoutDashboard, Users, Shield, HardHat, AlertTriangle, BarChart3, TrendingUp, PieChart,
  Settings, Building2, Layers, UserCog, Tag, Target, Factory, BarChart4, Gift,
  UserCheck, TrendingUpIcon, FileBarChart2, Briefcase, Shirt, PackagePlus, ClipboardCheck, Repeat2,
  SlidersHorizontal, ArrowLeftRight, BellRing, Replace, Undo2, Boxes, Truck, History, Percent,
} from 'lucide-react';
import type { SidebarModuleId, SidebarNavItem, NavPermissionContext } from '@/types/navigation.types';

/**
 * Fonte única da navegação da sidebar. Apenas os DADOS variam por módulo; o
 * componente visual (AppSidebar) é o mesmo em toda a aplicação. Rotas espelham
 * as rotas reais de App.tsx — nada inventado.
 */
export const navigationByModule: Record<SidebarModuleId, SidebarNavItem[]> = {
  premiacoes: [
    { id: 'dashboard', title: 'DASHBOARD', href: '/premiacoes', icon: LayoutDashboard, section: 'dashboard', exactActive: true },
    {
      id: 'rh', title: 'RH', icon: UserCheck, section: 'rh',
      children: [
        { id: 'rh-func', title: 'Funcionários', href: '/premiacoes/funcionarios', icon: Users },
        { id: 'rh-faltas', title: 'Faltas/Advertências', href: '/premiacoes/faltas-advertencias', icon: AlertTriangle },
      ],
    },
    {
      id: 'sesmt', title: 'SESMT', icon: Shield, section: 'sesmt',
      children: [
        { id: 'sesmt-dss', title: 'DSS', href: '/premiacoes/dss', icon: Shield },
        { id: 'sesmt-epi', title: 'EPI', href: '/premiacoes/epi', icon: HardHat },
      ],
    },
    {
      id: 'producao', title: 'PRODUÇÃO', icon: Factory, section: 'producao',
      children: [
        { id: 'prod-setor', title: 'Produção por Setor', href: '/premiacoes/producao-setor', icon: BarChart3 },
        { id: 'prod-ind-setor', title: 'Indicadores por Setor', href: '/premiacoes/indicadores-setor', icon: TrendingUp },
        { id: 'prod-ind-gerais', title: 'Indicadores Gerais', href: '/premiacoes/indicadores-gerais', icon: PieChart },
      ],
    },
    {
      id: 'premiacoes', title: 'PREMIAÇÕES', icon: Gift, section: 'premiacoes',
      children: [
        { id: 'prem-gerar', title: 'Gerar Premiações', href: '/premiacoes/gerar-premiacoes', icon: Gift },
        { id: 'prem-rel', title: 'Relatório de Premiações', href: '/premiacoes/relatorio-premiacoes', icon: FileBarChart2 },
      ],
    },
    {
      id: 'cadastros', title: 'CADASTROS', icon: Settings, section: 'cadastros',
      children: [
        { id: 'cad-setores', title: 'Setores', href: '/premiacoes/cadastros/setores', icon: Building2 },
        { id: 'cad-faixas', title: 'Faixas', href: '/premiacoes/cadastros/faixas', icon: Layers },
        { id: 'cad-funcoes', title: 'Funções', href: '/premiacoes/cadastros/funcoes', icon: UserCog },
        { id: 'cad-categorias', title: 'Categorias', href: '/premiacoes/cadastros/categorias', icon: Tag },
        { id: 'cad-base', title: 'Base Premiação', href: '/premiacoes/cadastros/base-premiacao', icon: Target },
        { id: 'cad-empresas', title: 'Empresas', href: '/premiacoes/cadastros/empresas', icon: Factory },
        { id: 'cad-tipos-ind', title: 'Tipos de Indicadores', href: '/premiacoes/cadastros/tipos-indicadores', icon: BarChart4 },
        { id: 'cad-tipos-ind-ger', title: 'Tipos Indicadores Gerais', href: '/premiacoes/cadastros/tipos-indicadores-gerais', icon: PieChart },
        { id: 'cad-locais-dss', title: 'Locais DSS', href: '/premiacoes/cadastros/locais-dss', icon: Shield },
        { id: 'cad-formulas', title: 'Fórmulas de Cálculo', href: '/premiacoes/cadastros/formulas-calculo', icon: Settings },
        { id: 'cad-kits', title: 'Configurações Kits', href: '/premiacoes/cadastros/configuracoes-kits', icon: TrendingUpIcon },
        { id: 'cad-bonus-pct', title: 'Bônus Percentual', href: '/premiacoes/cadastros/bonus-percentual', icon: Percent },
      ],
    },
    { id: 'usuarios', title: 'USUÁRIOS', href: '/cadastros/usuarios', icon: Users, adminOnly: true },
  ],
  'cargos-salarios': [
    { id: 'cs-dashboard', title: 'DASHBOARD', href: '/cargos-salarios', icon: LayoutDashboard, exactActive: true },
    { id: 'cs-cargos', title: 'Cargos', href: '/cargos-salarios/cargos', icon: Briefcase },
    { id: 'cs-func', title: 'Funcionários', href: '/cargos-salarios/funcionarios', icon: Users },
    {
      id: 'cs-cadastros', title: 'CADASTROS', icon: Settings,
      children: [
        { id: 'cs-cad-setores', title: 'Setores', href: '/cargos-salarios/cadastros/setores', icon: Building2 },
      ],
    },
  ],
  'controle-estoque': [
    // Todos os itens exigem a seção 'estoque' (admin bypassa via canAccess). Sem a
    // seção, filterNavigation esconde o módulo inteiro — espelha o gate da rota.
    { id: 'ce-visao-geral', title: 'DASHBOARD', href: '/controle-estoque', icon: LayoutDashboard, section: 'estoque', exactActive: true },
    {
      id: 'ce-grp-estoque', title: 'ESTOQUE', icon: Boxes, section: 'estoque',
      children: [
        { id: 'ce-fardamentos', title: 'Fardamentos', href: '/controle-estoque/fardamentos', icon: Shirt },
        { id: 'ce-alertas', title: 'Alertas', href: '/controle-estoque/alertas', icon: BellRing },
        { id: 'ce-ajuste', title: 'Ajuste de saldo', href: '/controle-estoque/ajuste', icon: SlidersHorizontal },
      ],
    },
    {
      id: 'ce-grp-operacoes', title: 'OPERAÇÕES', icon: Truck, section: 'estoque',
      children: [
        { id: 'ce-entradas', title: 'Entradas', href: '/controle-estoque/entradas', icon: PackagePlus },
        { id: 'ce-entregas', title: 'Entregas', href: '/controle-estoque/entregas', icon: ClipboardCheck },
        { id: 'ce-devolucoes', title: 'Devoluções', href: '/controle-estoque/devolucoes', icon: Repeat2 },
        { id: 'ce-troca', title: 'Troca de item', href: '/controle-estoque/troca', icon: Replace },
      ],
    },
    {
      id: 'ce-grp-historico', title: 'HISTÓRICO', icon: History, section: 'estoque',
      children: [
        { id: 'ce-movimentacoes', title: 'Movimentações', href: '/controle-estoque/movimentacoes', icon: ArrowLeftRight },
        { id: 'ce-estornos', title: 'Estornos', href: '/controle-estoque/estornos', icon: Undo2 },
      ],
    },
    { id: 'ce-cadastros', title: 'CADASTROS', href: '/controle-estoque/cadastros', icon: Settings, section: 'estoque' },
  ],
};

/**
 * Resolve o módulo atual pela rota. Fonte ÚNICA — nenhum `pathname.includes`
 * espalhado pelos componentes.
 */
export function resolveSidebarModule(pathname: string): SidebarModuleId {
  if (pathname.startsWith('/controle-estoque')) return 'controle-estoque';
  if (pathname.startsWith('/cargos-salarios')) return 'cargos-salarios';
  return 'premiacoes';
}

/** Rota-raiz de cada módulo (destino do logo/cabeçalho). */
export const moduleHome: Record<SidebarModuleId, string> = {
  premiacoes: '/premiacoes',
  'cargos-salarios': '/cargos-salarios',
  'controle-estoque': '/controle-estoque',
};

/** Item ativo: exato para raízes marcadas; senão, por prefixo de rota. */
export function isItemActive(item: SidebarNavItem, pathname: string): boolean {
  if (!item.href) return false;
  return item.exactActive ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/');
}

/** Grupo ativo quando qualquer filho estiver ativo. */
export function isGroupActive(item: SidebarNavItem, pathname: string): boolean {
  return !!item.children?.some((c) => isItemActive(c, pathname) || isGroupActive(c, pathname));
}

/**
 * Filtra a navegação pelas permissões já existentes (não cria regra nova).
 * admin passa por `canAccess`. Grupos sem filhos visíveis e sem rota própria
 * são removidos.
 */
export function filterNavigation(items: SidebarNavItem[], ctx: NavPermissionContext): SidebarNavItem[] {
  const out: SidebarNavItem[] = [];
  for (const item of items) {
    if (item.adminOnly && !ctx.isAdmin) continue;
    if (item.section && !ctx.canAccess(item.section)) continue;
    if (item.children) {
      const children = filterNavigation(item.children, ctx);
      if (children.length === 0 && !item.href) continue;
      out.push({ ...item, children });
    } else {
      out.push(item);
    }
  }
  return out;
}

/** IDs dos grupos que devem iniciar abertos (os que contêm a rota ativa). */
export function activeGroupIds(items: SidebarNavItem[], pathname: string): string[] {
  return items.filter((i) => i.children && isGroupActive(i, pathname)).map((i) => i.id);
}
