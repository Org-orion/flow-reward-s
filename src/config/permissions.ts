// Registro CENTRAL de permissões GRANULARES — fonte única de recursos, ações e
// campos controlados. Módulo PURO: não importa AuthContext (evita ciclo, pois o
// AuthContext consome este arquivo).
//
// MODELO
//   Seção  → módulo inteiro (modelo legado, mantido: `concremrh_usuarios.secoes`).
//   Recurso → uma TELA/visão (ex.: 'producao_setor').
//   Ação    → o que se pode fazer no recurso ('ver', 'criar', 'editar', ...).
//   Campo   → dado específico do recurso com trava própria (ex.: 'meta').
//
// FORMATO DA CONCESSÃO (string persistida em jsonb)
//   `<recurso>.<acao>`                    ex.: 'producao_setor.editar'
//   `<recurso>.campo.<campo>.<acao>`      ex.: 'producao_setor.campo.meta.editar'
//   O marcador literal `campo` remove qualquer ambiguidade entre campo e ação.
//
// REGRA: concessão EXPLÍCITA, negada por padrão — igual ao modelo de seções
// ("tudo é explícito em `secoes`", ver features/users/domain/permissionDefinitions).
// Ter `recurso.editar` NÃO libera um campo controlado: o campo exige a sua
// própria concessão. Campos NÃO declarados aqui não são controlados (seguem a
// ação do recurso).

/** Ações possíveis. Cada recurso declara só as que fazem sentido nele. */
export type PermissionAction =
  | 'ver'
  | 'criar'
  | 'editar'
  | 'excluir'
  | 'importar'
  | 'exportar'
  | 'processar'
  | 'estornar';

export const ACTION_LABEL: Record<PermissionAction, string> = {
  ver: 'Ver',
  criar: 'Criar',
  editar: 'Editar',
  excluir: 'Excluir',
  importar: 'Importar',
  exportar: 'Exportar',
  processar: 'Processar',
  estornar: 'Estornar',
};

/** Ações aplicáveis a um campo (só faz sentido esconder ou travar a edição). */
export type FieldAction = 'ver' | 'editar';

export interface PermissionFieldDef {
  key: string;
  label: string;
  description?: string;
  /** Ações controladas neste campo. */
  actions: FieldAction[];
}

export type PermissionModule = 'premiacoes' | 'cargos-salarios' | 'controle-estoque';

export interface PermissionResourceDef {
  /** Chave estável persistida nas concessões. NUNCA renomear sem migração. */
  key: string;
  label: string;
  description: string;
  /** Seção legada equivalente — usada no fallback e para manter rota/sidebar. */
  section: string;
  module: PermissionModule;
  /** Rótulo do grupo na interface de edição (espelha a sidebar). */
  group: string;
  route?: string;
  actions: PermissionAction[];
  /** Campos com trava própria. Ausente = nenhum campo controlado. */
  fields?: PermissionFieldDef[];
  order: number;
}

const META_REALIZADO: PermissionFieldDef[] = [
  { key: 'meta', label: 'Meta', description: 'Valor de meta da competência (definido pela gestão).', actions: ['ver', 'editar'] },
  { key: 'realizado', label: 'Realizado', description: 'Valor apurado/produzido na competência.', actions: ['ver', 'editar'] },
];

const FALTAS_ADVERTENCIAS: PermissionFieldDef[] = [
  { key: 'faltas', label: 'Faltas', description: 'Quantidade de faltas do funcionário na competência.', actions: ['ver', 'editar'] },
  { key: 'advertencias', label: 'Advertências', description: 'Quantidade de advertências do funcionário na competência.', actions: ['ver', 'editar'] },
];

/** Cadastro mestre com o padrão CRUD uniforme (novo / editar / excluir). */
function cadastro(
  key: string, label: string, description: string, route: string, order: number,
): PermissionResourceDef {
  return {
    key, label, description,
    section: 'cadastros', module: 'premiacoes', group: 'Cadastros', route,
    actions: ['ver', 'criar', 'editar', 'excluir'],
    order,
  };
}

