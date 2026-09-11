import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Save, SlidersHorizontal } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KNOWN_SECTIONS } from '../domain/userAccess';
import { UserAccessEditor } from './UserAccessEditor';
import { UserAccessComparison } from './UserAccessComparison';
import { PermissionTreeEditor } from './PermissionTreeEditor';
import { PermissionGrantComparison } from './PermissionGrantComparison';
import { usePerfisAcesso } from '../hooks/usePerfisAcesso';
import { sectionsFromGrants } from '@/config/permissions';
import { diffExcecoes } from '@/domain/permissions/grantToggle';
import { resolveGrants } from '@/domain/permissions/effectiveAccess';
import { sectionLabel } from '../domain/permissionDefinitions';
import type { UserRow } from '../types/user.types';
import type { SectionKey } from '@/contexts/AuthContext';

export interface AccessSavePayload {
  secoes: string[];
  perfilAcessoId: string | null;
  /** null = volta o usuário ao modelo de seções. */
  excecoes: { mais: string[]; menos: string[] } | null;
}

interface Props {
  row: UserRow | null;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, payload: AccessSavePayload) => Promise<void>;
}

const SEM_PERFIL = 'nenhum';

/**
 * Edição de acessos. Dois níveis, na mesma tela:
 *   • Seções — libera módulos inteiros (modelo legado, ainda vale para os
 *     módulos sem permissão detalhada).
 *   • Acesso detalhado — perfil de acesso reutilizável + exceções por usuário,
 *     com ações e campos por tela. Quando ligado, as seções JÁ detalhadas
 *     (Produção, no momento) passam a ser governadas pelas permissões.
 */
