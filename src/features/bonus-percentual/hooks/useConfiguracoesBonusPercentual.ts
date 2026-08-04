import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  BonusPercentualPayload,
  ConfiguracaoBonusPercentualDB,
} from '../types/bonus-percentual.types';

const TABELA = 'concremrh_configuracoes_bonus_percentual';

// A tabela é nova e ainda não existe nos tipos gerados do Supabase. Em vez de
// espalhar `any` pelas chamadas, descrevemos aqui só o trecho do query builder que
// este hook usa — os retornos ficam tipados de ponta a ponta.
interface PostgrestErro { code?: string; message?: string }
type Resposta<T> = PromiseLike<{ data: T | null; error: PostgrestErro | null }>;

interface TabelaSemTipos {
  select(columns: string): {
    eq(coluna: string, valor: unknown): {
      order(coluna: string, opcoes: { ascending: boolean }): Resposta<ConfiguracaoBonusPercentualDB[]>;
    };
  };
  insert(linhas: BonusPercentualPayload[]): {
    select(): { single(): Resposta<ConfiguracaoBonusPercentualDB> };
  };
  update(valores: Partial<BonusPercentualPayload>): {
    eq(coluna: string, valor: unknown): Resposta<null>;
  };
}

const tabela = (): TabelaSemTipos =>
  (supabase as unknown as { from(nome: string): TabelaSemTipos }).from(TABELA);

const codigoErro = (error: unknown): string | undefined =>
  typeof error === 'object' && error !== null && 'code' in error
    ? String((error as PostgrestErro).code)
    : undefined;

/**
 * Acesso a `concremrh_configuracoes_bonus_percentual`. Mesmo contrato do hook de
 * Configurações de Kits: lista apenas ativas, exclusão SOFT (`ativo = false`) e
 * tradução do erro 23505 (vigência duplicada) em mensagem de negócio.
 */
export const useConfiguracoesBonusPercentual = () => {
  const [configuracoes, setConfiguracoes] = useState<ConfiguracaoBonusPercentualDB[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchConfiguracoes = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await tabela()
        .select('*')
        .eq('ativo', true)
        .order('vigencia_inicio', { ascending: false });

      if (error) throw error;
      setConfiguracoes(data ?? []);
    } catch (error) {
      console.error('Erro ao carregar configurações de bônus percentual:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações de bônus percentual',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createConfiguracao = async (config: BonusPercentualPayload) => {
    try {
      const { data, error } = await tabela().insert([config]).select().single();
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Configuração criada com sucesso' });
      fetchConfiguracoes();
      return data;
    } catch (error) {
      console.error('Erro ao criar configuração de bônus percentual:', error);
      toast({
        title: 'Erro',
        description: codigoErro(error) === '23505'
          ? 'Já existe uma configuração para esse mês de vigência'
          : 'Não foi possível criar a configuração',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateConfiguracao = async (id: string, config: Partial<BonusPercentualPayload>) => {
    try {
      const { error } = await tabela().update(config).eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Configuração atualizada com sucesso' });
      fetchConfiguracoes();
    } catch (error) {
      console.error('Erro ao atualizar configuração de bônus percentual:', error);
      toast({
        title: 'Erro',
        description: codigoErro(error) === '23505'
          ? 'Já existe uma configuração para esse mês de vigência'
          : 'Não foi possível atualizar a configuração',
        variant: 'destructive',
      });
    }
  };

  /** Exclusão SOFT — preserva o histórico da regra. */
  const deleteConfiguracao = async (id: string) => {
    try {
      const { error } = await tabela().update({ ativo: false }).eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Configuração removida com sucesso' });
      fetchConfiguracoes();
    } catch (error) {
      console.error('Erro ao remover configuração de bônus percentual:', error);
      toast({ title: 'Erro', description: 'Não foi possível remover a configuração', variant: 'destructive' });
    }
  };

  /**
   * Configuração vigente na competência ('YYYY-MM'): maior vigência ≤ competência.
   * É o que o processamento de premiações consulta para decidir se a competência é
   * remunerada pelo modelo percentual ou pelo modelo de faixas.
   */
  const getConfigParaCompetencia = useCallback(
    (competencia: string): ConfiguracaoBonusPercentualDB | null => {
      const alvo = (competencia ?? '').slice(0, 7);
      const vigentes = configuracoes
        .filter(c => (c.vigencia_inicio ?? '').slice(0, 7) <= alvo)
        .sort((a, b) => b.vigencia_inicio.localeCompare(a.vigencia_inicio));
      return vigentes[0] ?? null;
    },
    [configuracoes],
  );

  useEffect(() => { fetchConfiguracoes(); }, [fetchConfiguracoes]);

  return {
    configuracoes, loading, getConfigParaCompetencia,
    createConfiguracao, updateConfiguracao, deleteConfiguracao, refetch: fetchConfiguracoes,
  };
};
