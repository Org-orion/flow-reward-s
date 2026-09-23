// Agregações dos relatórios e do painel — PURO.
//
// Toda seção do relatório e todo bloco do painel saem DAQUI. Nenhuma tela soma
// nada por conta própria: se o "total de horas extras" do painel e o do PDF
// pudessem ser calculados em dois lugares, um dia divergiriam.
//
// Só há contagem e soma dos valores da planilha. Nenhum percentual, média,
// projeção ou meta — por exigência expressa da política do relatório.

import { somaMin } from './tempo';
import { ehOcorrenciaAcimaDoLimite, type Faixa } from './faixas';
import type { Lancamento } from './pontoTipos';

// ---------------------------------------------------------------- datas

const NOME_DIA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const NOME_DIA_CURTO = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];

/**
 * Dia da semana de uma data ISO. Calculado sobre a data NUA (sem fuso): usar
 * `new Date('2026-09-22')` interpretaria como UTC e, no horário de Brasília,
 * devolveria o dia anterior.
 */
export function diaDaSemana(dataISO: string): number {
  const [a, m, d] = dataISO.split('-').map(Number);
  return new Date(a, m - 1, d).getDay();
}

export const nomeDiaSemana = (dataISO: string): string => NOME_DIA[diaDaSemana(dataISO)];
export const nomeDiaSemanaCurto = (dataISO: string): string => NOME_DIA_CURTO[diaDaSemana(dataISO)];
export const ehSabado = (dataISO: string): boolean => diaDaSemana(dataISO) === 6;

/** ISO → dd/mm. */
export const dataCurta = (dataISO: string): string => {
  const [, m, d] = dataISO.split('-');
  return `${d}/${m}`;
};

/** ISO → dd/mm/aaaa. */
export const dataBR = (dataISO: string): string => {
  const [a, m, d] = dataISO.split('-');
  return `${d}/${m}/${a}`;
};

// ---------------------------------------------------------------- base

const ehOcorrencia = (l: Lancamento): boolean => ehOcorrenciaAcimaDoLimite(l.faixa);

function agrupar<T>(itens: T[], chave: (i: T) => string): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const item of itens) {
    const k = chave(item);
    const lista = mapa.get(k);
    if (lista) lista.push(item);
    else mapa.set(k, [item]);
  }
  return mapa;
}

/** Contagem por faixa de um conjunto de lançamentos. */
export interface ContagemFaixas {
  verde: number; amarelo: number; vermelho: number; sem_extra: number;
}

export function contarFaixas(lancs: Lancamento[]): ContagemFaixas {
  const c: ContagemFaixas = { verde: 0, amarelo: 0, vermelho: 0, sem_extra: 0 };
  for (const l of lancs) c[l.faixa]++;
  return c;
}

// ------------------------------------------------- 01 · resumo executivo

export interface Destaque {
  extrasMin: number;
  nome: string;
  departamentoNome: string;
  data: string;
}

export interface ResumoExecutivo {
  lancamentos: number;
  funcionarios: number;
  departamentos: number;
  dias: number;
  extrasMin: number;
  ocorrencias: number;
  funcionariosAcima: number;
  extrasNasOcorrenciasMin: number;
  faixas: ContagemFaixas;
  maiorExtra: Destaque | null;
  deptoMaiorVolume: { nome: string; extrasMin: number } | null;
  deptoMaisOcorrencias: { nome: string; ocorrencias: number } | null;
  deptoMaisVermelhas: { nome: string; vermelhas: number } | null;
  diaMaisOcorrencias: { data: string; ocorrencias: number } | null;
}

