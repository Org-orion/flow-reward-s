// Leitura do ponto exportado do Secullum — PURO (recebe células, não arquivos).
//
// Dois layouts convivem hoje e o parser identifica qual é PELO CONTEÚDO, nunca
// pelo nome do arquivo:
//   A — "Ponto por período": uma aba por departamento, cabeçalho com
//       "Período: dd/mm/aaaa até dd/mm/aaaa. Departamento: X."
//   B — "Ponto Diário": aba única, cabeçalho "Dia: dd/mm/aaaa.", agrupada por
//       departamento, com o cabeçalho de colunas repetido a cada quebra de
//       página e o departamento NÃO repetido.
//
// As posições das colunas são APRENDIDAS do cabeçalho, não fixadas em índice:
// uma coluna a mais na exportação não pode quebrar a importação em silêncio.

import { parseHoraMin, parseHoraMinOuZero } from './tempo';
import { rotuloAfastamento, SEM_REGISTRO } from './afastamentos';
import { departamentoConhecido, rotuloDepartamento } from './departamentos';
import {
  ErroImportacao,
  type AbaCrua, type ArquivoPonto, type LancamentoBruto, type LayoutPonto,
  type LinhaCrua, type SubtotalArquivo, type TotalArquivo,
} from './pontoTipos';

// ---------------------------------------------------------------- utilidades

const txt = (c: unknown): string => String(c ?? '').trim();

/** Normaliza rótulo de cabeçalho: sem acento, sem pontuação, sem espaço. */
function chaveCabecalho(valor: unknown): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
}

const linhaVazia = (l: LinhaCrua | undefined): boolean =>
  !l || l.every((c) => txt(c) === '');

/** dd/mm/aaaa → ISO. Devolve null quando não é uma data completa. */
export function dataBRparaISO(valor: unknown): string | null {
  const m = txt(valor).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const [, d, mes, a] = m;
  const dia = Number(d), mm = Number(mes);
  if (mm < 1 || mm > 12 || dia < 1 || dia > 31) return null;
  return `${a}-${mes}-${d}`;
}

/** Matrícula válida = só dígitos, de qualquer comprimento (há de 4 a 22). */
export function ehMatricula(valor: unknown): boolean {
  const s = txt(valor);
  return s.length > 0 && /^\d+$/.test(s);
}

/** Rótulos de linha que NUNCA são dados. */
const RUIDO = /^(DEPARTAMENTO|SUBTOTAL|TOTAL|PAGINA|PÁGINA|NOME)\b/i;

function ehLinhaDeRuido(primeira: string): boolean {
  if (!primeira) return false;
  if (RUIDO.test(primeira)) return true;
  return /^(www\.|http)/i.test(primeira) || /^Emitido em/i.test(primeira);
}

// ---------------------------------------------------------------- cabeçalho

/** Índice de cada coluna conhecida, aprendido da linha de cabeçalho. */
export interface MapaColunas {
  matricula?: number; data?: number; nome?: number;
  ent1?: number; sai1?: number; ent2?: number; sai2?: number; ent3?: number; sai3?: number;
  normais?: number; faltas?: number; extras?: number; carga?: number;
}

const ALIAS: Record<string, keyof MapaColunas> = {
  NFOLHA: 'matricula', NOFOLHA: 'matricula', MATRICULA: 'matricula', FOLHA: 'matricula',
  DATA: 'data', NOME: 'nome',
  ENT1: 'ent1', SAI1: 'sai1', ENT2: 'ent2', SAI2: 'sai2', ENT3: 'ent3', SAI3: 'sai3',
  NORMAIS: 'normais', FALTAS: 'faltas', EXTRAS: 'extras', CARGA: 'carga',
};

/** Lê uma linha de cabeçalho. Devolve null quando a linha não é cabeçalho. */
export function lerCabecalho(linha: LinhaCrua): MapaColunas | null {
  const mapa: MapaColunas = {};
  let achou = 0;
  for (let i = 0; i < linha.length; i++) {
    const campo = ALIAS[chaveCabecalho(linha[i])];
    if (campo && mapa[campo] === undefined) {
      mapa[campo] = i;
      achou++;
    }
  }
  // Cabeçalho de verdade tem nome + extras + a identificação da linha.
  const valido = mapa.nome !== undefined && mapa.extras !== undefined
    && (mapa.matricula !== undefined || mapa.data !== undefined);
  return valido && achou >= 4 ? mapa : null;
}

