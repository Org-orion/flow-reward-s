// Período por MÊS/ANO do histórico de movimentações — PURO.
//
// Por que existe separado do `periodoRange` do dashboard: aquele resolve janelas
// relativas a "agora" (hoje, 7 dias, este mês...). Aqui a janela é ABSOLUTA — um
// mês escolhido pelo usuário, que pode ser muito anterior às 500 movimentações
// mais recentes carregadas por padrão. Por isso a faixa daqui também vai para a
// consulta no servidor, e não só para o filtro em memória.

/** Primeiro e último ano ofertados no seletor. */
export const MES_ANO_MIN = 2025;
export const MES_ANO_MAX = 2030;

/** Competência no formato 'YYYY-MM'. */
export type MesRef = string;

const RE_MES = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** A competência é válida e está dentro da faixa ofertada? */
export function isMesRefValido(mesRef: string): boolean {
  const m = RE_MES.exec(mesRef ?? '');
  if (!m) return false;
  const ano = Number(m[1]);
  return ano >= MES_ANO_MIN && ano <= MES_ANO_MAX;
}

export interface MesRange {
  /** Primeiro instante do mês (inclusivo). */
  inicio: Date;
  /** Primeiro instante do mês seguinte (EXCLUSIVO). */
  fim: Date;
}

/**
 * Faixa [início, fim) do mês. Devolve null para competência inválida — quem
 * chama trata como "sem filtro de mês" em vez de inventar um intervalo.
 *
 * O fim é exclusivo de propósito: evita perder movimentações do último instante
 * do mês, que um `<=` no último dia às 23:59:59 deixaria de fora.
 */
export function mesRefRange(mesRef: string): MesRange | null {
  if (!isMesRefValido(mesRef)) return null;
  const [ano, mes] = mesRef.split('-').map(Number);
  return {
    inicio: new Date(ano, mes - 1, 1),
    fim: new Date(ano, mes, 1),
  };
}

/** Anos ofertados, do mais recente para o mais antigo. */
export function anosDisponiveis(): number[] {
  const out: number[] = [];
  for (let a = MES_ANO_MAX; a >= MES_ANO_MIN; a--) out.push(a);
  return out;
}

/** Competência do mês corrente, limitada à faixa ofertada. */
export function mesRefAtual(agora = new Date()): MesRef {
  const ano = Math.min(MES_ANO_MAX, Math.max(MES_ANO_MIN, agora.getFullYear()));
  return `${ano}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
}
