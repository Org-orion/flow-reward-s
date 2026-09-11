import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserProfileBadge } from './UserProfileBadge';
import { UserStatus } from './UserStatus';
import { UserAuthStatus } from './UserAuthStatus';
import { UserAccessSummary } from './UserAccessSummary';
import { UserActionsMenu } from './UserActionsMenu';
import type { UserRow } from '../types/user.types';
import type { UserSecInput } from '../domain/userSecurityRules';

export interface UserRowHandlers {
  onOpen: (r: UserRow) => void;
  onEdit: (r: UserRow) => void;
  onEditAccess: (r: UserRow) => void;
  onResetPassword: (r: UserRow) => void;
  onActivate: (r: UserRow) => void;
  onDeactivate: (r: UserRow) => void;
}

function UserCell({ row }: { row: UserRow }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="truncate text-sm font-medium text-foreground">{row.nome ?? '(sem nome)'}</span>
        {row.isSelf && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Você</span>}
      </div>
      <p className="truncate text-xs text-muted-foreground">{row.email}</p>
    </div>
  );
}

export function UsersTable({ rows, secInputs, currentUserId, handlers }: { rows: UserRow[]; secInputs: UserSecInput[]; currentUserId: string | null; handlers: UserRowHandlers }) {
  const menu = (r: UserRow) => (
    <UserActionsMenu
      row={r} secInputs={secInputs} currentUserId={currentUserId}
      onDetails={() => handlers.onOpen(r)} onEdit={() => handlers.onEdit(r)} onEditAccess={() => handlers.onEditAccess(r)}
      onResetPassword={() => handlers.onResetPassword(r)} onActivate={() => handlers.onActivate(r)} onDeactivate={() => handlers.onDeactivate(r)}
    />
  );

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-border/70 md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Usuário</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Acesso</TableHead>
              <TableHead>Autenticação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Nenhum usuário encontrado para os filtros selecionados.</TableCell></TableRow>
            ) : rows.map(r => (
              <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => handlers.onOpen(r)}>
                <TableCell><UserCell row={r} /></TableCell>
                <TableCell><UserProfileBadge perfil={r.perfil} /></TableCell>
                <TableCell><UserAccessSummary access={r.access} granular={r.granular} /></TableCell>
                <TableCell><UserAuthStatus state={r.authState} /></TableCell>
                <TableCell><UserStatus ativo={r.ativo} /></TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>{menu(r)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile — cards */}
      <div className="space-y-2.5 md:hidden">
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
        ) : rows.map(r => (
          <div key={r.id} className="rounded-xl border border-border/70 bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <button type="button" onClick={() => handlers.onOpen(r)} className="min-w-0 text-left"><UserCell row={r} /></button>
              <div onClick={(e) => e.stopPropagation()}>{menu(r)}</div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <UserProfileBadge perfil={r.perfil} />
              <UserStatus ativo={r.ativo} />
              <UserAuthStatus state={r.authState} />
            </div>
            <div className="mt-1.5"><UserAccessSummary access={r.access} granular={r.granular} /></div>
          </div>
        ))}
      </div>
    </>
  );
}
