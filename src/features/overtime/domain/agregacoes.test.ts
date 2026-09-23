import { describe, it, expect } from 'vitest';
import {
  anexoQuadroCompleto, contarFaixas, dataBR, dataCurta, detalheOcorrencias, diaDaSemana,
  ehSabado, invariantesViolados, matrizDepartamentoDia, nomeDiaSemana, porDepartamento,
  porDia, rankingFuncionarios, resumoExecutivo,
} from './agregacoes';
import { classificarFaixa } from './faixas';
import { parseHoraMin, formatMin } from './tempo';
import type { Lancamento } from './pontoTipos';

let seq = 0;

/** Lançamento de teste — a faixa é sempre derivada do extra, como em produção. */
function lanc(
  nome: string, dep: string, data: string, extras: string,
  extra: Partial<Lancamento> = {},
): Lancamento {
  const extrasMin = parseHoraMin(extras) ?? 0;
  return {
    matricula: extra.matricula ?? `M${nome}`,
    nome,
    departamentoCodigo: dep,
    departamentoNome: dep === 'FABRICA 1' ? 'Fábrica 1' : dep === 'MOVEIS' ? 'Fábrica de Móveis' : 'Viveiro',
    data,
    ent1: '07:00', sai1: '12:00', ent2: '13:00', sai2: '18:00', ent3: null, sai3: null,
    statusAfastamento: null,
    normaisMin: 528, faltasMin: 0, extrasMin, cargaMin: 528,
    faixa: classificarFaixa(extrasMin),
    id: `id-${seq++}`,
    ...extra,
  };
}

// 22/09/2026 é terça; 26/09 é sábado.
const DADOS: Lancamento[] = [
  lanc('ALEX', 'FABRICA 1', '2026-09-22', '03:12'),         // vermelho
  lanc('IURI', 'FABRICA 1', '2026-09-22', '02:30'),         // amarelo
  lanc('HEBERT', 'FABRICA 1', '2026-09-22', '01:00'),       // verde
  lanc('CLARA', 'FABRICA 1', '2026-09-22', '00:00', { statusAfastamento: 'FALTA' }),
  lanc('DIEGO', 'MOVEIS', '2026-09-22', '02:19'),           // amarelo
  lanc('ALEX', 'FABRICA 1', '2026-09-26', '02:45'),         // vermelho, sábado
  lanc('IURI', 'FABRICA 1', '2026-09-26', '00:30'),         // verde
  lanc('SARA', 'VIVEIRO', '2026-09-26', '00:00'),           // sem extra
];

describe('datas sem fuso', () => {
  // `new Date('2026-09-22')` é interpretado como UTC e, em Brasília, volta para
  // o dia 21. O relatório sairia com o dia da semana errado.
  it('dia da semana é calculado sobre a data nua', () => {
    expect(diaDaSemana('2026-09-22')).toBe(2);
    expect(nomeDiaSemana('2026-09-22')).toBe('terça');
    expect(ehSabado('2026-09-26')).toBe(true);
    expect(ehSabado('2026-09-22')).toBe(false);
  });

  it('formata data brasileira', () => {
    expect(dataBR('2026-09-22')).toBe('22/09/2026');
    expect(dataCurta('2026-09-22')).toBe('22/09');
  });
});

describe('contagem de faixas', () => {
  it('cada lançamento cai em exatamente uma faixa', () => {
    expect(contarFaixas(DADOS)).toEqual({ verde: 2, amarelo: 2, vermelho: 2, sem_extra: 2 });
  });

  it('a soma das faixas é o total de lançamentos', () => {
    const c = contarFaixas(DADOS);
    expect(c.verde + c.amarelo + c.vermelho + c.sem_extra).toBe(DADOS.length);
  });
});