// ---------------------------------------------------------------- batidas

interface Batidas {
  ent1: string | null; sai1: string | null;
  ent2: string | null; sai2: string | null;
  ent3: string | null; sai3: string | null;
  statusAfastamento: string | null;
}

/**
 * Separa horas de códigos de afastamento. O Secullum repete o mesmo código em
 * todas as batidas do dia, então o status é o primeiro código encontrado.
 * Nenhuma batida e nenhum código = SEM REGISTRO (informação, não erro).
 */
function lerBatidas(linha: LinhaCrua, col: MapaColunas): Batidas {
  const campos = ['ent1', 'sai1', 'ent2', 'sai2', 'ent3', 'sai3'] as const;
  const saida: Batidas = {
    ent1: null, sai1: null, ent2: null, sai2: null, ent3: null, sai3: null,
    statusAfastamento: null,
  };
  let temHora = false;
  let codigo: string | null = null;

  for (const campo of campos) {
    const idx = col[campo];
    if (idx === undefined) continue;
    const bruto = txt(linha[idx]);
    if (!bruto) continue;
    if (parseHoraMin(bruto) !== null) {
      saida[campo] = bruto;
      temHora = true;
    } else if (!codigo) {
      codigo = rotuloAfastamento(bruto);
    }
  }

  if (codigo) saida.statusAfastamento = codigo;
  else if (!temHora) saida.statusAfastamento = SEM_REGISTRO;
  return saida;
}

// ---------------------------------------------------------------- totais

function lerTotais(linha: LinhaCrua, col: MapaColunas) {
  return {
    normaisMin: parseHoraMinOuZero(col.normais !== undefined ? linha[col.normais] : null),
    faltasMin: parseHoraMinOuZero(col.faltas !== undefined ? linha[col.faltas] : null),
    extrasMin: parseHoraMinOuZero(col.extras !== undefined ? linha[col.extras] : null),
    cargaMin: parseHoraMinOuZero(col.carga !== undefined ? linha[col.carga] : null),
  };
}

/** Contagem de funcionários da linha SUBTOTAL/TOTAL (fica sob a coluna NOME). */
function lerContagem(linha: LinhaCrua, col: MapaColunas): number | null {
  if (col.nome === undefined) return null;
  const v = txt(linha[col.nome]);
  return /^\d+$/.test(v) ? Number(v) : null;
}

// ---------------------------------------------------------------- detecção

/** Identifica o layout pelo conteúdo. Lança quando não reconhece nenhum. */
export function detectarLayout(abas: AbaCrua[]): LayoutPonto {
  let temDia = false;
  let temPeriodo = false;
  for (const aba of abas) {
    for (const linha of aba.linhas.slice(0, 12)) {
      for (const cel of linha) {
        const s = txt(cel);
        if (/^Dia:\s*\d{2}\/\d{2}\/\d{4}/i.test(s)) temDia = true;
        if (/Per[ií]odo:\s*\d{2}\/\d{2}\/\d{4}/i.test(s)) temPeriodo = true;
      }
    }
  }
  if (temPeriodo) return 'A';
  if (temDia) return 'B';
  throw new ErroImportacao(
    'Não foi possível reconhecer o formato do arquivo. Confira se a exportação do Secullum foi feita pelo relatório "Ponto Diário" ou "Ponto por período".',
  );
}

// ---------------------------------------------------------------- layout B

/** Nome do departamento: fica na linha ANTERIOR à palavra DEPARTAMENTO. */
function departamentoAcimaDe(linhas: LinhaCrua[], i: number): string | null {
  for (let k = i - 1; k >= 0 && k >= i - 4; k--) {
    if (linhaVazia(linhas[k])) continue;
    const valores = (linhas[k] ?? []).map(txt).filter(Boolean);
    return valores.length === 1 ? valores[0] : null;
  }
  return null;
}

