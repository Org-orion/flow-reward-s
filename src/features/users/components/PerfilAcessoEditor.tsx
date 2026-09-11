import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { PermissionTreeEditor } from './PermissionTreeEditor';
import type { PerfilAcesso } from '../hooks/usePerfisAcesso';

export interface PerfilAcessoFormValue {
  nome: string;
  descricao: string;
  permissoes: string[];
  ativo: boolean;
}

interface Props {
  open: boolean;
  /** null = criação. */
  editing: PerfilAcesso | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: PerfilAcessoFormValue) => Promise<void>;
}

const VAZIO: PerfilAcessoFormValue = { nome: '', descricao: '', permissoes: [], ativo: true };

/** Criação/edição de um perfil de acesso reutilizável. */
export function PerfilAcessoEditor({ open, editing, onOpenChange, onSubmit }: Props) {
  const [value, setValue] = useState<PerfilAcessoFormValue>(VAZIO);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErro(null);
    setValue(editing
      ? { nome: editing.nome, descricao: editing.descricao ?? '', permissoes: [...editing.permissoes], ativo: editing.ativo }
      : VAZIO);
  }, [open, editing]);

  const nomeInvalido = value.nome.trim().length < 3;

  const handle = async () => {
    if (saving || nomeInvalido) return;
    setSaving(true);
    setErro(null);
    try {
      await onSubmit({ ...value, nome: value.nome.trim(), descricao: value.descricao.trim() });
      onOpenChange(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o perfil de acesso.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Editar perfil — ${editing.nome}` : 'Novo perfil de acesso'}</DialogTitle>
          <DialogDescription>
            Um conjunto de permissões reutilizável. Alterar o perfil afeta todos os usuários que o utilizam
            (as exceções de cada usuário continuam valendo).
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[62vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="perfil-nome" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Nome</label>
              <Input
                id="perfil-nome"
                value={value.nome}
                onChange={(e) => setValue(v => ({ ...v, nome: e.target.value }))}
                placeholder="Ex.: Apontador de Produção"
                aria-invalid={value.nome.length > 0 && nomeInvalido}
              />
              {value.nome.length > 0 && nomeInvalido && (
                <p className="mt-1 text-xs text-destructive">Informe pelo menos 3 caracteres.</p>
              )}
            </div>
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Situação</p>
              <label className="flex h-10 items-center gap-2 text-sm">
                <Switch checked={value.ativo} onCheckedChange={(c) => setValue(v => ({ ...v, ativo: c }))} aria-label="Perfil ativo" />
                <span className="text-foreground">{value.ativo ? 'Ativo' : 'Inativo'}</span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="perfil-desc" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Descrição</label>
            <Textarea
              id="perfil-desc"
              rows={2}
              value={value.descricao}
              onChange={(e) => setValue(v => ({ ...v, descricao: e.target.value }))}
              placeholder="O que este perfil permite, em uma frase."
            />
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Permissões ({value.permissoes.length})
            </p>
            <PermissionTreeEditor value={value.permissoes} onChange={(p) => setValue(v => ({ ...v, permissoes: p }))} />
          </div>

          {erro && <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-2.5 text-sm text-destructive">{erro}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button className="gap-1.5" onClick={handle} disabled={saving || nomeInvalido}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar perfil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
