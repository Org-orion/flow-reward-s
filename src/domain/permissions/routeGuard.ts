// Decisão de acesso a uma ROTA — PURA. Concentra a ORDEM DE PRECEDÊNCIA entre
// os três gates que convivem no sistema, que é a parte realmente sutil:
//
//   1. perfil     (`allowedPerfis`) — gate legado, redireciona
//   2. seção      (`section`)       — nega
//   3. recurso    (`resource`)      — nega, só para usuário granular
//
// REGRA CENTRAL: o gate por PERFIL cede ao modelo granular, mas SOMENTE quando a
// rota tem um `resource` para decidir em seu lugar. Sem isso, conceder uma tela
// nova a um usuário detalhado não teria efeito — o perfil redirecionaria antes
// de a permissão ser consultada (foi exatamente o bug de "concedi a tela e ela
// não aparece"). E é a exigência de `resource` que mantém seguras as rotas sem
// permissão granular (Hub, Usuários e Acessos): nelas o perfil continua sendo a
// única palavra, e ninguém entra por falta de regra.

export type RouteAccess =
  | { kind: 'carregando' }
  | { kind: 'login' }
  | { kind: 'redirecionar' }
  | { kind: 'negado'; motivo: 'secao' | 'recurso' }
  | { kind: 'liberado' };

export interface RouteGuardInput {
  loading: boolean;
  /** Há perfil carregado? (false = não autenticado) */
  autenticado: boolean;
  perfil: string;
  allowedPerfis?: string[];
  section?: string;
  resource?: string;
  /** O usuário está sob o modelo granular. */
  isGranular: boolean;
  canAccess: (section: string) => boolean;
  can: (resource: string, action: 'ver') => boolean;
}

export function decidirAcessoRota(i: RouteGuardInput): RouteAccess {
  if (i.loading) return { kind: 'carregando' };
  if (!i.autenticado) return { kind: 'login' };

  const granularDecide = i.isGranular && !!i.resource;
  if (i.allowedPerfis && !granularDecide && !i.allowedPerfis.includes(i.perfil)) {
    return { kind: 'redirecionar' };
  }

  if (i.section && !i.canAccess(i.section)) {
    return { kind: 'negado', motivo: 'secao' };
  }

  if (i.resource && i.isGranular && !i.can(i.resource, 'ver')) {
    return { kind: 'negado', motivo: 'recurso' };
  }

  return { kind: 'liberado' };
}
