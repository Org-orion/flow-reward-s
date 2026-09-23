// Planilhas sintéticas que reproduzem a ESTRUTURA real das exportações do
// Secullum (posição de colunas, cabeçalho repetido a cada quebra de página,
// rodapés, linhas SUBTOTAL/TOTAL GERAL).
//
// Os dados são fictícios de propósito: ponto é dado pessoal de trabalhador
// (LGPD) e não entra no repositório. A conferência contra os números reais do
// arquivo de produção é feita fora do versionamento — ver o README do módulo.

import type { AbaCrua, LinhaCrua } from '../pontoTipos';

const LARGURA = 40;

/** Monta uma linha esparsa a partir de pares [índice, valor]. */
export function linha(...pares: [number, string][]): LinhaCrua {
  const l: LinhaCrua = new Array(LARGURA).fill(null);
  for (const [i, v] of pares) l[i] = v;
  return l;
}

export const VAZIA: LinhaCrua = new Array(LARGURA).fill(null);

/** Colunas do layout B, nas posições reais da exportação. */
export const CAB_B = linha(
  [0, 'Nº FOLHA'], [5, 'NOME'],
  [11, 'ENT. 1'], [13, 'SAÍ. 1'], [15, 'ENT. 2'], [17, 'SAÍ. 2'],
  [19, 'ENT. 3'], [21, 'SAÍ. 3'],
  [23, 'NORMAIS'], [25, 'FALTAS'], [27, 'EXTRAS'], [29, 'CARGA'],
);

export interface FuncionarioFixture {
  matricula: string;
  nome: string;
  ent1?: string; sai1?: string; ent2?: string; sai2?: string;
  normais?: string; faltas?: string; extras?: string; carga?: string;
  /** Preenche TODAS as batidas com o código (como o Secullum faz). */
  afastamento?: string;
}

export function linhaFuncionarioB(f: FuncionarioFixture): LinhaCrua {
  const pares: [number, string][] = [[0, f.matricula], [5, f.nome]];
  if (f.afastamento) {
    for (const i of [11, 13, 15, 17, 19, 21]) pares.push([i, f.afastamento]);
  } else {
    if (f.ent1) pares.push([11, f.ent1]);
    if (f.sai1) pares.push([13, f.sai1]);
    if (f.ent2) pares.push([15, f.ent2]);
    if (f.sai2) pares.push([17, f.sai2]);
  }
  if (f.normais) pares.push([23, f.normais]);
  if (f.faltas) pares.push([25, f.faltas]);
  if (f.extras) pares.push([27, f.extras]);
  if (f.carga) pares.push([29, f.carga]);
  return linha(...pares);
}

export interface DepartamentoFixture {
  codigo: string;
  funcionarios: FuncionarioFixture[];
  /** SUBTOTAL do departamento. Omitido = aba sem linha de conferência. */
  subtotal?: { funcionarios: string; normais?: string; faltas?: string; extras?: string; carga?: string };
  /** Força uma quebra de página (rodapé + cabeçalho repetido) no meio do grupo. */
  quebrarApos?: number;
}

function rodapePagina(pagina: number, total: number): LinhaCrua[] {
  return [
    linha([30, 'Emitido em 23/09/2026 08:56:45']),
    VAZIA,
    linha([0, 'www.secullum.com.br'], [29, `PÁGINA ${pagina} DE ${total}`]),
    VAZIA,
    linha([8, 'Dia: 22/09/2026. Agrupado por departamentos.']),
    linha([8, 'Secullum RH | Analogicatec']),
    VAZIA,
    CAB_B,
  ];
}

export interface ArquivoBFixture {
  dia?: string;
  departamentos: DepartamentoFixture[];
  totalGeral?: { funcionarios: string; normais?: string; faltas?: string; extras?: string; carga?: string };
}

