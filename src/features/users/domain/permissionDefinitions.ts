// Registro CENTRAL de permissões (seções) — fonte única. Não duplicar listas de
// seções pelos componentes. As chaves são as REAIS do domínio de auth
// (AuthContext.SectionKey / ALL_SECTIONS). NÃO altera valores persistidos.
//
// AUDITORIA: o modelo real usa `perfil` ('admin' = Acesso total, ignora secoes) e
// `secoes` (SectionKey[]) por usuário — NÃO há herança de perfil (RH/SESMT/Produção
// não concedem seções automaticamente; tudo é explícito em `secoes`). A tela
// Usuários é acessada via seção 'cadastros' (ou admin) — não existe SectionKey
// 'usuarios' separada.
import { ALL_SECTIONS, type SectionKey } from '@/contexts/AuthContext';

export type PermissionGroup = 'operacao' | 'administracao';
export type Sensitivity = 'normal' | 'sensivel';

export interface PermissionDef {
  key: SectionKey;
  label: string;
  description: string;
  group: PermissionGroup;
  sensitivity: Sensitivity;
  order: number;
  /** Rota/base do módulo, quando aplicável (informativo). */
  route?: string;
}

export const PERMISSION_DEFS: PermissionDef[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'Painel inicial e indicadores gerais.', group: 'operacao', sensitivity: 'normal', order: 1, route: '/' },
  { key: 'rh', label: 'RH', description: 'Recursos Humanos e dados de funcionários.', group: 'operacao', sensitivity: 'normal', order: 2 },
  { key: 'sesmt', label: 'SESMT', description: 'Segurança do trabalho (DSS, EPI, ocorrências).', group: 'operacao', sensitivity: 'normal', order: 3 },
  { key: 'producao', label: 'Produção', description: 'Produção por setor e indicadores setoriais.', group: 'operacao', sensitivity: 'normal', order: 4 },
  { key: 'estoque', label: 'Controle de Farda', description: 'Fardamentos, entradas, entregas, devoluções e movimentações.', group: 'operacao', sensitivity: 'sensivel', order: 5, route: '/controle-estoque' },
  { key: 'premiacoes', label: 'Premiações', description: 'Processamento e relatórios de premiação.', group: 'operacao', sensitivity: 'sensivel', order: 6, route: '/premiacoes' },
  { key: 'cadastros', label: 'Cadastros', description: 'Cadastros mestres, incluindo Usuários e Acessos.', group: 'administracao', sensitivity: 'sensivel', order: 7, route: '/premiacoes/cadastros' },
  { key: 'cargos_salarios', label: 'Cargos e Salários', description: 'Módulo de cargos e salários (Cargos).', group: 'administracao', sensitivity: 'sensivel', order: 8, route: '/cargos-salarios' },
  // Ponto é dado pessoal de trabalhador (LGPD) — seção sensível, concedida caso a caso.
  { key: 'horas_extras', label: 'Horas Extras', description: 'Ponto diário do Secullum: importação, painel e relatórios de horas extras.', group: 'operacao', sensitivity: 'sensivel', order: 9, route: '/horas-extras' },
];

const BY_KEY = new Map<string, PermissionDef>(PERMISSION_DEFS.map(d => [d.key, d]));

export function isKnownSection(key: string): key is SectionKey {
  return BY_KEY.has(key);
}

export function permissionDef(key: string): PermissionDef | undefined {
  return BY_KEY.get(key);
}

/** Rótulo de uma seção (chave desconhecida → a própria chave). */
export function sectionLabel(key: string): string {
  return BY_KEY.get(key)?.label ?? key;
}

export const KNOWN_SECTIONS: SectionKey[] = ALL_SECTIONS;

/** Perfis + rótulos pt-BR. 'custom' NÃO existe no enum do banco (user_perfil =
 *  admin|rh|sesmt|producao) — mantido apenas como fallback de exibição defensivo
 *  caso algum registro legado o traga. NÃO é ofertado na criação/edição. */
export type PerfilKey = 'admin' | 'rh' | 'sesmt' | 'producao' | 'custom';
export const PERFIL_LABEL: Record<PerfilKey, string> = {
  admin: 'Administrador', rh: 'RH', sesmt: 'SESMT', producao: 'Produção', custom: 'Personalizado',
};
export function perfilLabel(perfil: string): string {
  return (PERFIL_LABEL as Record<string, string>)[perfil] ?? perfil;
}
/** Perfis realmente persistíveis (enum user_perfil do banco). */
export const CREATABLE_PERFIS: Exclude<PerfilKey, 'custom'>[] = ['admin', 'rh', 'sesmt', 'producao'];