/**
 * Recursos com permissão granular ATIVA. Telas fora desta lista continuam
 * governadas apenas pela seção (comportamento atual, sem regressão).
 *
 * A tela de Usuários e Acessos NÃO entra aqui de propósito: ela é exclusiva de
 * administradores, que ignoram todo o modelo de permissões. Registrá-la só
 * criaria risco de trancar a própria administração de acessos.
 */
export const PERMISSION_RESOURCES: PermissionResourceDef[] = [
  // ---------------------------------------------------------------- Painel
  {
    key: 'dashboard_premiacoes',
    label: 'Dashboard de Premiações',
    description: 'Painel inicial do módulo de premiações.',
    section: 'dashboard', module: 'premiacoes', group: 'Painel',
    route: '/premiacoes',
    actions: ['ver'],
    order: 1,
  },
  {
    key: 'indicadores_rh',
    label: 'Indicadores de RH',
    description: 'Painel analítico de indicadores de recursos humanos.',
    section: 'dashboard', module: 'premiacoes', group: 'Painel',
    route: '/indicadores-rh',
    actions: ['ver'],
    order: 2,
  },

  // -------------------------------------------------------------------- RH
  {
    key: 'funcionarios',
    label: 'Funcionários',
    description: 'Cadastro e gestão de pessoas (dados funcionais e elegibilidade).',
    section: 'rh', module: 'premiacoes', group: 'RH',
    route: '/premiacoes/funcionarios',
    actions: ['ver', 'criar', 'editar', 'importar', 'exportar'],
    order: 10,
  },
  {
    key: 'faltas_advertencias',
    label: 'Faltas e Advertências',
    description: 'Apuração mensal de faltas e advertências por funcionário.',
    section: 'rh', module: 'premiacoes', group: 'RH',
    route: '/premiacoes/faltas-advertencias',
    actions: ['ver', 'editar', 'importar'],
    fields: FALTAS_ADVERTENCIAS,
    order: 11,
  },

  // ----------------------------------------------------------------- SESMT
  {
    key: 'dss',
    label: 'DSS',
    description: 'Diálogo de Segurança e Saúde — registro, histórico e indicadores.',
    section: 'sesmt', module: 'premiacoes', group: 'SESMT',
    route: '/premiacoes/dss',
    actions: ['ver', 'criar', 'editar', 'excluir'],
    order: 20,
  },
  {
    key: 'epi',
    label: 'EPI',
    description: 'Auditoria e conformidade de equipamentos de proteção individual.',
    section: 'sesmt', module: 'premiacoes', group: 'SESMT',
    route: '/premiacoes/epi',
    actions: ['ver', 'criar', 'editar', 'excluir'],
    order: 21,
  },

  // ------------------------------------------------------------- Produção
  {
    key: 'producao_setor',
    label: 'Produção por Setor',
    description: 'Apuração mensal de meta e produção realizada por setor.',
    section: 'producao',
    module: 'premiacoes',
    group: 'Produção',
    route: '/premiacoes/producao-setor',
    actions: ['ver', 'criar', 'editar', 'importar'],
    fields: META_REALIZADO,
    order: 30,
  },
  {
    key: 'producao_historico',
    label: 'Produção — Histórico',
    description: 'Consulta do histórico de apurações de produção por competência.',
    section: 'producao',
    module: 'premiacoes',
    group: 'Produção',
    route: '/premiacoes/producao-setor?view=historico',
    actions: ['ver'],
    order: 31,
  },
  {
    key: 'indicadores_setor',
    label: 'Indicadores por Setor',
    description: 'Apuração dos cinco indicadores de setor (meta e realizado).',
    section: 'producao',
    module: 'premiacoes',
    group: 'Produção',
    route: '/premiacoes/indicadores-setor',
    // Não há ação de "criar" separada: o registro nasce ao salvar a apuração.
    actions: ['ver', 'editar'],
    fields: META_REALIZADO,
    order: 32,
  },
  {
    key: 'indicadores_gerais',
    label: 'Indicadores Gerais',
    description: 'Indicadores corporativos por competência (meta e realizado).',
    section: 'producao',
    module: 'premiacoes',
    group: 'Produção',
    route: '/premiacoes/indicadores-gerais',
    actions: ['ver', 'criar', 'editar', 'excluir'],
    fields: META_REALIZADO,
    order: 33,
  },

  // ---------------------------------------------------- Premiações (motor)
  {
    key: 'gerar_premiacoes',
    label: 'Gerar Premiações',
    description: 'Processamento da premiação da competência (parâmetros, validação e confirmação).',
    section: 'premiacoes', module: 'premiacoes', group: 'Premiações',
    route: '/premiacoes/gerar-premiacoes',
    actions: ['ver', 'processar', 'excluir'],
    order: 40,
  },
  {
    key: 'relatorio_premiacoes',
    label: 'Relatório de Premiações',
    description: 'Relatório e conferência dos resultados de premiação.',
    section: 'premiacoes', module: 'premiacoes', group: 'Premiações',
    route: '/premiacoes/relatorio-premiacoes',
    actions: ['ver', 'exportar'],
    order: 41,
  },

  // ------------------------------------------------------------ Cadastros
  cadastro('cad_setores', 'Setores', 'Estrutura organizacional de setores.', '/premiacoes/cadastros/setores', 50),
  cadastro('cad_faixas', 'Faixas', 'Faixas de premiação.', '/premiacoes/cadastros/faixas', 51),
  cadastro('cad_funcoes', 'Funções', 'Funções dos funcionários.', '/premiacoes/cadastros/funcoes', 52),
  cadastro('cad_categorias', 'Categorias', 'Categorias de funcionários.', '/premiacoes/cadastros/categorias', 53),
  cadastro('cad_base_premiacao', 'Base Premiação', 'Bases (potes) de premiação e seus valores.', '/premiacoes/cadastros/base-premiacao', 54),
  cadastro('cad_empresas', 'Empresas', 'Empresas do grupo.', '/premiacoes/cadastros/empresas', 55),
  cadastro('cad_tipos_indicadores', 'Tipos de Indicadores', 'Tipos de indicadores setoriais.', '/premiacoes/cadastros/tipos-indicadores', 56),
  cadastro('cad_tipos_indicadores_gerais', 'Tipos de Indicadores Gerais', 'Tipos de indicadores corporativos.', '/premiacoes/cadastros/tipos-indicadores-gerais', 57),
  cadastro('cad_locais_dss', 'Locais de DSS', 'Locais onde o DSS é realizado.', '/premiacoes/cadastros/locais-dss', 58),
  cadastro('cad_formulas_calculo', 'Fórmulas de Cálculo', 'Fórmulas usadas no cálculo da premiação.', '/premiacoes/cadastros/formulas-calculo', 59),
  cadastro('cad_configuracoes_kits', 'Configurações de Kits', 'Regras de premiação por kits.', '/premiacoes/cadastros/configuracoes-kits', 60),
  cadastro('cad_bonus_percentual', 'Bônus Percentual', 'Bônus percentual por kits.', '/premiacoes/cadastros/bonus-percentual', 61),

  // ---------------------------------------------------- Cargos e Salários
  {
    key: 'cs_dashboard',
    label: 'Cargos e Salários — Painel',
    description: 'Painel do módulo de cargos e salários.',
    section: 'cargos_salarios', module: 'cargos-salarios', group: 'Cargos e Salários',
    route: '/cargos-salarios',
    actions: ['ver'],
    order: 70,
  },
  {
    key: 'cs_cargos',
    label: 'Cargos',
    description: 'Cadastro de cargos, faixas salariais e estrutura.',
    section: 'cargos_salarios', module: 'cargos-salarios', group: 'Cargos e Salários',
    route: '/cargos-salarios/cargos',
    actions: ['ver', 'criar', 'editar'],
    order: 71,
  },
  {
    key: 'cs_funcionarios',
    label: 'Cargos e Salários — Funcionários',
    description: 'Enquadramento de funcionários em cargos.',
    section: 'cargos_salarios', module: 'cargos-salarios', group: 'Cargos e Salários',
    route: '/cargos-salarios/funcionarios',
    actions: ['ver', 'criar', 'editar'],
    order: 72,
  },

  // ---------------------------------------------------- Controle de Farda
  {
    key: 'est_visao_geral',
    label: 'Farda — Painel',
    description: 'Visão geral do controle de fardamentos.',
    section: 'estoque', module: 'controle-estoque', group: 'Controle de Farda',
    route: '/controle-estoque',
    actions: ['ver'],
    order: 80,
  },
  {
    key: 'est_fardamentos',
    label: 'Farda — Fardamentos',
    description: 'Itens de fardamento e saldos em estoque.',
    section: 'estoque', module: 'controle-estoque', group: 'Controle de Farda',
    route: '/controle-estoque/fardamentos',
    // Não há "criar" aqui: o cadastro de item vive em Farda — Cadastros.
    // 'editar' = inativar/reativar o fardamento.
    actions: ['ver', 'editar', 'exportar'],
    order: 81,
  },
  {
    key: 'est_alertas',
    label: 'Farda — Alertas',
    description: 'Alertas de saldo mínimo e ruptura.',
    section: 'estoque', module: 'controle-estoque', group: 'Controle de Farda',
    route: '/controle-estoque/alertas',
    actions: ['ver', 'exportar'],
    order: 82,
  },
  {
    key: 'est_ajuste',
    label: 'Farda — Ajuste de saldo',
    description: 'Correção manual de saldo em estoque.',
    section: 'estoque', module: 'controle-estoque', group: 'Controle de Farda',
    route: '/controle-estoque/ajuste',
    actions: ['ver', 'editar'],
    order: 83,
  },
  {
    key: 'est_entradas',
    label: 'Farda — Entradas',
    description: 'Registro de entradas de fardamento em estoque.',
    section: 'estoque', module: 'controle-estoque', group: 'Controle de Farda',
    route: '/controle-estoque/entradas',
    actions: ['ver', 'criar'],
    order: 84,
  },
  {
    key: 'est_entregas',
    label: 'Farda — Entregas',
    description: 'Entrega de fardamento ao colaborador.',
    section: 'estoque', module: 'controle-estoque', group: 'Controle de Farda',
    route: '/controle-estoque/entregas',
    actions: ['ver', 'criar'],
    order: 85,
  },
  {
    key: 'est_devolucoes',
    label: 'Farda — Devoluções',
    description: 'Devolução de fardamento ao estoque.',
    section: 'estoque', module: 'controle-estoque', group: 'Controle de Farda',
    route: '/controle-estoque/devolucoes',
    actions: ['ver', 'criar'],
    order: 86,
  },
  {
    key: 'est_troca',
    label: 'Farda — Troca de item',
    description: 'Troca de item entregue ao colaborador.',
    section: 'estoque', module: 'controle-estoque', group: 'Controle de Farda',
    route: '/controle-estoque/troca',
    actions: ['ver', 'criar'],
    order: 87,
  },
  {
    key: 'est_movimentacoes',
    label: 'Farda — Movimentações',
    description: 'Histórico de movimentações de estoque.',
    section: 'estoque', module: 'controle-estoque', group: 'Controle de Farda',
    route: '/controle-estoque/movimentacoes',
    actions: ['ver', 'exportar'],
    order: 88,
  },
  {
    key: 'est_estornos',
    label: 'Farda — Estornos',
    description: 'Estorno de movimentações já registradas.',
    section: 'estoque', module: 'controle-estoque', group: 'Controle de Farda',
    route: '/controle-estoque/estornos',
    actions: ['ver', 'estornar'],
    order: 89,
  },
  {
    key: 'est_cadastros',
    label: 'Farda — Cadastros',
    description: 'Cadastros mestres do estoque (categorias, modelos, tamanhos, variantes).',
    section: 'estoque', module: 'controle-estoque', group: 'Controle de Farda',
    route: '/controle-estoque/cadastros',
    actions: ['ver', 'criar', 'editar', 'excluir', 'exportar'],
    order: 90,
  },
];