describe('resumo executivo', () => {
  const r = resumoExecutivo(DADOS);

  it('conta lançamentos, funcionários, departamentos e dias', () => {
    expect(r.lancamentos).toBe(8);
    expect(r.funcionarios).toBe(6);      // ALEX e IURI aparecem em 2 dias
    expect(r.departamentos).toBe(3);
    expect(r.dias).toBe(2);
  });

  it('total de horas extras é a soma da coluna EXTRAS', () => {
    expect(formatMin(r.extrasMin)).toBe('12:16');
  });

  it('ocorrências acima do limite somam amarelo e vermelho', () => {
    expect(r.ocorrencias).toBe(4);
    expect(r.funcionariosAcima).toBe(3);   // ALEX (2 dias), IURI, DIEGO
    expect(formatMin(r.extrasNasOcorrenciasMin)).toBe('10:46');
  });

  it('as horas das ocorrências nunca superam o total', () => {
    expect(r.extrasNasOcorrenciasMin).toBeLessThanOrEqual(r.extrasMin);
  });

  it('aponta o maior extra com nome, departamento e dia', () => {
    expect(r.maiorExtra).toMatchObject({ nome: 'ALEX', departamentoNome: 'Fábrica 1', data: '2026-09-22' });
    expect(formatMin(r.maiorExtra!.extrasMin)).toBe('03:12');
  });

  it('aponta os departamentos e o dia de destaque', () => {
    expect(r.deptoMaiorVolume).toMatchObject({ nome: 'Fábrica 1' });
    expect(r.deptoMaisOcorrencias).toMatchObject({ nome: 'Fábrica 1', ocorrencias: 3 });
    expect(r.deptoMaisVermelhas).toMatchObject({ nome: 'Fábrica 1', vermelhas: 2 });
    expect(r.diaMaisOcorrencias).toMatchObject({ data: '2026-09-22', ocorrencias: 3 });
  });

  it('conjunto vazio não quebra nem inventa destaque', () => {
    const v = resumoExecutivo([]);
    expect(v.lancamentos).toBe(0);
    expect(v.extrasMin).toBe(0);
    expect(v.maiorExtra).toBeNull();
    expect(v.deptoMaiorVolume).toBeNull();
  });
});

describe('consolidado por departamento', () => {
  const linhas = porDepartamento(DADOS);

  it('ordena pelo volume de horas extras', () => {
    expect(linhas.map((l) => l.codigo)).toEqual(['FABRICA 1', 'MOVEIS', 'VIVEIRO']);
  });

  it('funcionários são distintos, lançamentos não', () => {
    const f1 = linhas[0];
    expect(f1.lancamentos).toBe(6);
    expect(f1.funcionarios).toBe(4);     // ALEX, IURI, HEBERT, CLARA
  });

  it('reparte as faixas sem perder lançamento', () => {
    for (const l of linhas) {
      expect(l.semExtra + l.verdes + l.amarelas + l.vermelhas).toBe(l.lancamentos);
      expect(l.ocorrencias).toBe(l.amarelas + l.vermelhas);
    }
  });

  it('a soma dos departamentos reconstrói o total geral', () => {
    const total = linhas.reduce((s, l) => s + l.extrasMin, 0);
    expect(total).toBe(resumoExecutivo(DADOS).extrasMin);
  });
});

describe('horas extras por dia', () => {
  const dias = porDia(DADOS);

  it('ordena cronologicamente e traz o dia da semana', () => {
    expect(dias.map((d) => d.data)).toEqual(['2026-09-22', '2026-09-26']);
    expect(dias[1].diaSemana).toBe('sábado');
  });

  it('conta apenas lançamentos COM extra na coluna própria', () => {
    expect(dias[0].lancamentosComExtra).toBe(4);   // CLARA está de falta
    expect(dias[1].lancamentosComExtra).toBe(2);   // SARA está zerada
  });

  it('separa a faixa vermelha do dia', () => {
    expect(dias[0].vermelhas).toBe(1);
    expect(dias[1].vermelhas).toBe(1);
  });
});

describe('matriz departamento × dia', () => {
  const m = matrizDepartamentoDia(DADOS);

  it('só cruza ocorrências acima do limite', () => {
    expect(m.totalOcorrencias).toBe(4);
    expect(m.celulas.get('FABRICA 1|2026-09-22')).toMatchObject({ ocorrencias: 2, temVermelha: true });
    expect(m.celulas.get('MOVEIS|2026-09-22')).toMatchObject({ ocorrencias: 1, temVermelha: false });
  });

  it('cruzamento sem ocorrência simplesmente não tem célula', () => {
    expect(m.celulas.get('VIVEIRO|2026-09-26')).toBeUndefined();
    expect(m.celulas.get('MOVEIS|2026-09-26')).toBeUndefined();
  });

  it('a soma das células reconstrói o total da matriz', () => {
    let ocorr = 0;
    let min = 0;
    for (const c of m.celulas.values()) { ocorr += c.ocorrencias; min += c.extrasMin; }
    expect(ocorr).toBe(m.totalOcorrencias);
    expect(min).toBe(m.totalExtrasMin);
  });
});

