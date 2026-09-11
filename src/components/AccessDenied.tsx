import { Link } from 'react-router-dom';
import { ShieldAlert, LayoutDashboard, Home } from 'lucide-react';
import { useAuth, DEFAULT_ROUTE } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

/**
 * Estado consistente de acesso negado por SEÇÃO/permissão (não confundir com 404
 * nem tela em branco). Não expõe nomes técnicos de permissões. A autorização de
 * verdade é do servidor (RLS/RPC) — esta tela é só a experiência.
 *
 * `area` = nome AMIGÁVEL da tela/módulo negado (ex.: 'Produção por Setor').
 * Sem ele a mensagem fica genérica — nunca cite um módulo fixo aqui, porque
 * este componente é usado por rotas e telas de TODOS os módulos.
 */
export function AccessDenied({ area }: { area?: string }) {
  const { profile } = useAuth();
  const dashboard = profile ? DEFAULT_ROUTE[profile.perfil] : '/';

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-xl font-bold text-foreground">Acesso não autorizado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {area
            ? <>Seu usuário não possui permissão para acessar <strong className="text-foreground">{area}</strong>.</>
            : 'Seu usuário não possui permissão para acessar esta tela.'}
          {' '}Solicite acesso ao administrador em Usuários e Acessos.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild variant="outline" className="gap-2"><Link to="/"><Home className="h-4 w-4" /> Voltar ao Hub</Link></Button>
          <Button asChild className="gap-2"><Link to={dashboard}><LayoutDashboard className="h-4 w-4" /> Ir para o Dashboard</Link></Button>
        </div>
      </div>
    </div>
  );
}
