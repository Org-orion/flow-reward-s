// Permissões de CAMPO da apuração de produção, traduzidas para o que a grade
// precisa saber. PURO — recebe as duas consultas e devolve os sinalizadores.
//
// Regra de vazamento: percentual e desvio derivam de meta e realizado
// (percentual = realizado/meta). Exibi-los sem uma das duas colunas entregaria
// o valor escondido — por isso só aparecem quando ambas são visíveis.

export interface ProductionFieldAccess {
  verMeta: boolean;
  editarMeta: boolean;
  verRealizado: boolean;
  editarRealizado: boolean;
  /** Percentual e desvio (colunas derivadas). */
  verDerivados: boolean;
  /** Há ao menos uma coluna editável. */
  podeEditarAlgum: boolean;
}

export interface FieldAccessQueries {
  podeVerCampo: (field: string) => boolean;
  podeEditarCampo: (field: string) => boolean;
}

export function buildProductionFieldAccess(a: FieldAccessQueries): ProductionFieldAccess {
  const verMeta = a.podeVerCampo('meta');
  const verRealizado = a.podeVerCampo('realizado');
  // Não se edita o que não se vê.
  const editarMeta = verMeta && a.podeEditarCampo('meta');
  const editarRealizado = verRealizado && a.podeEditarCampo('realizado');
  return {
    verMeta,
    editarMeta,
    verRealizado,
    editarRealizado,
    verDerivados: verMeta && verRealizado,
    podeEditarAlgum: editarMeta || editarRealizado,
  };
}

/** Nº de colunas visíveis da grade (Setor, [Meta], [Realizado], [%], [Desvio], Situação, Ações). */
export function productionColumnCount(f: ProductionFieldAccess): number {
  return 3 + (f.verMeta ? 1 : 0) + (f.verRealizado ? 1 : 0) + (f.verDerivados ? 2 : 0);
}