const RESOURCE_BY_KEY = new Map(PERMISSION_RESOURCES.map(r => [r.key, r]));

export function resourceDef(key: string): PermissionResourceDef | undefined {
  return RESOURCE_BY_KEY.get(key);
}

/** Seções que já possuem recursos granulares declarados. */
export const GRANULAR_SECTIONS: string[] = Array.from(new Set(PERMISSION_RESOURCES.map(r => r.section)));

/** Recursos de uma seção, na ordem de exibição. */
export function resourcesOfSection(section: string): PermissionResourceDef[] {
  return PERMISSION_RESOURCES.filter(r => r.section === section).sort((a, b) => a.order - b.order);
}

/**
 * Seções IMPLICADAS por um conjunto de concessões.
 *
 * Existe porque o BANCO decide por seção, não por tela: as policies de RLS usam
 * `has_secao('<secao>')`, que lê `concremrh_usuarios.secoes` e não sabe nada de
 * permissão detalhada. Sem alimentar `secoes`, conceder uma tela na árvore
 * libera o botão na interface e o servidor recusa a operação (o UPDATE não
 * atinge linha alguma).
 *
 * Consequência aceita e documentada: no BANCO o usuário detalhado tem o mesmo
 * alcance de um usuário da seção. O recorte fino por tela/ação/campo continua
 * sendo da interface. Nunca damos mais do que a seção — apenas o suficiente
 * para o que foi concedido funcionar.
 */
