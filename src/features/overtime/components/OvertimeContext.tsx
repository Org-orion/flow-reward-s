import { createContext, useContext, type ReactNode } from 'react';
import { useOvertimeConfig } from '../hooks/useOvertimeConfig';

type OvertimeConfigState = ReturnType<typeof useOvertimeConfig>;

const Ctx = createContext<OvertimeConfigState | null>(null);

/**
 * Configuração do módulo compartilhada pelas telas.
 *
 * Existe para que as faixas do semáforo e os rótulos de departamento sejam
 * carregados UMA vez por sessão de uso: sem isso, cada troca de aba refaria as
 * consultas e — pior — o painel poderia classificar com limites antigos
 * enquanto a tela nova ainda carrega os novos.
 */
export function OvertimeProvider({ children }: { children: ReactNode }) {
  const estado = useOvertimeConfig();
  return <Ctx.Provider value={estado}>{children}</Ctx.Provider>;
}

export function useOvertime(): OvertimeConfigState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useOvertime precisa estar dentro de OvertimeProvider.');
  return ctx;
}
