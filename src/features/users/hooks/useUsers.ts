import { useMemo } from 'react';
import { useUsuarios } from '@/hooks/useUsuarios';
import { useAuth, AUTH_MODE } from '@/contexts/AuthContext';
import { deriveUserAccess } from '../domain/userAccess';
import { deriveAuthState } from '../domain/userAuthState';
import { isLastActiveAdmin } from '../domain/userSecurityRules';
import type { UserRow } from '../types/user.types';

/**
 * Composição da Central de Usuários. Reusa o hook seguro `useUsuarios` (que já
 * chama as RPCs endurecidas com reautenticação para criar/redefinir senha e o
 * update RLS-guardado). Enriquce cada linha (acesso derivado + estado de auth +
 * flags de segurança). Nunca lê/expõe senha_hash. Não altera o motor nem o banco.
 */
export function useUsers() {
  const { usuarios, loading, createUsuario, updateUsuario, updateSenha, toggleAtivo, refetch } = useUsuarios();
  const { profile } = useAuth();
  const currentUserId = profile?.id ?? null;

  const secInputs = useMemo(() => usuarios.map(u => ({ id: u.id, perfil: u.perfil, ativo: u.ativo })), [usuarios]);

  const rows = useMemo<UserRow[]>(() => usuarios.map((u) => {
    const secoes = (Array.isArray(u.secoes) ? u.secoes : []) as string[];
    const perfilAcessoId = u.perfil_acesso_id ?? null;
    const exc = u.permissoes ?? null;
    const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
    return {
      id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, secoes, ativo: u.ativo,
      createdAt: u.created_at ?? null,
      access: deriveUserAccess(u.perfil, secoes),
      authState: deriveAuthState(u.auth_user_id ?? null, AUTH_MODE),
      isSelf: u.id === currentUserId,
      isLastActiveAdmin: isLastActiveAdmin({ id: u.id, perfil: u.perfil, ativo: u.ativo }, secInputs),
      perfilAcessoId,
      excecoes: { mais: strs(exc?.mais), menos: strs(exc?.menos) },
      granular: perfilAcessoId != null || exc != null,
    } satisfies UserRow;
  }), [usuarios, currentUserId, secInputs]);

  const rowById = useMemo(() => new Map(rows.map(r => [r.id, r])), [rows]);

  return {
    rows, rowById, secInputs, currentUserId, adminEmail: profile?.email ?? '',
    loading, createUsuario, updateUsuario, updateSenha, toggleAtivo, refetch,
  };
}

export type UseUsersReturn = ReturnType<typeof useUsers>;
