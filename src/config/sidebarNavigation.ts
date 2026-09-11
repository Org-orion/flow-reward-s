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
    { id: 'dashboard', title: 'DASHBOARD', href: '/premiacoes', icon: LayoutDashboard, section: 'dashboard', exactActive: true, resource: 'dashboard_premiacoes' },
    {
      id: 'rh', title: 'RH', icon: UserCheck, section: 'rh',
      children: [
        { id: 'rh-func', title: 'Funcionários', href: '/premiacoes/funcionarios', icon: Users, resource: 'funcionarios' },
        { id: 'rh-faltas', title: 'Faltas/Advertências', href: '/premiacoes/faltas-advertencias', icon: AlertTriangle, resource: 'faltas_advertencias' },
      ],
    },
    {
      id: 'sesmt', title: 'SESMT', icon: Shield, section: 'sesmt',
      children: [
        { id: 'sesmt-dss', title: 'DSS', href: '/premiacoes/dss', icon: Shield, resource: 'dss' },
        { id: 'sesmt-epi', title: 'EPI', href: '/premiacoes/epi', icon: HardHat, resource: 'epi' },
      ],
    },
    {
      id: 'producao', title: 'PRODUÇÃO', icon: Factory, section: 'producao',
      children: [
        // `resource` = permissão granular por tela (src/config/permissions.ts).
        { id: 'prod-setor', title: 'Produção por Setor', href: '/premiacoes/producao-setor', icon: BarChart3, resource: 'producao_setor' },
        { id: 'prod-ind-setor', title: 'Indicadores por Setor', href: '/premiacoes/indicadores-setor', icon: TrendingUp, resource: 'indicadores_setor' },
        { id: 'prod-ind-gerais', title: 'Indicadores Gerais', href: '/premiacoes/indicadores-gerais', icon: PieChart, resource: 'indicadores_gerais' },
      ],
    },
    {
      id: 'premiacoes', title: 'PREMIAÇÕES', icon: Gift, section: 'premiacoes',
      children: [
        { id: 'prem-gerar', title: 'Gerar Premiações', href: '/premiacoes/gerar-premiacoes', icon: Gift, resource: 'gerar_premiacoes' },
        { id: 'prem-rel', title: 'Relatório de Premiações', href: '/premiacoes/relatorio-premiacoes', icon: FileBarChart2, resource: 'relatorio_premiacoes' },
      ],
    },
    {
      id: 'cadastros', title: 'CADASTROS', icon: Settings, section: 'cadastros',
      children: [
        { id: 'cad-setores', title: 'Setores', href: '/premiacoes/cadastros/setores', icon: Building2, resource: 'cad_setores' },
        { id: 'cad-faixas', title: 'Faixas', href: '/premiacoes/cadastros/faixas', icon: Layers, resource: 'cad_faixas' },
        { id: 'cad-funcoes', title: 'Funções', href: '/premiacoes/cadastros/funcoes', icon: UserCog, resource: 'cad_funcoes' },
        { id: 'cad-categorias', title: 'Categorias', href: '/premiacoes/cadastros/categorias', icon: Tag, resource: 'cad_categorias' },
        { id: 'cad-base', title: 'Base Premiação', href: '/premiacoes/cadastros/base-premiacao', icon: Target, resource: 'cad_base_premiacao' },
        { id: 'cad-empresas', title: 'Empresas', href: '/premiacoes/cadastros/empresas', icon: Factory, resource: 'cad_empresas' },
        { id: 'cad-tipos-ind', title: 'Tipos de Indicadores', href: '/premiacoes/cadastros/tipos-indicadores', icon: BarChart4, resource: 'cad_tipos_indicadores' },
        { id: 'cad-tipos-ind-ger', title: 'Tipos Indicadores Gerais', href: '/premiacoes/cadastros/tipos-indicadores-gerais', icon: PieChart, resource: 'cad_tipos_indicadores_gerais' },
        { id: 'cad-locais-dss', title: 'Locais DSS', href: '/premiacoes/cadastros/locais-dss', icon: Shield, resource: 'cad_locais_dss' },
        { id: 'cad-formulas', title: 'Fórmulas de Cálculo', href: '/premiacoes/cadastros/formulas-calculo', icon: Settings, resource: 'cad_formulas_calculo' },
        { id: 'cad-kits', title: 'Configurações Kits', href: '/premiacoes/cadastros/configuracoes-kits', icon: TrendingUpIcon, resource: 'cad_configuracoes_kits' },
        { id: 'cad-bonus-pct', title: 'Bônus Percentual', href: '/premiacoes/cadastros/bonus-percentual', icon: Percent, resource: 'cad_bonus_percentual' },
      ],
    },
    { id: 'usuarios', title: 'USUÁRIOS', href: '/cadastros/usuarios', icon: Users, adminOnly: true },
  ],
  'cargos-salarios': [
    { id: 'cs-dashboard', title: 'DASHBOARD', href: '/cargos-salarios', icon: LayoutDashboard, exactActive: true, resource: 'cs_dashboard' },
    { id: 'cs-cargos', title: 'Cargos', href: '/cargos-salarios/cargos', icon: Briefcase, resource: 'cs_cargos' },
    { id: 'cs-func', title: 'Funcionários', href: '/cargos-salarios/funcionarios', icon: Users, resource: 'cs_funcionarios' },
    {
      id: 'cs-cadastros', title: 'CADASTROS', icon: Settings,
      children: [
        { id: 'cs-cad-setores', title: 'Setores', href: '/cargos-salarios/cadastros/setores', icon: Building2, resource: 'cad_setores' },
      ],
    },
  ],
  'controle-estoque': [
    // Todos os itens exigem a seção 'estoque' (admin bypassa via canAccess). Sem a
    // seção, filterNavigation esconde o módulo inteiro — espelha o gate da rota.
    { id: 'ce-visao-geral', title: 'DASHBOARD', href: '/controle-estoque', icon: LayoutDashboard, section: 'estoque', exactActive: true, resource: 'est_visao_geral' },
    {
      id: 'ce-grp-estoque', title: 'ESTOQUE', icon: Boxes, section: 'estoque',
      children: [
        { id: 'ce-fardamentos', title: 'Fardamentos', href: '/controle-estoque/fardamentos', icon: Shirt, resource: 'est_fardamentos' },
        { id: 'ce-alertas', title: 'Alertas', href: '/controle-estoque/alertas', icon: BellRing, resource: 'est_alertas' },
        { id: 'ce-ajuste', title: 'Ajuste de saldo', href: '/controle-estoque/ajuste', icon: SlidersHorizontal, resource: 'est_ajuste' },
      ],
    },
    {
      id: 'ce-grp-operacoes', title: 'OPERAÇÕES', icon: Truck, section: 'estoque',
      children: [
        { id: 'ce-entradas', title: 'Entradas', href: '/controle-estoque/entradas', icon: PackagePlus, resource: 'est_entradas' },
        { id: 'ce-entregas', title: 'Entregas', href: '/controle-estoque/entregas', icon: ClipboardCheck, resource: 'est_entregas' },
        { id: 'ce-devolucoes', title: 'Devoluções', href: '/controle-estoque/devolucoes', icon: Repeat2, resource: 'est_devolucoes' },
        { id: 'ce-troca', title: 'Troca de item', href: '/controle-estoque/troca', icon: Replace, resource: 'est_troca' },
      ],
    },
    {
      id: 'ce-grp-historico', title: 'HISTÓRICO', icon: History, section: 'estoque',
      children: [
        { id: 'ce-movimentacoes', title: 'Movimentações', href: '/controle-estoque/movimentacoes', icon: ArrowLeftRight, resource: 'est_movimentacoes' },
        { id: 'ce-estornos', title: 'Estornos', href: '/controle-estoque/estornos', icon: Undo2, resource: 'est_estornos' },
      ],
    },
    { id: 'ce-cadastros', title: 'CADASTROS', href: '/controle-estoque/cadastros', icon: Settings, section: 'estoque', resource: 'est_cadastros' },
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
 * Filtra a navegação pelas permissões existentes. admin passa por `canAccess`.
 * Itens com `resource` exigem também a ação 'ver' daquela tela, mas SOMENTE
 * para quem já está no modelo granular (`ctx.isGranular`) — usuário legado
 * continua vendo exatamente o que via, governado por seção/perfil. Grupos sem
 * filhos visíveis e sem rota própria são removidos.
 */
export function filterNavigation(items: SidebarNavItem[], ctx: NavPermissionContext): SidebarNavItem[] {
  const out: SidebarNavItem[] = [];
  for (const item of items) {
    if (item.adminOnly && !ctx.isAdmin) continue;
    if (item.section && !ctx.canAccess(item.section)) continue;
    if (item.resource && ctx.isGranular && !ctx.can(item.resource, 'ver')) continue;
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
