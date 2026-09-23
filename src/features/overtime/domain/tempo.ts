// Tempo em MINUTOS INTEIROS — PURO.
//
// Princípio inegociável do módulo: a coluna EXTRAS do Secullum é usada como
// vem. Nada é recalculado a partir das batidas, nada é arredondado. Para somar
// sem erro de ponto flutuante, toda hora vira MINUTO INTEIRO na entrada e só
// volta a "hh:mm" na exibição — nunca float.
//
// As linhas de total do próprio arquivo passam de 24h (ex.: "1426:28"), então o
// componente de horas NÃO é limitado a 23 e NÃO existe conceito de "dia".

/** "hh:mm" (h de qualquer tamanho) → minutos. Vazio/inválido → null. */
export function parseHoraMin(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null;
  const s = String(valor).trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,6}):([0-5]\d)$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Igual a parseHoraMin, mas vazio vira 0 — para EXTRAS/NORMAIS/FALTAS/CARGA. */
export function parseHoraMinOuZero(valor: unknown): number {
  return parseHoraMin(valor) ?? 0;
}

/** Minutos → "hh:mm" com horas sem teto (não existe "24:00 vira 00:00"). */
export function formatMin(min: number): string {
  const neg = min < 0;
  const abs = Math.abs(Math.trunc(min));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${neg ? '-' : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Só o horário de batida ("06:16"); recusa valores fora de um relógio real. */
export function ehHorarioDeRelogio(valor: unknown): boolean {
  const s = String(valor ?? '').trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

/** Soma defensiva (uma lista vazia soma zero, não NaN). */
export function somaMin(valores: number[]): number {
  let t = 0;
  for (const v of valores) t += v;
  return t;
}