export function UserAccessDialog({ row, onOpenChange, onSave }: Props) {
  const { perfis, loading: perfisLoading } = usePerfisAcesso();

  const [secoes, setSecoes] = useState<string[]>([]);
  const [detalhado, setDetalhado] = useState(false);
  const [perfilAcessoId, setPerfilAcessoId] = useState<string | null>(null);
  const [efetivas, setEfetivas] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const isAdmin = row?.perfil === 'admin';

  // Concessões herdadas do perfil de acesso selecionado.
  const herdadas = useMemo(
    () => (perfilAcessoId ? perfis.find(p => p.id === perfilAcessoId)?.permissoes ?? [] : []),
    [perfilAcessoId, perfis],
  );

  // Estado inicial ao abrir. Reinicia apenas quando muda o usuário ou quando os
  // perfis acabam de carregar (para o efetivo nascer com o herdado resolvido) —
  // nunca a cada nova identidade da lista, o que apagaria a edição em curso.
  const initKey = row ? `${row.id}:${perfisLoading ? 'carregando' : 'pronto'}` : null;
  const initRef = useRef<string | null>(null);
  useEffect(() => {
    if (!row || !initKey) { initRef.current = null; return; }
    if (initRef.current === initKey) return;
    initRef.current = initKey;
    setSecoes([...row.secoes]);
    setDetalhado(row.granular);
    setPerfilAcessoId(row.perfilAcessoId);
    const base = row.perfilAcessoId ? perfis.find(p => p.id === row.perfilAcessoId)?.permissoes ?? [] : [];
    setEfetivas([...resolveGrants({ perfilPermissoes: base, mais: row.excecoes.mais, menos: row.excecoes.menos })].sort());
  }, [row, initKey, perfis]);

  if (!row) return null;

  // Preserva seções desconhecidas ao salvar.
  const desconhecidas = row.access.desconhecidas;

  // Seções exigidas pelo BANCO para o que foi concedido na árvore funcionar.
  // As policies de RLS decidem por seção (`has_secao`), não por tela — sem isto
  // o botão aparece na interface e o servidor recusa a gravação.
  const secoesImplicitas = detalhado ? sectionsFromGrants(efetivas) : [];

  // Com o acesso detalhado LIGADO, `secoes` é preservada como está no banco e
  // apenas SOMADA às implícitas — nunca reduzida. Motivo: as seções deixam de
  // governar a navegação, mas continuam sendo a autorização do servidor e a
  // rede de segurança se o detalhado for desligado. Reescrevê-las podia zerá-las
  // e deixar a pessoa sem acesso nenhum.
  const finalSecoes = isAdmin
    ? [...KNOWN_SECTIONS]
    : detalhado
      ? Array.from(new Set([...row.secoes, ...secoesImplicitas]))
      : Array.from(new Set([...(secoes as SectionKey[]), ...desconhecidas]));

  const excecoes = detalhado ? diffExcecoes(herdadas, efetivas) : null;

  const trocarPerfil = (v: string) => {
    const id = v === SEM_PERFIL ? null : v;
    const novaBase = id ? perfis.find(p => p.id === id)?.permissoes ?? [] : [];
    // Reaplica as exceções atuais sobre a nova base (não descarta o ajuste manual).
    const exc = diffExcecoes(herdadas, efetivas);
    setPerfilAcessoId(id);
    setEfetivas([...resolveGrants({ perfilPermissoes: novaBase, mais: exc.mais, menos: exc.menos })].sort());
  };

  const handle = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(row.id, {
        secoes: finalSecoes,
        perfilAcessoId: detalhado ? perfilAcessoId : null,
        excecoes,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!row} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar acessos — {row.nome ?? row.email}</DialogTitle>
          <DialogDescription>Seções do sistema e, se necessário, permissões por tela e por campo.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[62vh] space-y-4 overflow-y-auto pr-1">
          <UserAccessEditor
            perfil={row.perfil} secoes={detalhado ? finalSecoes : secoes} onChange={setSecoes}
            desconhecidas={desconhecidas} readOnly={detalhado}
          />

          {!isAdmin && !detalhado && (
            <div className="rounded-lg border border-border/70 p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Alterações de seções</p>
              <UserAccessComparison atual={row.access.conhecidas} novo={secoes.filter(s => KNOWN_SECTIONS.includes(s as SectionKey))} />
            </div>
          )}

          {!isAdmin && (
            <div className="rounded-xl border border-border/70">
              <label className="flex items-start gap-3 border-b border-border/70 p-3">
                <Switch checked={detalhado} onCheckedChange={setDetalhado} aria-label="Ativar acesso detalhado" />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <SlidersHorizontal className="h-3.5 w-3.5" /> Acesso detalhado (por tela e por campo)
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Permite liberar uma tela e a alteração de apenas certos dados. Desligado, o
                    usuário volta a ser governado somente pelas seções acima.
                  </span>
                </span>
              </label>

              {detalhado && (
                <div className="space-y-3 p-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[240px] flex-1">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Perfil de acesso</p>
                      <Select value={perfilAcessoId ?? SEM_PERFIL} onValueChange={trocarPerfil} disabled={perfisLoading}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SEM_PERFIL}>Nenhum — permissões só deste usuário</SelectItem>
                          {perfis.filter(p => p.ativo).map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {perfilAcessoId
                        ? `${herdadas.length} permissões herdadas do perfil. Ajuste abaixo para criar exceções.`
                        : 'Sem perfil: tudo que você marcar abaixo vale só para este usuário.'}
                    </p>
                  </div>

                  <p className="rounded-lg border border-status-warning/40 bg-status-warning/5 p-2.5 text-xs text-foreground">
                    Com o acesso detalhado ligado, o acesso deste usuário passa a vir <strong>somente das permissões
                    abaixo</strong> — os checkboxes de seção ficam bloqueados e não liberam mais módulos inteiros.
                    Eles são <strong>preservados</strong> e apenas somados, nunca reduzidos: desligar a chave
                    não tira acesso que já existia.
                    {secoesImplicitas.length > 0 && (
                      <> As seções {secoesImplicitas.map(sectionLabel).join(', ')} ficam marcadas automaticamente
                      porque o servidor autoriza por seção — sem elas, as telas concedidas abririam mas não
                      gravariam.</>
                    )}
                  </p>

                  <PermissionTreeEditor value={efetivas} onChange={setEfetivas} inherited={herdadas} />

                  <div className="rounded-lg border border-border/70 p-3">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Exceções deste usuário</p>
                    <PermissionGrantComparison mais={excecoes?.mais ?? []} menos={excecoes?.menos ?? []} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button className="gap-1.5" onClick={handle} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar acessos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