export function resumoExecutivo(lancs: Lancamento[]): ResumoExecutivo {
  const ocorrencias = lancs.filter(ehOcorrencia);
  const departamentos = porDepartamento(lancs);
  const dias = porDia(lancs);

  let maior: Lancamento | null = null;
  for (const l of lancs) {
    if (l.extrasMin > 0 && (!maior || l.extrasMin > maior.extrasMin)) maior = l;
  }

  const maxPor = <T>(itens: T[], valor: (i: T) => number): T | null => {
    let melhor: T | null = null;
    for (const i of itens) {
      if (valor(i) <= 0) continue;
      if (!melhor || valor(i) > valor(melhor)) melhor = i;
    }
    return melhor;
  };

  const topVolume = maxPor(departamentos, (d) => d.extrasMin);
  const topOcorr = maxPor(departamentos, (d) => d.ocorrencias);
  const topVermelha = maxPor(departamentos, (d) => d.vermelhas);
  const topDia = maxPor(dias, (d) => d.ocorrencias);

  return {
    lancamentos: lancs.length,
    funcionarios: new Set(lancs.map((l) => l.matricula)).size,
    departamentos: departamentos.length,
    dias: dias.length,
    extrasMin: somaMin(lancs.map((l) => l.extrasMin)),
    ocorrencias: ocorrencias.length,
    funcionariosAcima: new Set(ocorrencias.map((l) => l.matricula)).size,
    extrasNasOcorrenciasMin: somaMin(ocorrencias.map((l) => l.extrasMin)),
    faixas: contarFaixas(lancs),
    maiorExtra: maior
      ? { extrasMin: maior.extrasMin, nome: maior.nome, departamentoNome: maior.departamentoNome, data: maior.data }
      : null,
    deptoMaiorVolume: topVolume ? { nome: topVolume.nome, extrasMin: topVolume.extrasMin } : null,
    deptoMaisOcorrencias: topOcorr ? { nome: topOcorr.nome, ocorrencias: topOcorr.ocorrencias } : null,
    deptoMaisVermelhas: topVermelha ? { nome: topVermelha.nome, vermelhas: topVermelha.vermelhas } : null,
    diaMaisOcorrencias: topDia ? { data: topDia.data, ocorrencias: topDia.ocorrencias } : null,
  };
}

// ------------------------------------------- 03 · consolidado por departamento

export interface LinhaDepartamento {
  codigo: string;
  nome: string;
  funcionarios: number;
  lancamentos: number;
  extrasMin: number;
  semExtra: number;
  verdes: number;
  amarelas: number;
  vermelhas: number;
  ocorrencias: number;
  funcionariosAcima: number;
  extrasNasOcorrenciasMin: number;
}

/** Ordenado pelo volume de horas extras — quem mais pesa aparece primeiro. */
export function porDepartamento(lancs: Lancamento[]): LinhaDepartamento[] {
  const linhas: LinhaDepartamento[] = [];
  for (const [codigo, itens] of agrupar(lancs, (l) => l.departamentoCodigo)) {
    const ocorrencias = itens.filter(ehOcorrencia);
    const faixas = contarFaixas(itens);
    linhas.push({
      codigo,
      nome: itens[0].departamentoNome,
      funcionarios: new Set(itens.map((l) => l.matricula)).size,
      lancamentos: itens.length,
      extrasMin: somaMin(itens.map((l) => l.extrasMin)),
      semExtra: faixas.sem_extra,
      verdes: faixas.verde,
      amarelas: faixas.amarelo,
      vermelhas: faixas.vermelho,
      ocorrencias: ocorrencias.length,
      funcionariosAcima: new Set(ocorrencias.map((l) => l.matricula)).size,
      extrasNasOcorrenciasMin: somaMin(ocorrencias.map((l) => l.extrasMin)),
    });
  }
  return linhas.sort((a, b) => b.extrasMin - a.extrasMin || a.nome.localeCompare(b.nome, 'pt-BR'));
}

// ------------------------------------------------- 04 · horas extras por dia

export interface LinhaDia {
  data: string;
  diaSemana: string;
  lancamentosComExtra: number;
  extrasMin: number;
  ocorrencias: number;
  extrasNasOcorrenciasMin: number;
  vermelhas: number;
}

export function porDia(lancs: Lancamento[]): LinhaDia[] {
  const linhas: LinhaDia[] = [];
  for (const [data, itens] of agrupar(lancs, (l) => l.data)) {
    const ocorrencias = itens.filter(ehOcorrencia);
    linhas.push({
      data,
      diaSemana: nomeDiaSemana(data),
      lancamentosComExtra: itens.filter((l) => l.extrasMin > 0).length,
      extrasMin: somaMin(itens.map((l) => l.extrasMin)),
      ocorrencias: ocorrencias.length,
      extrasNasOcorrenciasMin: somaMin(ocorrencias.map((l) => l.extrasMin)),
      vermelhas: itens.filter((l) => l.faixa === 'vermelho').length,
    });
  }
  return linhas.sort((a, b) => a.data.localeCompare(b.data));
}

// ------------------------------------------ 05 · matriz departamento × dia

export interface CelulaMatriz {
  ocorrencias: number;
  extrasMin: number;
  /** Há ao menos uma ocorrência na faixa vermelha — a célula sai destacada. */
  temVermelha: boolean;
}