/** Planilha completa no layout B — "Ponto Diário", aba única. */
export function planilhaLayoutB(cfg: ArquivoBFixture): AbaCrua[] {
  const linhas: LinhaCrua[] = [
    linha([8, 'PONTO DIÁRIO']),
    linha([8, `Dia: ${cfg.dia ?? '22/09/2026'}. Agrupado por departamentos.`]),
    linha([8, 'Secullum RH | Analogicatec']),
    VAZIA, VAZIA, VAZIA,
  ];

  let pagina = 1;
  for (const dep of cfg.departamentos) {
    linhas.push(linha([3, dep.codigo]));
    linhas.push(linha([0, 'DEPARTAMENTO']));
    linhas.push(VAZIA, VAZIA);
    linhas.push(CAB_B);

    dep.funcionarios.forEach((f, i) => {
      linhas.push(linhaFuncionarioB(f));
      if (dep.quebrarApos !== undefined && i === dep.quebrarApos) {
        linhas.push(...rodapePagina(pagina++, 3));
      }
    });

    if (dep.subtotal) {
      const s = dep.subtotal;
      linhas.push(VAZIA);
      linhas.push(linha(
        [0, 'SUBTOTAL'], [5, s.funcionarios],
        [23, s.normais ?? ''], [25, s.faltas ?? ''], [27, s.extras ?? ''], [29, s.carga ?? ''],
      ));
    }
    linhas.push(VAZIA, VAZIA);
  }

  if (cfg.totalGeral) {
    const t = cfg.totalGeral;
    linhas.push(linha(
      [0, 'TOTAL GERAL'], [5, t.funcionarios],
      [23, t.normais ?? ''], [25, t.faltas ?? ''], [27, t.extras ?? ''], [29, t.carga ?? ''],
    ));
  }
  linhas.push(VAZIA, linha([30, 'Emitido em 23/09/2026 08:56:46']));
  linhas.push(linha([0, 'www.secullum.com.br'], [29, 'PÁGINA 3 DE 3']));

  return [{ nome: 'Page 1', linhas }];
}

// ---------------------------------------------------------------- layout A

export interface LinhaAFixture {
  data: string;
  nome: string;
  ent1?: string; sai1?: string; ent2?: string; sai2?: string;
  extras?: string;
  afastamento?: string;
}

export interface AbaAFixture {
  nome: string;
  departamento: string;
  periodo: [string, string];
  linhas: LinhaAFixture[];
  total?: string;
}

/** Planilha no layout A — "Ponto por período", uma aba por departamento. */
export function planilhaLayoutA(abas: AbaAFixture[]): AbaCrua[] {
  return abas.map((aba) => {
    const linhas: LinhaCrua[] = [
      VAZIA,
      linha([2, `Período: ${aba.periodo[0]} até ${aba.periodo[1]}. Departamento: ${aba.departamento}.`]),
      VAZIA,
      linha([0, 'DATA'], [1, 'NOME'], [3, 'ENT.1'], [4, 'SAÍ.1'], [5, 'ENT.2'], [6, 'SAÍ.2'], [7, 'EXTRAS']),
    ];
    for (const l of aba.linhas) {
      const pares: [number, string][] = [[0, l.data], [1, l.nome]];
      if (l.afastamento) {
        for (const i of [3, 4, 5, 6]) pares.push([i, l.afastamento]);
      } else {
        if (l.ent1) pares.push([3, l.ent1]);
        if (l.sai1) pares.push([4, l.sai1]);
        if (l.ent2) pares.push([5, l.ent2]);
        if (l.sai2) pares.push([6, l.sai2]);
      }
      if (l.extras) pares.push([7, l.extras]);
      linhas.push(linha(...pares));
    }
    if (aba.total) linhas.push(linha([0, 'TOTAL'], [1, String(aba.linhas.length)], [7, aba.total]));
    linhas.push(linha([0, 'www.secullum.com.br']));
    return { nome: aba.nome, linhas };
  });
}