function parseLayoutB(aba: AbaCrua): ArquivoPonto {
  const linhas = aba.linhas;
  let data: string | null = null;
  for (const linha of linhas.slice(0, 10)) {
    for (const cel of linha) {
      const m = txt(cel).match(/^Dia:\s*(\d{2}\/\d{2}\/\d{4})/i);
      if (m) { data = dataBRparaISO(m[1]); break; }
    }
    if (data) break;
  }
  if (!data) {
    throw new ErroImportacao(
      'O arquivo não informa a data de referência. Procure a linha "Dia: dd/mm/aaaa" no topo da exportação.',
    );
  }

  let col: MapaColunas | null = null;
  let departamentoAtual = '';
  const lancamentos: LancamentoBruto[] = [];
  const subtotais: SubtotalArquivo[] = [];
  const departamentos: string[] = [];
  let totalGeral: TotalArquivo | null = null;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i] ?? [];
    if (linhaVazia(linha)) continue;
    const primeira = txt(linha.find((c) => txt(c) !== ''));
    const col0 = txt(linha[0]).toUpperCase();

    if (col0 === 'DEPARTAMENTO') {
      const nome = departamentoAcimaDe(linhas, i);
      if (nome) {
        departamentoAtual = nome;
        if (!departamentos.includes(nome)) departamentos.push(nome);
      }
      continue;
    }

    const cab = lerCabecalho(linha);
    if (cab) { col = cab; continue; }        // repete a cada quebra de página

    if (col && col0 === 'SUBTOTAL') {
      subtotais.push({
        departamentoCodigo: departamentoAtual,
        funcionarios: lerContagem(linha, col),
        ...lerTotais(linha, col),
      });
      continue;
    }
    if (col && /^TOTAL GERAL/.test(col0)) {
      totalGeral = { funcionarios: lerContagem(linha, col), ...lerTotais(linha, col) };
      continue;
    }
    if (ehLinhaDeRuido(primeira)) continue;
    if (!col) continue;

    const matricula = txt(linha[col.matricula ?? 0]);
    const nome = txt(linha[col.nome ?? 1]);
    if (!ehMatricula(matricula) || !nome) continue;

    lancamentos.push({
      matricula,
      nome,
      departamentoCodigo: departamentoAtual,
      data,
      ...lerBatidas(linha, col),
      ...lerTotais(linha, col),
      linha: i + 1,
    });
  }

  if (lancamentos.length === 0) {
    throw new ErroImportacao(
      'Nenhum registro de ponto foi encontrado no arquivo. Confira se a exportação não veio vazia.',
    );
  }

  return {
    layout: 'B',
    dataInicio: data,
    dataFim: data,
    lancamentos,
    subtotais,
    totalGeral,
    departamentos,
    avisos: avisosDeDepartamento(departamentos),
  };
}

// ---------------------------------------------------------------- layout A

/**
 * Uma aba por departamento. O departamento vem do cabeçalho da própria aba;
 * quando falta, sobra o nome da aba — e isso vira aviso, porque o nome da aba é
 * abreviado ("Fabrica 01") e não concilia com o código usado no sistema.
 */
