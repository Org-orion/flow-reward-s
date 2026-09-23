import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { saveCustomSession, loadCustomSession, clearCustomSession, purgeLegacyAuthStorage } from './authStorage';
import type { FieldAction, PermissionAction } from '@/config/permissions';
import {
  buildAccessState, accessCanSection, accessCan, accessCanField, accessCanEditAnyField,
} from '@/domain/permissions/effectiveAccess';

export type UserPerfil = 'admin' | 'rh' | 'sesmt' | 'producao' | 'custom';

export type SectionKey = 'dashboard' | 'rh' | 'sesmt' | 'producao' | 'premiacoes' | 'cadastros' | 'cargos_salarios' | 'estoque' | 'horas_extras';

export const ALL_SECTIONS: SectionKey[] = [
  'dashboard', 'rh', 'sesmt', 'producao', 'premiacoes', 'cadastros', 'cargos_salarios', 'estoque', 'horas_extras',
];

// Quais seções dão acesso a cada módulo do Hub
export const HUB_MODULE_SECTIONS: Record<string, SectionKey[]> = {
  premiacoes:       ['rh', 'sesmt', 'producao', 'premiacoes'],
  cargos_salarios:  ['cargos_salarios'],
  controle_estoque: ['estoque'],
  indicadores_rh:   ['dashboard', 'rh'],
  horas_extras:     ['horas_extras'],
};

export interface UserProfile {
  id: string;
  email: string;
  nome: string | null;
  perfil: UserPerfil;
  secoes: SectionKey[];
  /**
   * Permissões granulares EFETIVAS (perfil de acesso ∪ exceções \ negadas),
   * já resolvidas no servidor. `null`/ausente = usuário LEGADO, governado só
   * por `secoes` (comportamento anterior, sem regressão).
   * Ver src/config/permissions.ts e src/domain/permissions/effectiveAccess.ts.
   */
  permissoes?: string[] | null;
  /** Nome do perfil de acesso aplicado — informativo (exibição/auditoria). */
  perfilAcesso?: string | null;
}

export const DEFAULT_ROUTE: Record<UserPerfil, string> = {
  admin:    '/',
  rh:       '/',
  sesmt:    '/premiacoes/dss',
  producao: '/premiacoes/producao-setor',
  custom:   '/premiacoes/dss',
};

// Feature flag da migração de autenticação (Fase 2 — SECURITY_AUTH_MIGRATION_PLAN_V2.md).
// Em AMBOS os modos o login passa pela Edge Function `turnstile-login` (gate forte
// do Cloudflare Turnstile validado no servidor com a secret key).
// A SESSÃO é por aba (sessionStorage — ver ./authStorage): custom = perfil; supabase = tokens.
// 'custom' (padrão) = a função valida credenciais (service role) e devolve o perfil.
// 'supabase' = a função valida só o captcha; a auth segue por signInWithPassword + bridge + get_my_profile.
// Ausente/qualquer outro valor => 'custom' (não quebra o app enquanto a infra da Fase 2 não é aplicada).
export type AuthMode = 'custom' | 'supabase';
export const AUTH_MODE: AuthMode =
  import.meta.env.VITE_AUTH_MODE === 'supabase' ? 'supabase' : 'custom';

// Formato de resposta da RPC get_my_profile() (proposta na Fase 2).
interface GetMyProfileResponse {
  ok: boolean;
  id?: string;
  email?: string;
  nome?: string | null;
  perfil?: string;
  secoes?: string[];
  permissoes?: string[] | null;
  perfil_acesso?: string | null;
}

// Formato de resposta da Edge Function auth-bridge (proposta na Fase 2).
interface AuthBridgeResponse {
  ok: boolean;
  error?: string;
}

// Monta o UserProfile a partir da sessão do Supabase Auth (via get_my_profile()).
// Usado apenas no modo 'supabase'.
async function fetchSupabaseProfile(): Promise<UserProfile | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_my_profile');
  if (error) {
    console.error('get_my_profile error:', error);
    return null;
  }
  const r = data as GetMyProfileResponse;
  if (!r?.ok) return null;
  return {
    id:     r.id!,
    email:  r.email!,
    nome:   r.nome ?? null,
    perfil: (r.perfil ?? 'custom') as UserPerfil,
    secoes: (r.secoes ?? []) as SectionKey[],
    permissoes: r.permissoes ?? null,
    perfilAcesso: r.perfil_acesso ?? null,
  };
}

