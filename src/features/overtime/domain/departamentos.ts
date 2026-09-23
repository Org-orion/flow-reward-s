// Departamentos do ponto — PURO.
//
// O Secullum exporta o código sem acentuação consistente ("MANUTENCÃO
// ELETRICA", "SITIO"). O mapa abaixo é só de EXIBIÇÃO: o código de origem é o
// que fica gravado e o que concilia com o arquivo. Departamento novo NÃO é
// erro — entra com o nome bruto e é sinalizado para o administrador rotular.

/** Código de origem (como vem no arquivo) → rótulo de exibição. */
export const DEPARTAMENTO_ROTULO: Record<string, string> = {
  'FABRICA 1': 'Fábrica 1',
  'FABRICA 2': 'Fábrica 2',
  'FABRICA 1 - NOITE': 'Fábrica 1 — Noite',
  'FABRICA 1 - MARCENARIA': 'Fábrica 1 — Marcenaria',
  'FABRICA DE MOVEIS': 'Fábrica de Móveis',
  'LINHA DE PINTURA': 'Linha de Pintura',
  VIVEIRO: 'Viveiro',
  MANUTENÇÃO: 'Manutenção',
  MANUTENCAO: 'Manutenção',
  'MANUTENCÃO ELETRICA': 'Manutenção Elétrica',
  'MANUTENCAO ELETRICA': 'Manutenção Elétrica',
  ADMINISTRAÇÃO: 'Administração',
  ADMINISTRACAO: 'Administração',
  'ADMINISTRAÇÃO-DISTRIBUIDORA': 'Administração — Distribuidora',
  'ADMINISTRACAO-DISTRIBUIDORA': 'Administração — Distribuidora',
  'ADMINISTRATIVO PRODUCAO': 'Administrativo Produção',
  'ADMINISTRATIVO PRODUÇÃO': 'Administrativo Produção',
  'ADMINISTRATIVO APRENDIZES': 'Administrativo Aprendizes',
  EXTERNOS: 'Externos',
  SITIO: 'Sítio',
  SÍTIO: 'Sítio',
  VIGILANCIA: 'Vigilância',
  VIGILÂNCIA: 'Vigilância',
};

/**
 * Departamento de APRENDIZES — jornada de aprendiz não admite hora extra, então
 * qualquer extra ali vira alerta (ver alertas.ts). Comparado por código
 * normalizado para não depender de acento.
 */
export const CODIGO_APRENDIZES = 'ADMINISTRATIVO APRENDIZES';

/** Normaliza o código para busca no mapa (sem acento, maiúsculo, espaço único). */
export function normalizarDepartamento(codigo: unknown): string {
  return String(codigo ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

const POR_CODIGO_NORMALIZADO = new Map<string, string>(
  Object.entries(DEPARTAMENTO_ROTULO).map(([k, v]) => [normalizarDepartamento(k), v]),
);

/**
 * Rótulo de exibição. Sem correspondência, devolve o código bruto — o arquivo
 * manda, e a tela de Configurações permite ajustar depois.
 */
export function rotuloDepartamento(
  codigo: string,
  rotulosCadastrados?: Map<string, string>,
): string {
  const cad = rotulosCadastrados?.get(codigo);
  if (cad) return cad;
  return POR_CODIGO_NORMALIZADO.get(normalizarDepartamento(codigo)) ?? String(codigo ?? '').trim();
}

/** O departamento é conhecido pelo mapa padrão? (false = pedir rótulo ao admin) */
export function departamentoConhecido(codigo: string): boolean {
  return POR_CODIGO_NORMALIZADO.has(normalizarDepartamento(codigo));
}

/** É o departamento de aprendizes? */
export function ehAprendizes(codigo: string): boolean {
  return normalizarDepartamento(codigo) === normalizarDepartamento(CODIGO_APRENDIZES);
}
