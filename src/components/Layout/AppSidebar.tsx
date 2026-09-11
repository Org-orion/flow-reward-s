import { useEffect, useMemo, useRef, useState } from 'react';
import logoCollapsed from '@/assets/logo-concrem-collapsed-new.png';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSidebar } from './MainLayout';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, Home, LogOut, Menu, type LucideIcon } from 'lucide-react';
import type { SidebarNavItem } from '@/types/navigation.types';
import {
  navigationByModule, resolveSidebarModule, isItemActive, isGroupActive, filterNavigation, activeGroupIds,
} from '@/config/sidebarNavigation';

// Identidade institucional — IDÊNTICA em todos os módulos (não varia por página).
const brandName = 'CONCREM';
const productName = 'Gestão de RH';
const environmentLabel = 'PROD';

/**
 * Sidebar global única. Mesma identidade, estrutura, dimensões e interações em
 * toda a aplicação; apenas os ITENS de navegação variam conforme o módulo atual
 * (resolvido pela rota) e as permissões já existentes. Reutiliza o contexto de
 * colapso (useSidebar) e os fluxos reais de auth (signOut) e Hub.
 */
export const AppSidebar = () => {
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canAccess, can, isGranular, signOut, profile } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const asideRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const moduleId = resolveSidebarModule(location.pathname);
  const isAdmin = profile?.perfil === 'admin';

  const nav = useMemo(
    () => filterNavigation(navigationByModule[moduleId], { isAdmin, canAccess, can, isGranular }),
    [moduleId, isAdmin, canAccess, can, isGranular],
  );

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(activeGroupIds(nav, location.pathname)));
  // Abre automaticamente o grupo da rota ativa; nunca fecha os demais.
  useEffect(() => {
    const ativos = activeGroupIds(nav, location.pathname);
    if (ativos.length === 0) return;
    setOpenGroups((prev) => {
      const faltando = ativos.filter((id) => !prev.has(id));
      if (faltando.length === 0) return prev;
      const n = new Set(prev);
      faltando.forEach((id) => n.add(id));
      return n;
    });
  }, [location.pathname, nav]);

  const collapsed = !isMobile && isCollapsed;

  // Escape fecha o drawer mobile e devolve o foco ao gatilho.
  useEffect(() => {
    if (!isMobile || !mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMobileOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    asideRef.current?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [isMobile, mobileOpen]);

  const userName = profile?.nome ?? (isAdmin ? 'Administrador' : 'Usuário');
  const role = profile?.perfil ?? '';
  const initials = userName.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'U';

  const closeMobile = () => { if (isMobile) setMobileOpen(false); };
  const toggleCollapse = () => { if (isMobile) setMobileOpen(false); else setIsCollapsed(!isCollapsed); };
  const toggleGroup = (id: string) => setOpenGroups((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
      toast({ title: 'Logout realizado com sucesso' });
    } catch {
      toast({ title: 'Erro ao fazer logout', variant: 'destructive' });
    }
  };

  const showDashboard = canAccess('dashboard');

  const leafClasses = (active: boolean) =>
    cn(
      'group relative flex h-8 items-center rounded-md text-[13px] font-medium transition-colors',
      collapsed ? 'justify-center px-0' : 'gap-3 px-3',
      active
        ? 'bg-emerald-500/[0.12] text-white before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-emerald-400'
        : 'text-emerald-50/70 hover:bg-emerald-500/10 hover:text-white',
    );

  const renderLeaf = (item: SidebarNavItem) => {
    const active = isItemActive(item, location.pathname);
    const Icon = item.icon as LucideIcon;
    return (
      <Link
        key={item.id} to={item.href ?? '#'} onClick={closeMobile}
        title={collapsed ? item.title : undefined} aria-current={active ? 'page' : undefined}
        className={leafClasses(active)}
      >
        <Icon className={cn('shrink-0', collapsed ? 'h-[18px] w-[18px]' : 'h-4 w-4')} />
        {!collapsed && <span className="truncate">{item.title}</span>}
      </Link>
    );
  };

  const renderSub = (item: SidebarNavItem) => {
    const active = isItemActive(item, location.pathname);
    const Icon = item.icon as LucideIcon;
    return (
      <Link
        key={item.id} to={item.href ?? '#'} onClick={closeMobile} aria-current={active ? 'page' : undefined}
        className={cn(
          'relative flex h-7 items-center gap-2.5 rounded-md pl-3 pr-2 text-[12px] transition-colors',
          active ? 'bg-emerald-500/10 font-medium text-white' : 'text-emerald-50/55 hover:bg-emerald-500/[0.07] hover:text-white',
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{item.title}</span>
      </Link>
    );
  };

  const renderGroup = (item: SidebarNavItem) => {
    const Icon = item.icon as LucideIcon;
    const children = item.children ?? [];
    if (collapsed) return <div key={item.id}>{children.map(renderLeaf)}</div>;
    const open = openGroups.has(item.id);
    const active = isGroupActive(item, location.pathname);
    const panelId = `nav-group-${item.id}`;
    return (
      <div key={item.id}>
        <button
          type="button" onClick={() => toggleGroup(item.id)}
          aria-expanded={open} aria-controls={panelId}
          className={cn(
            'relative flex h-8 w-full items-center gap-3 rounded-md px-3 text-[13px] font-medium transition-colors',
            active
              ? 'bg-emerald-500/[0.12] text-white before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-emerald-400'
              : 'text-emerald-50/70 hover:bg-emerald-500/10 hover:text-white',
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{item.title}</span>
          <ChevronDown className={cn('ml-auto h-3.5 w-3.5 shrink-0 text-emerald-200/50 transition-transform duration-200', open ? 'rotate-0' : '-rotate-90')} />
        </button>
        {open && (
          <div id={panelId} className="ml-[1.35rem] mt-0.5 space-y-0.5 border-l border-emerald-900/50 pl-2">
            {children.map(renderSub)}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {isMobile && !mobileOpen && (
        <button
          ref={triggerRef} type="button" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"
          className="fixed left-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {isMobile && mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]" onClick={() => setMobileOpen(false)} aria-hidden />
      )}

      <aside
        ref={asideRef} tabIndex={-1}
        aria-label="Navegação principal"
        aria-hidden={isMobile && !mobileOpen}
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-emerald-900/40 bg-primary text-primary-foreground transition-all duration-300 focus:outline-none',
          isMobile ? 'w-60' : collapsed ? 'w-[76px]' : 'w-60',
          isMobile && (mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'),
        )}
      >
        {/* Cabeçalho institucional — a área toda da logo é o gatilho de abrir/recolher */}
        <div className={cn('border-b border-emerald-900/40', collapsed ? 'flex flex-col items-center px-2 py-4' : 'flex items-center px-4 py-4')}>
          <button
            type="button" onClick={toggleCollapse}
            title={isMobile ? 'Fechar menu' : collapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-label={isMobile ? 'Fechar menu' : collapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-expanded={!collapsed}
            className={cn('flex min-w-0 items-center gap-2.5 rounded-md text-left transition-colors hover:bg-emerald-500/10', !collapsed && 'w-full')}
          >
            <img src={logoCollapsed} alt={brandName} className="h-9 w-9 shrink-0 object-contain" />
            {!collapsed && (
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-white">{brandName}</span>
                  <span className="rounded bg-emerald-500/15 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-emerald-300">{environmentLabel}</span>
                </span>
                <span className="block truncate text-[11px] text-emerald-100/50">{productName}</span>
              </span>
            )}
          </button>
        </div>

        {/* Navegação */}
        <nav className="scrollbar-hide flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          {nav.map((item) => (item.children ? renderGroup(item) : renderLeaf(item)))}
        </nav>

        {/* Rodapé — usuário + ações */}
        <div className="mt-auto space-y-2 p-3">
          <div className={cn('flex items-center gap-2.5 border-b border-emerald-900/40 pb-2.5', collapsed ? 'justify-center px-0' : 'px-2')} title={collapsed ? userName : undefined}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-semibold text-emerald-200">{initials}</span>
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-white">{userName}</span>
                {role && <span className="block truncate text-[11px] capitalize text-emerald-100/50">{role}</span>}
              </span>
            )}
          </div>

          <div className={cn('flex gap-2', collapsed && 'flex-col')}>
            {showDashboard && (
              <Link to="/" onClick={closeMobile} title={collapsed ? 'Voltar ao Hub' : undefined} className={cn(leafClasses(false), !collapsed && 'flex-1')}>
                <Home className={cn('shrink-0', collapsed ? 'h-[18px] w-[18px]' : 'h-4 w-4')} />
                {!collapsed && <span className="truncate">Voltar ao Hub</span>}
              </Link>
            )}
            <button
              type="button" onClick={handleLogout} title={collapsed ? 'Sair' : undefined} aria-label="Sair"
              className={cn(
                'group relative flex h-8 items-center rounded-md text-[13px] font-medium text-red-300/80 transition-colors hover:bg-red-500/10 hover:text-red-200',
                collapsed ? 'w-full justify-center px-0' : 'shrink-0 gap-2 px-3',
              )}
            >
              <LogOut className={cn('shrink-0', collapsed ? 'h-[18px] w-[18px]' : 'h-4 w-4')} />
              {!collapsed && <span className="truncate">Sair</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