export interface MatrizDeptoDia {
  dias: string[];
  departamentos: { codigo: string; nome: string; totalOcorrencias: number; totalExtrasMin: number }[];
  /** Chave `codigoDepartamento|data`. Ausente = nenhuma ocorrência naquele cruzamento. */
  celulas: Map<string, CelulaMatriz>;
  totalOcorrencias: number;
  totalExtrasMin: number;
}

export function matrizDepartamentoDia(lancs: Lancamento[]): MatrizDeptoDia {
  const ocorrencias = lancs.filter(ehOcorrencia);
  const celulas = new Map<string, CelulaMatriz>();

  for (const l of ocorrencias) {
    const chave = `${l.departamentoCodigo}|${l.data}`;
    const atual = celulas.get(chave) ?? { ocorrencias: 0, extrasMin: 0, temVermelha: false };
    atual.ocorrencias++;
    atual.extrasMin += l.extrasMin;
    if (l.faixa === 'vermelho') atual.temVermelha = true;
    celulas.set(chave, atual);
  }

  const deps = porDepartamento(lancs);
  return {
    dias: porDia(lancs).map((d) => d.data),
    departamentos: deps.map((d) => ({
      codigo: d.codigo,
      nome: d.nome,
      totalOcorrencias: d.ocorrencias,
      totalExtrasMin: d.extrasNasOcorrenciasMin,
    })),
    celulas,
    totalOcorrencias: ocorrencias.length,
    totalExtrasMin: somaMin(ocorrencias.map((l) => l.extrasMin)),
  };
}

// ------------------------------------------------- 06 · ranking por funcionário

export interface LinhaRanking {
  posicao: number;
  matricula: string;
  nome: string;
  departamentoNome: string;
  ocorrencias: number;
  amarelas: number;
  vermelhas: number;
  extrasNasOcorrenciasMin: number;
  maiorExtraMin: number;
  diaDoMaior: string;
}