function parseLayoutA(abas: AbaCrua[]): ArquivoPonto {
  const lancamentos: LancamentoBruto[] = [];
  const subtotais: SubtotalArquivo[] = [];
  const departamentos: string[] = [];
  const avisos: string[] = [];
  let inicio: string | null = null;
  let fim: string | null = null;

  for (const aba of abas) {
    const linhas = aba.linhas;
    let departamento = '';
    for (const linha of linhas.slice(0, 8)) {
      for (const cel of linha) {
        const s = txt(cel);
        const mp = s.match(/Per[ií]odo:\s*(\d{2}\/\d{2}\/\d{4})\s*at[ée]\s*(\d{2}\/\d{2}\/\d{4})/i);
        if (mp) {
          const a = dataBRparaISO(mp[1]);
          const b = dataBRparaISO(mp[2]);
          if (a && (!inicio || a < inicio)) inicio = a;
          if (b && (!fim || b > fim)) fim = b;
        }
        const md = s.match(/Departamento:\s*([^.]+)\.?/i);
        if (md) departamento = md[1].trim();
      }
    }
    if (!departamento) {
      departamento = aba.nome.trim();
      avisos.push(`A aba "${aba.nome}" não informa o departamento no cabeçalho; foi usado o nome da aba.`);
    }
    if (!departamentos.includes(departamento)) departamentos.push(departamento);

    let col: MapaColunas | null = null;
    let totalDaAba: SubtotalArquivo | null = null;

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i] ?? [];
      if (linhaVazia(linha)) continue;
      const col0 = txt(linha[0]);

      const cab = lerCabecalho(linha);
      if (cab) { col = cab; continue; }

      if (col && /^(SUBTOTAL|TOTAL)\b/i.test(col0)) {
        totalDaAba = {
          departamentoCodigo: departamento,
          funcionarios: lerContagem(linha, col),
          ...lerTotais(linha, col),
        };
        continue;
      }
      if (ehLinhaDeRuido(col0) || !col) continue;

      const dataISO = dataBRparaISO(col.data !== undefined ? linha[col.data] : null);
      const nome = txt(linha[col.nome ?? 1]);
      if (!dataISO || !nome) continue;
      if (!inicio || dataISO < inicio) inicio = dataISO;
      if (!fim || dataISO > fim) fim = dataISO;

      // Sem coluna de matrícula neste layout, a identidade do funcionário é o
      // par departamento+nome. É a única chave disponível no arquivo.
      const matricula = col.matricula !== undefined ? txt(linha[col.matricula]) : '';

      lancamentos.push({
        matricula: matricula || `${departamento}|${nome}`,
        nome,
        departamentoCodigo: departamento,
        data: dataISO,
        ...lerBatidas(linha, col),
        ...lerTotais(linha, col),
        linha: i + 1,
      });
    }

    if (totalDaAba) subtotais.push(totalDaAba);
  }

  if (!inicio || !fim) {
    throw new ErroImportacao(
      'O arquivo não informa o período. Procure a linha "Período: dd/mm/aaaa até dd/mm/aaaa" no topo de cada aba.',
    );
  }
  if (lancamentos.length === 0) {
    throw new ErroImportacao('Nenhum registro de ponto foi encontrado no arquivo.');
  }

  return {
    layout: 'A',
    dataInicio: inicio,
    dataFim: fim,
    lancamentos,
    subtotais,
    totalGeral: null,
    departamentos,
    avisos: [...avisos, ...avisosDeDepartamento(departamentos)],
  };
}

function avisosDeDepartamento(codigos: string[]): string[] {
  return codigos
    .filter((c) => c && !departamentoConhecido(c))
    .map((c) => `Departamento novo no arquivo: "${c}". Foi criado com o nome bruto — ajuste o rótulo em Configurações.`);
}

// ---------------------------------------------------------------- entrada

/**
 * Mesma matrícula duas vezes no mesmo dia: o banco recusaria (chave única), e
 * silenciar isso descartaria um lançamento sem ninguém notar.
 */
function avisosDeMatriculaRepetida(lancamentos: LancamentoBruto[]): string[] {
  const vistos = new Set<string>();
  const repetidos = new Set<string>();
  for (const l of lancamentos) {
    const chave = `${l.matricula}|${l.data}`;
    if (vistos.has(chave)) repetidos.add(`${l.nome} (matrícula ${l.matricula}) em ${l.data}`);
    vistos.add(chave);
  }
  return [...repetidos].map((r) => `Matrícula repetida no mesmo dia: ${r}.`);
}

/** Lê a planilha inteira e devolve os dados do arquivo. Lança ErroImportacao. */
export function lerArquivoPonto(abas: AbaCrua[]): ArquivoPonto {
  if (!abas.length) throw new ErroImportacao('A planilha não tem nenhuma aba com dados.');
  const layout = detectarLayout(abas);
  const arquivo = layout === 'B' ? parseLayoutB(abas[0]) : parseLayoutA(abas);
  return {
    ...arquivo,
    avisos: [...arquivo.avisos, ...avisosDeMatriculaRepetida(arquivo.lancamentos)],
  };
}

/** Rótulo de exibição do departamento — reexportado para conveniência da tela. */
export { rotuloDepartamento };
