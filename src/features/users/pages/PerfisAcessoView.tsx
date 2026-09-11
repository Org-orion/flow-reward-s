import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, ShieldCheck, Loader2 } from 'lucide-react';
import { SectionCard } from '@/components/app/SectionCard';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { pluralizeBR } from '@/lib/formatters';
import { PERMISSION_RESOURCES, resourceDef, parseGrant } from '@/config/permissions';
import { PerfilAcessoEditor, type PerfilAcessoFormValue } from '../components/PerfilAcessoEditor';
import type { PerfilAcesso } from '../hooks/usePerfisAcesso';
import type { UserRow } from '../types/user.types';

interface Props {
  perfis: PerfilAcesso[];
  loading: boolean;
  rows: UserRow[];
  onCreate: (v: PerfilAcessoFormValue) => Promise<void>;
  onUpdate: (id: string, v: PerfilAcessoFormValue) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

/** Resumo textual das telas cobertas por um perfil. */
function resumoTelas(permissoes: string[]): string {
  const telas = new Set<string>();
  for (const g of permissoes) {
    const p = parseGrant(g);
    if (p.kind === 'invalida') continue;
    const def = resourceDef(p.resource);
    if (def) telas.add(def.label);
  }
  if (telas.size === 0) return 'Nenhuma tela';
  const lista = [...telas];
  return lista.length <= 2 ? lista.join(', ') : `${lista.slice(0, 2).join(', ')} +${lista.length - 2}`;
}

/** Gestão dos perfis de acesso reutilizáveis. */
export function PerfisAcessoView({ perfis, loading, rows, onCreate, onUpdate, onDelete }: Props) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PerfilAcesso | null>(null);
  const [excluindo, setExcluindo] = useState<PerfilAcesso | null>(null);
  const [removendo, setRemovendo] = useState(false);

  // Quantos usuários usam cada perfil (para avisar antes de excluir).
  const usoPorPerfil = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (r.perfilAcessoId) m.set(r.perfilAcessoId, (m.get(r.perfilAcessoId) ?? 0) + 1);
    }
    return m;
  }, [rows]);

  const abrirNovo = () => { setEditing(null); setEditorOpen(true); };
  const abrirEdicao = (p: PerfilAcesso) => { setEditing(p); setEditorOpen(true); };

  const submit = async (v: PerfilAcessoFormValue) => {
    if (editing) {
      await onUpdate(editing.id, v);
      toast.success('Perfil de acesso atualizado.');
    } else {
      await onCreate(v);
      toast.success('Perfil de acesso criado.');
    }
  };

  const confirmarExclusao = async () => {
    if (!excluindo || removendo) return;
    setRemovendo(true);
    try {
      await onDelete(excluindo.id);
      toast.success('Perfil de acesso excluído.');
      setExcluindo(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível excluir o perfil.');
    } finally {
      setRemovendo(false);
    }
  };

  const acoes = (
    <Button size="sm" className="gap-1.5" onClick={abrirNovo}>
      <Plus className="h-4 w-4" /> Novo perfil
    </Button>
  );

  return (
    <>
      <SectionCard
        title="Perfis de Acesso"
        description={`Conjuntos reutilizáveis de permissões por tela e por campo. ${PERMISSION_RESOURCES.length} telas com permissão detalhada disponível.`}
        actions={acoes}
        noBodyPadding
      >
        {loading && perfis.length === 0 ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : perfis.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Nenhum perfil de acesso cadastrado"
            description="Crie um perfil para reaproveitar o mesmo conjunto de permissões em vários usuários."
            action={acoes}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="min-w-[220px]">Perfil</TableHead>
                  <TableHead>Telas</TableHead>
                  <TableHead className="text-right">Permissões</TableHead>
                  <TableHead className="text-right">Usuários</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perfis.map(p => {
                  const uso = usoPorPerfil.get(p.id) ?? 0;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="text-sm font-medium text-foreground">{p.nome}</p>
                        {p.descricao && <p className="text-xs text-muted-foreground">{p.descricao}</p>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{resumoTelas(p.permissoes)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{p.permissoes.length}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{uso}</TableCell>
                      <TableCell>
                        <span className={p.ativo ? 'text-sm text-success' : 'text-sm text-muted-foreground'}>
                          {p.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrirEdicao(p)} aria-label={`Editar ${p.nome}`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setExcluindo(p)} aria-label={`Excluir ${p.nome}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <PerfilAcessoEditor open={editorOpen} editing={editing} onOpenChange={setEditorOpen} onSubmit={submit} />

      <AlertDialog open={!!excluindo} onOpenChange={(o) => { if (!o && !removendo) setExcluindo(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o perfil "{excluindo?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {(usoPorPerfil.get(excluindo?.id ?? '') ?? 0) > 0
                ? `${pluralizeBR(usoPorPerfil.get(excluindo!.id)!, 'usuário usa', 'usuários usam')} este perfil. Eles ficarão apenas com as próprias exceções — na prática, sem as permissões herdadas.`
                : 'Nenhum usuário usa este perfil. A exclusão não afeta acessos existentes.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removendo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void confirmarExclusao(); }}
              disabled={removendo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removendo ? 'Excluindo…' : 'Excluir perfil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
