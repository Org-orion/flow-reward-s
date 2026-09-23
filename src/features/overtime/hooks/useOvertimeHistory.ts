import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  excluirImportacao, listarImportacoes, listarRelatorios,
  type ImportacaoRow, type RelatorioRow,
} from '../services/overtimeApi';

/** Histórico de importações e de relatórios gerados. */
export function useOvertimeHistory() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [importacoes, setImportacoes] = useState<ImportacaoRow[]>([]);
  const [relatorios, setRelatorios] = useState<RelatorioRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [i, r] = await Promise.all([listarImportacoes(), listarRelatorios()]);
      setImportacoes(i);
      setRelatorios(r);
    } catch (e) {
      toast({
        title: 'Não foi possível carregar o histórico',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setCarregando(false);
    }
  }, [toast]);

  useEffect(() => { void recarregar(); }, [recarregar]);

  /**
   * Excluir a importação apaga em cascata os lançamentos dela — o período fica
   * sem ponto até ser reimportado. Por isso é restrito a administrador e a tela
   * pede confirmação nominal do período.
   */
  const excluir = async (id: string) => {
    setExcluindo(id);
    try {
      await excluirImportacao(id);
      await recarregar();
      toast({ title: 'Importação excluída', description: 'Os lançamentos do período saíram da base. Reimporte o arquivo para repô-los.' });
    } catch (e) {
      toast({ title: 'Erro ao excluir', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setExcluindo(null);
    }
  };

  return {
    importacoes, relatorios, carregando, excluindo,
    podeExcluir: profile?.perfil === 'admin',
    recarregar, excluir,
  };
}