/** Só quem teve ocorrência acima do limite. Ordenado pelas horas acumuladas. */
export function rankingFuncionarios(lancs: Lancamento[]): LinhaRanking[] {
  const ocorrencias = lancs.filter(ehOcorrencia);
  const linhas: Omit<LinhaRanking, 'posicao'>[] = [];

  for (const [matricula, itens] of agrupar(ocorrencias, (l) => l.matricula)) {
    const maior = itens.reduce((a, b) => (b.extrasMin > a.extrasMin ? b : a));
    const ultimo = itens[itens.length - 1];
    linhas.push({
      matricula,
      nome: ultimo.nome,
      departamentoNome: ultimo.departamentoNome,
      ocorrencias: itens.length,
      amarelas: itens.filter((l) => l.faixa === 'amarelo').length,
      vermelhas: itens.filter((l) => l.faixa === 'vermelho').length,
      extrasNasOcorrenciasMin: somaMin(itens.map((l) => l.extrasMin)),
      maiorExtraMin: maior.extrasMin,
      diaDoMaior: maior.data,
    });
  }

  return linhas
    .sort((a, b) =>
      b.extrasNasOcorrenciasMin - a.extrasNasOcorrenciasMin
      || b.maiorExtraMin - a.maiorExtraMin
      || a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((l, i) => ({ posicao: i + 1, ...l }));
}

// -------------------------------------- 07 · detalhamento das ocorrências

export interface DetalheDia {
  data: string;
  diaSemana: string;
  extrasMin: number;
  itens: Lancamento[];
}

export interface DetalheDepartamento {
  codigo: string;
  nome: string;
  ocorrencias: number;
  extrasMin: number;
  funcionarios: number;
  /** Alguma linha do grupo usa o terceiro par de batidas? */
  temTerceiroPar: boolean;
  dias: DetalheDia[];
}

/** Por departamento → dia → funcionário, do maior extra para o menor. */
export function detalheOcorrencias(lancs: Lancamento[]): DetalheDepartamento[] {
  const ocorrencias = lancs.filter(ehOcorrencia);
  const grupos: DetalheDepartamento[] = [];

  for (const [codigo, itens] of agrupar(ocorrencias, (l) => l.departamentoCodigo)) {
    const dias: DetalheDia[] = [];
    for (const [data, doDia] of agrupar(itens, (l) => l.data)) {
      dias.push({
        data,
        diaSemana: nomeDiaSemana(data),
        extrasMin: somaMin(doDia.map((l) => l.extrasMin)),
        itens: [...doDia].sort((a, b) => b.extrasMin - a.extrasMin || a.nome.localeCompare(b.nome, 'pt-BR')),
      });
    }
    grupos.push({
      codigo,
      nome: itens[0].departamentoNome,
      ocorrencias: itens.length,
      extrasMin: somaMin(itens.map((l) => l.extrasMin)),
      funcionarios: new Set(itens.map((l) => l.matricula)).size,
      temTerceiroPar: itens.some((l) => !!l.ent3 || !!l.sai3),
      dias: dias.sort((a, b) => a.data.localeCompare(b.data)),
    });
  }

  return grupos.sort((a, b) => b.extrasMin - a.extrasMin || a.nome.localeCompare(b.nome, 'pt-BR'));
}

// ---------------------------------------------- 08 · anexo funcionário × dia

export interface LinhaAnexo {
  matricula: string;
  nome: string;
  /** Chave = data ISO. Ausente = funcionário não tem lançamento naquele dia. */
  porDia: Map<string, Lancamento>;
  totalMin: number;
  ocorrencias: number;
}

export interface BlocoAnexo {
  codigo: string;
  nome: string;
  funcionarios: number;
  extrasMin: number;
  ocorrencias: number;
  dias: string[];
  linhas: LinhaAnexo[];
  totaisPorDia: Map<string, number>;
}

/** Quadro completo: todo lançamento do período, inclusive sem extra. */
export function anexoQuadroCompleto(lancs: Lancamento[]): BlocoAnexo[] {
  const dias = porDia(lancs).map((d) => d.data);
  const blocos: BlocoAnexo[] = [];

  for (const [codigo, itens] of agrupar(lancs, (l) => l.departamentoCodigo)) {
    const linhas: LinhaAnexo[] = [];
    for (const [matricula, doFuncionario] of agrupar(itens, (l) => l.matricula)) {
      const ultimo = doFuncionario[doFuncionario.length - 1];
      linhas.push({
        matricula,
        nome: ultimo.nome,
        porDia: new Map(doFuncionario.map((l) => [l.data, l])),
        totalMin: somaMin(doFuncionario.map((l) => l.extrasMin)),
        ocorrencias: doFuncionario.filter(ehOcorrencia).length,
      });
    }

    const totaisPorDia = new Map<string, number>();
    for (const l of itens) totaisPorDia.set(l.data, (totaisPorDia.get(l.data) ?? 0) + l.extrasMin);

    blocos.push({
      codigo,
      nome: itens[0].departamentoNome,
      funcionarios: linhas.length,
      extrasMin: somaMin(itens.map((l) => l.extrasMin)),
      ocorrencias: itens.filter(ehOcorrencia).length,
      dias,
      linhas: linhas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      totaisPorDia,
    });
  }

  return blocos.sort((a, b) => b.extrasMin - a.extrasMin || a.nome.localeCompare(b.nome, 'pt-BR'));
}

// ---------------------------------------------------------------- coerência

/**
 * Invariantes que TODO conjunto agregado precisa respeitar. Usado nos testes e
 * disponível para conferência em tela: um relatório que fere qualquer uma
 * destas linhas está errado, mesmo que pareça plausível.
 */
export function invariantesViolados(lancs: Lancamento[]): string[] {
  const erros: string[] = [];
  const faixas = contarFaixas(lancs);
  const somaFaixas = faixas.verde + faixas.amarelo + faixas.vermelho + faixas.sem_extra;
  if (somaFaixas !== lancs.length) {
    erros.push(`A soma das faixas (${somaFaixas}) não bate com o total de lançamentos (${lancs.length}).`);
  }

  const total = somaMin(lancs.map((l) => l.extrasMin));
  const nasOcorrencias = somaMin(lancs.filter(ehOcorrencia).map((l) => l.extrasMin));
  if (nasOcorrencias > total) {
    erros.push('As horas das ocorrências acima do limite superaram o total de horas extras.');
  }

  // Amarra que independe dos limites configurados: "sem extra" e "tem extra"
  // não podem trocar de lado, quaisquer que sejam as faixas do administrador.
  for (const l of lancs) {
    const semExtra = l.faixa === 'sem_extra';
    if (semExtra !== (l.extrasMin <= 0)) {
      erros.push(`Faixa incompatível com o valor gravado: ${l.nome} em ${l.data} está como "${l.faixa}" com ${l.extrasMin} minutos.`);
    }
  }

  const vistos = new Set<string>();
  for (const l of lancs) {
    const chave = `${l.matricula}|${l.data}`;
    if (vistos.has(chave)) erros.push(`Funcionário duplicado no mesmo dia: ${l.nome} em ${l.data}.`);
    vistos.add(chave);
  }
  return erros;
}

export type { Faixa };