describe('ranking de funcionários', () => {
  const r = rankingFuncionarios(DADOS);

  it('inclui só quem ultrapassou o limite', () => {
    expect(r.map((l) => l.nome)).toEqual(['ALEX', 'IURI', 'DIEGO']);
  });

  it('acumula as ocorrências do mesmo funcionário em dias diferentes', () => {
    const alex = r[0];
    expect(alex.ocorrencias).toBe(2);
    expect(alex.vermelhas).toBe(2);
    expect(formatMin(alex.extrasNasOcorrenciasMin)).toBe('05:57');
    expect(formatMin(alex.maiorExtraMin)).toBe('03:12');
    expect(alex.diaDoMaior).toBe('2026-09-22');
  });

  it('ordena pelas horas acumuladas e numera a partir de 1', () => {
    expect(r.map((l) => l.posicao)).toEqual([1, 2, 3]);
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1].extrasNasOcorrenciasMin).toBeGreaterThanOrEqual(r[i].extrasNasOcorrenciasMin);
    }
  });

  it('o total do ranking é igual às horas nas ocorrências do resumo', () => {
    const soma = r.reduce((s, l) => s + l.extrasNasOcorrenciasMin, 0);
    expect(soma).toBe(resumoExecutivo(DADOS).extrasNasOcorrenciasMin);
  });
});

describe('detalhamento das ocorrências', () => {
  const grupos = detalheOcorrencias(DADOS);

  it('agrupa por departamento e depois por dia', () => {
    expect(grupos.map((g) => g.codigo)).toEqual(['FABRICA 1', 'MOVEIS']);
    expect(grupos[0].dias.map((d) => d.data)).toEqual(['2026-09-22', '2026-09-26']);
  });

  it('dentro do dia, do maior extra para o menor', () => {
    const itens = grupos[0].dias[0].itens;
    expect(itens.map((i) => i.nome)).toEqual(['ALEX', 'IURI']);
  });

  it('o subtotal do dia é a soma dos seus itens', () => {
    for (const g of grupos) {
      for (const d of g.dias) {
        expect(d.extrasMin).toBe(d.itens.reduce((s, i) => s + i.extrasMin, 0));
      }
    }
  });

  // O terceiro par de batidas existe no layout B e hoje vem vazio; mostrar duas
  // colunas vazias em todo relatório só rouba largura da página.
  it('só sinaliza o terceiro par quando ele tem valor', () => {
    expect(grupos[0].temTerceiroPar).toBe(false);
    const com3 = detalheOcorrencias([lanc('ZE', 'FABRICA 1', '2026-09-22', '02:10', { ent3: '19:00' })]);
    expect(com3[0].temTerceiroPar).toBe(true);
  });
});

describe('anexo — quadro completo', () => {
  const blocos = anexoQuadroCompleto(DADOS);

  it('inclui TODO lançamento, também os sem extra', () => {
    const total = blocos.reduce((s, b) => s + b.linhas.length, 0);
    expect(total).toBe(6);                        // funcionários distintos
    expect(blocos.find((b) => b.codigo === 'VIVEIRO')!.linhas[0].nome).toBe('SARA');
  });

  it('as colunas de dia são as mesmas em todos os blocos', () => {
    for (const b of blocos) expect(b.dias).toEqual(['2026-09-22', '2026-09-26']);
  });

  it('funcionário sem lançamento no dia fica sem célula', () => {
    const f1 = blocos.find((b) => b.codigo === 'FABRICA 1')!;
    const hebert = f1.linhas.find((l) => l.nome === 'HEBERT')!;
    expect(hebert.porDia.has('2026-09-22')).toBe(true);
    expect(hebert.porDia.has('2026-09-26')).toBe(false);
  });

  it('o total do bloco é a soma das suas linhas', () => {
    for (const b of blocos) {
      expect(b.extrasMin).toBe(b.linhas.reduce((s, l) => s + l.totalMin, 0));
    }
  });
});

describe('invariantes', () => {
  it('conjunto íntegro não viola nada', () => {
    expect(invariantesViolados(DADOS)).toEqual([]);
  });

  it('acusa funcionário duplicado no mesmo dia', () => {
    const erros = invariantesViolados([...DADOS, lanc('ALEX', 'FABRICA 1', '2026-09-22', '01:00')]);
    expect(erros.join(' ')).toMatch(/duplicado no mesmo dia/);
  });

  // Faixa e valor vêm sempre juntos do motor; um dado corrompido no banco
  // quebraria essa amarra e o relatório sairia com contagem impossível.
  it('acusa faixa que não corresponde ao valor gravado', () => {
    const corrompido: Lancamento = { ...lanc('X', 'FABRICA 1', '2026-09-22', '03:00'), faixa: 'sem_extra' };
    const erros = invariantesViolados([corrompido]);
    expect(erros.join(' ')).toMatch(/superaram|faixa/i);
  });
});
