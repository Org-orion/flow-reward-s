import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserPerfil, SectionKey } from '@/contexts/AuthContext';

export interface Usuario {
  id: string;
  email: string;
  nome: string | null;
  perfil: UserPerfil;
  secoes: SectionKey[];
  ativo: boolean;
  created_at: string;
  updated_at?: string | null;
  // Usado apenas para DERIVAR o estado de autenticação (Supabase/legado/migração).
  // NÃO é secreto e NUNCA é exibido cru na interface. senha_hash jamais é lido.
  auth_user_id?: string | null;
  // Permissões granulares (ver src/config/permissions.ts). Ambos nulos = usuário
  // LEGADO, governado apenas por `secoes`.
  perfil_acesso_id?: string | null;
  permissoes?: UserExcecoes | null;
}

/** Exceções de permissão do usuário sobre o perfil de acesso. */
export interface UserExcecoes {
  mais?: string[];
  menos?: string[];
}

/** Colunas que existem desde antes das permissões granulares. */
const COLUNAS_BASE = 'id, email, nome, perfil, secoes, ativo, created_at, updated_at, auth_user_id';

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchUsuarios() {
    setLoading(true);
    const { data, error } = await supabase
      .from('concremrh_usuarios')
      .select(`${COLUNAS_BASE}, perfil_acesso_id, permissoes`)
      .order('nome');

    if (error) {
      // A migração das permissões granulares pode não ter sido aplicada ainda
      // (20260910000000_permissoes_granulares.sql). Sem este fallback a lista de
      // usuários ficaria VAZIA até o banco ser atualizado.
      console.warn('Colunas de permissões granulares indisponíveis; lendo no formato anterior.', error.message);
      const legado = await supabase.from('concremrh_usuarios').select(COLUNAS_BASE).order('nome');
      setUsuarios((legado.data ?? []) as unknown as Usuario[]);
      setLoading(false);
      return;
    }

    setUsuarios((data ?? []) as unknown as Usuario[]);
    setLoading(false);
  }

  useEffect(() => { fetchUsuarios(); }, []);

  async function createUsuario(payload: {
    nome: string;
    email: string;
    senha: string;
    perfil: UserPerfil;
    secoes: SectionKey[];
    // Re-autenticação de admin (Fase 1 do endurecimento de segurança — SECURITY_HARDENING_PLAN_V2.md)
    adminEmail: string;
    adminSenha: string;
  }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('concremrh_create_user', {
      p_admin_email: payload.adminEmail,
      p_admin_password: payload.adminSenha,
      p_nome: payload.nome,
      p_email: payload.email,
      p_senha: payload.senha,
      p_perfil: payload.perfil,
      p_secoes: payload.secoes,
    });
    if (error) throw new Error(error.message);
    const result = data as { ok: boolean; error?: string };
    if (!result.ok) throw new Error(result.error ?? 'Erro ao criar usuário');
    await fetchUsuarios();
  }

  async function updateUsuario(id: string, payload: Partial<{
    nome: string;
    perfil: UserPerfil;
    secoes: SectionKey[];
    ativo: boolean;
    /** null volta o usuário ao modelo de seções (junto com permissoes: null). */
    perfil_acesso_id: string | null;
    permissoes: UserExcecoes | null;
  }>) {
    const { error } = await supabase
      .from('concremrh_usuarios')
      .update({ ...payload, updated_at: new Date().toISOString() } as never)
      .eq('id', id);
    if (error) throw new Error(error.message);
    await fetchUsuarios();
  }

  async function updateSenha(id: string, senha: string, adminEmail: string, adminSenha: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('concremrh_update_user_password', {
      p_admin_email: adminEmail,
      p_admin_password: adminSenha,
      p_id: id,
      p_senha: senha,
    });
    if (error) throw new Error(error.message);
    // Fase 1: a RPC agora retorna jsonb { ok, error? } (antes era void).
    const result = data as { ok: boolean; error?: string };
    if (!result?.ok) throw new Error(result?.error ?? 'Erro ao atualizar senha');
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    return updateUsuario(id, { ativo });
  }

  return { usuarios, loading, createUsuario, updateUsuario, updateSenha, toggleAtivo, refetch: fetchUsuarios };
}
