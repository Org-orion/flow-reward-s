// Tipos da Central de Usuários e Acessos. Só contratos.
//
// Entidade `Usuario` (tabela `concremrh_usuarios`): id, auth_user_id?, email, nome,
// perfil (enum admin|rh|sesmt|producao), secoes (Json[]), ativo, created_at,
// updated_at, senha_hash (NUNCA selecionado/exibido). Perfil 'custom' aparece só
// como fallback de exibição (não persistível). Status = `ativo`.
import type { UserAccess } from '../domain/userAccess';
import type { AuthState } from '../domain/userAuthState';

export interface UserRow {
  id: string;
  nome: string | null;
  email: string;
  perfil: string;                // valor persistido (admin|rh|sesmt|producao|legado custom)
  secoes: string[];
  ativo: boolean;
  createdAt: string | null;
  access: UserAccess;
  authState: AuthState;
  isSelf: boolean;
  isLastActiveAdmin: boolean;
  /** Perfil de acesso aplicado (permissões granulares). null = nenhum. */
  perfilAcessoId: string | null;
  /** Exceções do usuário sobre o perfil de acesso. */
  excecoes: { mais: string[]; menos: string[] };
  /** Está sob o modelo granular? (tem perfil de acesso e/ou exceções.) */
  granular: boolean;
}

export interface UserFilters {
  search: string;
  perfil: string;                // 'todos' | perfil
  status: 'todos' | 'ativo' | 'inativo';
  acesso: 'todos' | 'total' | 'personalizado' | 'sem_acesso' | 'desconhecida';
}

export const DEFAULT_USER_FILTERS: UserFilters = {
  search: '', perfil: 'todos', status: 'todos', acesso: 'todos',
};

export type UsersView = 'usuarios' | 'acessos' | 'perfis';
