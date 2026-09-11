import { Users, Grid3x3, ShieldCheck, type LucideIcon } from 'lucide-react';
import type { UsersView } from './types/user.types';

export interface UsersViewDef { key: UsersView; label: string; icon: LucideIcon }

export const USERS_VIEWS: UsersViewDef[] = [
  { key: 'usuarios', label: 'Usuários', icon: Users },
  { key: 'acessos', label: 'Matriz de Acessos', icon: Grid3x3 },
  { key: 'perfis', label: 'Perfis de Acesso', icon: ShieldCheck },
];

export const DEFAULT_USERS_VIEW: UsersView = 'usuarios';

export function normalizeUsersView(v: string | null): UsersView {
  return USERS_VIEWS.some(x => x.key === v) ? (v as UsersView) : DEFAULT_USERS_VIEW;
}