export function sectionsFromGrants(grants: Iterable<string>): string[] {
  const out = new Set<string>();
  for (const g of grants) {
    const p = parseGrant(g);
    if (p.kind === 'invalida') continue;
    const def = RESOURCE_BY_KEY.get(p.resource);
    if (def) out.add(def.section);
  }
  return [...out].sort();
}

// --- Concessões (strings) -----------------------------------------------------

export function actionGrant(resource: string, action: PermissionAction): string {
  return `${resource}.${action}`;
}

export function fieldGrant(resource: string, field: string, action: FieldAction): string {
  return `${resource}.campo.${field}.${action}`;
}

export type ParsedGrant =
  | { kind: 'acao'; resource: string; action: string }
  | { kind: 'campo'; resource: string; field: string; action: string }
  | { kind: 'invalida'; raw: string };

export function parseGrant(raw: string): ParsedGrant {
  const parts = raw.split('.');
  if (parts.length === 2) return { kind: 'acao', resource: parts[0], action: parts[1] };
  if (parts.length === 4 && parts[1] === 'campo') {
    return { kind: 'campo', resource: parts[0], field: parts[2], action: parts[3] };
  }
  return { kind: 'invalida', raw };
}

/** A concessão existe no registro? (usada para sinalizar resíduos, nunca remover.) */
export function isKnownGrant(raw: string): boolean {
  const g = parseGrant(raw);
  if (g.kind === 'invalida') return false;
  const def = RESOURCE_BY_KEY.get(g.resource);
  if (!def) return false;
  if (g.kind === 'acao') return def.actions.includes(g.action as PermissionAction);
  const campo = def.fields?.find(f => f.key === g.field);
  return !!campo && campo.actions.includes(g.action as FieldAction);
}

/** Todas as concessões válidas de um recurso (ações + campos). */
export function allGrantsOfResource(def: PermissionResourceDef): string[] {
  const out = def.actions.map(a => actionGrant(def.key, a));
  for (const f of def.fields ?? []) {
    for (const a of f.actions) out.push(fieldGrant(def.key, f.key, a));
  }
  return out;
}

/** Todas as concessões válidas do registro inteiro. */
export function allKnownGrants(): string[] {
  return PERMISSION_RESOURCES.flatMap(allGrantsOfResource);
}

/** Rótulo legível de uma concessão (para a tela de comparação/auditoria). */
export function grantLabel(raw: string): string {
  const g = parseGrant(raw);
  if (g.kind === 'invalida') return raw;
  const def = RESOURCE_BY_KEY.get(g.resource);
  const recurso = def?.label ?? g.resource;
  const acao = ACTION_LABEL[g.action as PermissionAction] ?? g.action;
  if (g.kind === 'acao') return `${recurso} — ${acao}`;
  const campo = def?.fields?.find(f => f.key === g.field)?.label ?? g.field;
  return `${recurso} — ${acao} campo "${campo}"`;
}
