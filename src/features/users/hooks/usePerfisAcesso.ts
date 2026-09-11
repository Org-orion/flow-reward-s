import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Perfil de acesso reutilizável (tabela `concremrh_perfis_acesso`). */
export interface PerfilAcesso {
  id: string;
  nome: string;
  descricao: string | null;
  permissoes: string[];
  ativo: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

const toPerfil = (r: {
  id: string; nome: string; descricao: string | null; permissoes: unknown;
  ativo: boolean; created_at: string | null; updated_at: string | null;
}): PerfilAcesso => ({
  id: r.id,
  nome: r.nome,
  descricao: r.descricao,
  permissoes: Array.isArray(r.permissoes) ? (r.permissoes as string[]).filter(p => typeof p === 'string') : [],
  ativo: r.ativo,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/**
 * CRUD dos perfis de acesso. O conteúdo de `permissoes` é uma lista de
 * concessões (ver src/config/permissions.ts) — este hook não interpreta o
 * formato, só persiste.
 */
export function usePerfisAcesso() {
  const [perfis, setPerfis] = useState<PerfilAcesso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('concremrh_perfis_acesso')
      .select('id, nome, descricao, permissoes, ativo, created_at, updated_at')
      .order('nome');
    if (err) setError(err.message);
    else { setError(null); setPerfis((data ?? []).map(toPerfil)); }
    setLoading(false);
  }, []);

  useEffect(() => { void refetch(); }, [refetch]);

  const createPerfil = useCallback(async (payload: { nome: string; descricao?: string | null; permissoes: string[] }) => {
    const { error: err } = await supabase
      .from('concremrh_perfis_acesso')
      .insert({ nome: payload.nome, descricao: payload.descricao ?? null, permissoes: payload.permissoes } as never);
    if (err) throw new Error(err.code === '23505' ? 'Já existe um perfil de acesso com esse nome.' : err.message);
    await refetch();
  }, [refetch]);

  const updatePerfil = useCallback(async (id: string, payload: Partial<{ nome: string; descricao: string | null; permissoes: string[]; ativo: boolean }>) => {
    const { error: err } = await supabase
      .from('concremrh_perfis_acesso')
      .update({ ...payload, updated_at: new Date().toISOString() } as never)
      .eq('id', id);
    if (err) throw new Error(err.code === '23505' ? 'Já existe um perfil de acesso com esse nome.' : err.message);
    await refetch();
  }, [refetch]);

  /**
   * Remove o perfil. A FK em `concremrh_usuarios.perfil_acesso_id` é
   * ON DELETE SET NULL: quem usava o perfil fica só com as próprias exceções.
   */
  const deletePerfil = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('concremrh_perfis_acesso').delete().eq('id', id);
    if (err) throw new Error(err.message);
    await refetch();
  }, [refetch]);

  return { perfis, loading, error, refetch, createPerfil, updatePerfil, deletePerfil };
}
