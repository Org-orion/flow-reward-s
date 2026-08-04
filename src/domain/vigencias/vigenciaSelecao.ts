// Seleção da regra vigente por competência — PURA. Espelha a regra usada em
// produção (`getConfigParaCompetencia`): maior vigência ≤ competência.
// Não calcula valores (isso é de cada domínio de cálculo).

export interface HasVigencia { vigenciaInicio: string }

/** Regra vigente para a competência ('YYYY-MM'): maior vigência ≤ competência. */
export function selectVigenciaForCompetencia<T extends HasVigencia>(configs: T[], competencia: string): T | null {
  const mes = (competencia ?? '').slice(0, 7);
  const elegiveis = configs
    .filter(c => c.vigenciaInicio <= mes)
    .sort((a, b) => b.vigenciaInicio.localeCompare(a.vigenciaInicio));
  return elegiveis[0] ?? null;
}

/** Sentinela: vigência muito antiga que funciona como "regra inicial" (desde sempre). */
export function isSentinelaVigencia(vigenciaInicio: string): boolean {
  return (vigenciaInicio ?? '') <= '2000-12';
}

const VIGENCIA_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Vigência no formato 'YYYY-MM' com mês entre 01 e 12. */
export function isValidVigencia(vigencia: string): boolean {
  return VIGENCIA_RE.test(vigencia ?? '');
}