interface AuthContextType {
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string, captchaToken: string) => Promise<{ error: string | null; profile?: UserProfile | null }>;
  signOut: () => void;
  canAccess: (section: SectionKey) => boolean;
  canAccessHub: (appCode: string) => boolean;
  /** Ação em um recurso (tela) — ex.: can('producao_setor', 'editar'). */
  can: (resource: string, action: PermissionAction) => boolean;
  /** Ação em um CAMPO controlado — ex.: canField('producao_setor', 'meta', 'editar'). */
  canField: (resource: string, field: string, action: FieldAction) => boolean;
  /** Há pelo menos um campo editável no recurso? (habilita salvar/rascunho.) */
  canEditAnyField: (resource: string) => boolean;
  /** O usuário está sob o modelo granular (tem perfil de acesso/exceções)? */
  isGranular: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Migração para sessão por aba: remove sessões de auth LEGADAS do localStorage
    // (idempotente e limitada — não toca em preferências). Após esta versão, quem
    // tinha sessão antiga precisa logar de novo — comportamento esperado.
    purgeLegacyAuthStorage();

    if (AUTH_MODE === 'supabase') {
      // Modo Supabase Auth: restaura a sessão gerenciada (sessionStorage) e escuta mudanças.
      let mounted = true;

      // Rede de segurança: o loading NUNCA pode ficar preso (hang de rede/deadlock).
      const safety = setTimeout(() => {
        if (mounted) setLoading(false);
      }, 8000);

      // Carrega o perfil e SEMPRE encerra o loading (sucesso, vazio ou erro).
      const carregarPerfil = async () => {
        try {
          const prof = await fetchSupabaseProfile();
          if (!mounted) return;
          if (prof) {
            setProfile(prof);
          } else {
            // Sessão presente mas perfil não resolveu (token expirado/inválido):
            // limpa a sessão e cai no login, sem travar.
            setProfile(null);
            try { await supabase.auth.signOut(); } catch { /* ignore */ }
          }
        } catch (err) {
          console.error('Erro ao carregar perfil (supabase):', err);
          if (mounted) setProfile(null);
        } finally {
          if (mounted) setLoading(false);
        }
      };

      // IMPORTANTE (supabase-js): NÃO chamar funções async do supabase de dentro
      // do callback do onAuthStateChange — ele roda segurando um lock interno e
      // isso causa DEADLOCK (a promise nunca resolve → spinner infinito no F5).
      // Solução: deferir a chamada para fora do callback com setTimeout(0).
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) {
          setProfile(null);
          if (mounted) setLoading(false);
          return;
        }
        setTimeout(() => {
          if (mounted) void carregarPerfil();
        }, 0);
      });

      // Fallback do estado inicial (getSession roda fora de lock, sem deadlock):
      // resolve o caso "sem sessão" rápido; com sessão, o INITIAL_SESSION acima
      // já dispara carregarPerfil.
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (!mounted) return;
          if (!data.session) setLoading(false);
        })
        .catch((err) => {
          console.error('Erro no getSession inicial (supabase):', err);
          if (mounted) setLoading(false);
        });

      return () => {
        mounted = false;
        clearTimeout(safety);
        sub.subscription.unsubscribe();
      };
    }

    // Modo custom — restaura o perfil SOMENTE da sessão desta aba (sessionStorage).
    try {
      const stored = loadCustomSession();
      if (stored) setProfile(JSON.parse(stored));
    } catch {
      clearCustomSession();
    }
    setLoading(false);
  }, []);

  // --- Modo custom (padrão): gate FORTE via Edge Function turnstile-login. ---
  // O cliente NÃO chama mais concremrh_verify_login direto: a função valida o
  // token do Turnstile (secret no servidor) e, se ok, as credenciais (service
  // role), devolvendo o perfil. Sessão por aba (sessionStorage).
  const signInCustom = async (email: string, password: string, captchaToken: string) => {
    const { data, error } = await supabase.functions.invoke('turnstile-login', {
      body: { email, password, token: captchaToken },
    });

    if (error) {
      console.error('turnstile-login invoke error:', error);
      return { error: 'Não foi possível validar o acesso. Tente novamente.' };
    }

    const result = data as {
      ok: boolean; error?: string;
      profile?: {
        id: string; email: string; nome?: string | null; perfil?: string; secoes?: string[];
        permissoes?: string[] | null; perfil_acesso?: string | null;
      };
    };
    if (!result?.ok || !result.profile) return { error: result?.error ?? 'Email ou senha inválidos.' };

    const prof: UserProfile = {
      id:     result.profile.id,
      email:  result.profile.email,
      nome:   result.profile.nome ?? null,
      perfil: result.profile.perfil as UserPerfil,
      secoes: (result.profile.secoes ?? []) as SectionKey[],
      permissoes: result.profile.permissoes ?? null,
      perfilAcesso: result.profile.perfil_acesso ?? null,
    };

    setProfile(prof);
    saveCustomSession(JSON.stringify(prof));
    return { error: null, profile: prof };
  };

  // --- Modo supabase: gate do Turnstile (server-side) + signInWithPassword + bridge + get_my_profile. ---
  const signInSupabase = async (email: string, password: string, captchaToken: string) => {
    // Gate FORTE: valida o Turnstile no servidor antes de autenticar.
    const { data: gate, error: gateErr } = await supabase.functions.invoke('turnstile-login', {
      body: { token: captchaToken },
    });
    if (gateErr || !(gate as { ok?: boolean } | null)?.ok) {
      return { error: 'Falha na verificação de segurança. Tente novamente.' };
    }

    let { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Usuário talvez ainda não migrado: tenta o bridge (define a senha no Auth) e repete.
      const { data: bridge, error: bridgeErr } = await supabase.functions.invoke('auth-bridge', {
        body: { email, password },
      });
      const b = bridge as AuthBridgeResponse | null;
      if (bridgeErr || !b?.ok) {
        return { error: 'Email ou senha inválidos.' };
      }
      const retry = await supabase.auth.signInWithPassword({ email, password });
      if (retry.error) return { error: 'Email ou senha inválidos.' };
      error = null;
    }

    const prof = await fetchSupabaseProfile();
    if (!prof) return { error: 'Não foi possível carregar o perfil do usuário.' };

    setProfile(prof);
    return { error: null, profile: prof };
  };

  const signIn = (email: string, password: string, captchaToken: string) =>
    AUTH_MODE === 'supabase' ? signInSupabase(email, password, captchaToken) : signInCustom(email, password, captchaToken);

  const signOut = () => {
    if (AUTH_MODE === 'supabase') {
      // scope 'local': encerra SOMENTE a sessão desta aba (limpa o sessionStorage),
      // sem revogar o refresh token das outras sessões/abas/dispositivos do usuário.
      // onAuthStateChange também zera o profile.
      void supabase.auth.signOut({ scope: 'local' });
      setProfile(null);
      setLoading(false);
      return;
    }
    setProfile(null);
    clearCustomSession();
    setLoading(false);
  };

  // Estado de acesso resolvido UMA vez por perfil (evita reconstruir o Set em
  // cada chamada de canAccess/can dentro de listas e tabelas grandes).
  const access = useMemo(
    () => (profile
      ? buildAccessState(profile.perfil, profile.secoes, profile.permissoes != null ? { mais: profile.permissoes } : null)
      : null),
    [profile],
  );

  const canAccess = (section: SectionKey): boolean =>
    !!access && accessCanSection(access, section);

  const canAccessHub = (appCode: string): boolean => {
    if (!access) return false;
    if (access.perfil === 'admin') return true;
    const required = HUB_MODULE_SECTIONS[appCode];
    if (!required) return false;
    return required.some(s => accessCanSection(access, s));
  };

  const can = (resource: string, action: PermissionAction): boolean =>
    !!access && accessCan(access, resource, action);

  const canField = (resource: string, field: string, action: FieldAction): boolean =>
    !!access && accessCanField(access, resource, field, action);

  const canEditAnyField = (resource: string): boolean =>
    !!access && accessCanEditAnyField(access, resource);

  return (
    <AuthContext.Provider value={{
      profile, loading, signIn, signOut,
      canAccess, canAccessHub, can, canField, canEditAnyField,
      isGranular: !!access?.grants,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
