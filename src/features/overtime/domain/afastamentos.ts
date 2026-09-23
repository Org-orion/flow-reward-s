// Códigos de afastamento do Secullum — PURO.
//
// No ponto diário, o campo de BATIDA pode trazer um código no lugar da hora
// ("FALTA", "LIC MAT"). O código do Secullum é truncado e sem acento; aqui ele
// vira o rótulo que o RH usa de fato. Código desconhecido é PRESERVADO como
// veio — inventar um rótulo esconderia uma situação nova do arquivo.

export const AFASTAMENTO_ROTULO: Record<string, string> = {
  FALTA: 'FALTA',
  FERIAS: 'FÉRIAS',
  ATESTAD: 'ATESTADO',
  ATESTADO: 'ATESTADO',
  INSS: 'INSS',
  JUSTIFI: 'JUSTIFICADA',
  JUSTIFICADA: 'JUSTIFICADA',
  FOLGA: 'FOLGA',
  'FOLGA C': 'FOLGA COMPENSATÓRIA',
  'LIC MAT': 'LICENÇA MATERNIDADE',
  'LIC PAT': 'LICENÇA PATERNIDADE',
  SUSPENS: 'SUSPENSÃO',
  AFASTAD: 'AFASTADO',
};

/** Lançamento sem nenhuma batida e sem código de afastamento. */
export const SEM_REGISTRO = 'SEM REGISTRO';

/** Normaliza para comparação: sem acento, maiúsculo, espaços colapsados. */
export function normalizarCodigo(valor: unknown): string {
  return String(valor ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

/**
 * O valor da batida é um código de afastamento? Devolve o rótulo amigável, ou
 * null quando é hora, vazio ou outra coisa.
 */
export function rotuloAfastamento(valorBatida: unknown): string | null {
  const bruto = String(valorBatida ?? '').trim();
  if (!bruto) return null;
  if (/^\d{1,2}:\d{2}$/.test(bruto)) return null;   // é hora, não código
  const chave = normalizarCodigo(bruto);
  return AFASTAMENTO_ROTULO[chave] ?? bruto.toUpperCase();
}
