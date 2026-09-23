import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { limitesDaConfig, getConfig, salvarConfig, listarDepartamentos, renomearDepartamento, type ConfigRow, type DepartamentoRow } from '../services/overtimeApi';
import { LIMITES_PADRAO, limitesValidos, type LimitesFaixa } from '../domain/faixas';

/**
 * Configuração do módulo (faixas do semáforo, jornadas, rótulos, destinatários).
 *
 * Enquanto a configuração não carrega, `limites` fica nos padrões da política
 * (2h/2h30). Nunca fica indefinido: uma tela que classificasse com limites
 * vazios marcaria tudo como vermelho por um instante.
 */
export function useOvertimeConfig() {
  const { toast } = useToast();
  const [config, setConfig] = useState<ConfigRow | null>(null);
  const [departamentos, setDepartamentos] = useState<DepartamentoRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [c, d] = await Promise.all([getConfig(), listarDepartamentos()]);
      setConfig(c);
      setDepartamentos(d);
    } catch (e) {
      toast({
        title: 'Não foi possível carregar as configurações',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setCarregando(false);
    }
  }, [toast]);

  useEffect(() => { void recarregar(); }, [recarregar]);

  // Também memorizado: `limites` entra nas dependências dos cálculos de
  // alerta e de faixa. Um objeto novo por render refaria tudo à toa.
  const limites: LimitesFaixa = useMemo(
    () => (config ? limitesDaConfig(config) : LIMITES_PADRAO),
    [config],
  );

  const salvarLimites = async (novos: LimitesFaixa) => {
    if (!config) return;
    if (!limitesValidos(novos)) {
      toast({
        title: 'Limites inválidos',
        description: 'O limite da faixa amarela precisa ser maior que o da verde, e ambos maiores que zero.',
        variant: 'destructive',
      });
      return;
    }
    setSalvando(true);
    try {
      await salvarConfig(config.id, {
        faixa_verde_max_min: novos.verdeMaxMin,
        faixa_amarela_max_min: novos.amareloMaxMin,
      });
      await recarregar();
      toast({
        title: 'Faixas atualizadas',
        description: 'A classificação vale a partir de agora; os lançamentos já gravados mantêm a faixa da importação até serem reimportados.',
      });
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  const salvarCampos = async (patch: Partial<ConfigRow>, mensagem: string) => {
    if (!config) return;
    setSalvando(true);
    try {
      await salvarConfig(config.id, patch);
      await recarregar();
      toast({ title: mensagem });
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  const renomear = async (id: string, nome: string) => {
    try {
      await renomearDepartamento(id, nome.trim());
      await recarregar();
      toast({ title: 'Rótulo atualizado' });
    } catch (e) {
      toast({ title: 'Erro ao renomear', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    }
  };

  /**
   * Rótulos cadastrados, para o domínio resolver o nome de exibição.
   *
   * Memorizado de propósito: `useOvertimeData` usa este Map na dependência da
   * consulta ao período. Um Map novo a cada render faria a consulta refazer-se
   * sem parar, em laço.
   */
  const rotulos = useMemo(
    () => new Map(departamentos.map((d) => [d.codigo_origem, d.nome_exibicao])),
    [departamentos],
  );

  return {
    config, departamentos, rotulos, limites,
    carregando, salvando,
    recarregar, salvarLimites, salvarCampos, renomear,
  };
}
