// Semáforo das horas extras — PURO.
//
// A faixa é derivada SOMENTE do valor da coluna EXTRAS do dia. Os limites são
// parametrizáveis pelo administrador; os padrões abaixo são os da política em
// vigor (2h de limite legal diário, com margem de acompanhamento até 2h30).
//
// "Ocorrência acima de 2h" = amarelo + vermelho. É o indicador principal de
// todos os relatórios, e por isso vive aqui, e não espalhado pelas telas.

export type Faixa = 'verde' | 'amarelo' | 'vermelho' | 'sem_extra';

export const FAIXAS: Faixa[] = ['verde', 'amarelo', 'vermelho', 'sem_extra'];

export const FAIXA_LABEL: Record<Faixa, string> = {
  verde: 'Verde',
  amarelo: 'Amarelo',
  vermelho: 'Vermelho',
  sem_extra: 'Sem extra',
};

/** Limites em MINUTOS, inclusivos no topo de cada faixa. */
export interface LimitesFaixa {
  /** Topo do verde. Padrão 120 = 02:00. */
  verdeMaxMin: number;
  /** Topo do amarelo. Padrão 150 = 02:30. Acima disso é vermelho. */
  amareloMaxMin: number;
}

export const LIMITES_PADRAO: LimitesFaixa = { verdeMaxMin: 120, amareloMaxMin: 150 };

/**
 * Classifica um lançamento. Zero, afastamento e ausência de batida caem em
 * `sem_extra` — não são "verde": verde significa extra dentro do limite, e
 * misturar os dois inflaria a contagem de quem fez hora extra.
 */
export function classificarFaixa(extrasMin: number, limites: LimitesFaixa = LIMITES_PADRAO): Faixa {
  if (!Number.isFinite(extrasMin) || extrasMin <= 0) return 'sem_extra';
  if (extrasMin <= limites.verdeMaxMin) return 'verde';
  if (extrasMin <= limites.amareloMaxMin) return 'amarelo';
  return 'vermelho';
}

/** Ocorrência acima do limite de referência (amarelo ou vermelho). */
export function ehOcorrenciaAcimaDoLimite(faixa: Faixa): boolean {
  return faixa === 'amarelo' || faixa === 'vermelho';
}

/** Limites válidos? Verde precisa caber dentro do amarelo, e ambos positivos. */
export function limitesValidos(l: LimitesFaixa): boolean {
  return Number.isInteger(l.verdeMaxMin) && Number.isInteger(l.amareloMaxMin)
    && l.verdeMaxMin > 0 && l.amareloMaxMin > l.verdeMaxMin;
}
