import { describe, it, expect } from 'vitest';
import {
  lerArquivoPonto, detectarLayout, lerCabecalho, dataBRparaISO, ehMatricula,
} from './pontoParser';
import { ErroImportacao } from './pontoTipos';
import { formatMin } from './tempo';
import {
  planilhaLayoutA, planilhaLayoutB, linha, CAB_B, VAZIA,
  type DepartamentoFixture,
} from './__fixtures__/pontoFixtures';

const ADMIN: DepartamentoFixture = {
  codigo: 'ADMINISTRAÇÃO',
  subtotal: { funcionarios: '3', normais: '26:24', faltas: '08:48', extras: '02:02', carga: '26:24' },
  funcionarios: [
    { matricula: '0200000000000000000610', nome: 'ADRIANA SILVA DAMASCENO', ent1: '06:27', sai1: '11:56', ent2: '13:09', sai2: '17:26', normais: '08:48', extras: '01:03', carga: '08:48' },
    { matricula: '0210000000000000001323', nome: 'GABRIEL DA SILVA GOMES', afastamento: 'FALTA', faltas: '08:48', carga: '08:48' },
    { matricula: '0220000000000000000375', nome: 'JULIANA ALVES TEIXEIRA', afastamento: 'LIC MAT', normais: '08:48', carga: '08:48' },
  ],
};

// Matrículas curtas existem no cadastro real — filtrar por comprimento
// descartaria funcionários inteiros em silêncio.
const FABRICA: DepartamentoFixture = {
  codigo: 'FABRICA 1',
  quebrarApos: 0,
  subtotal: { funcionarios: '3', normais: '17:36', faltas: '', extras: '07:52', carga: '26:24' },
  funcionarios: [
    { matricula: '1234', nome: 'ALEX DA SILVA FERREIRA', ent1: '06:16', sai1: '11:59', ent2: '12:56', sai2: '18:28', normais: '08:48', extras: '03:12', carga: '08:48' },
    { matricula: '56789', nome: 'IURI CARVALHO DOS SANTOS', ent1: '07:08', sai1: '12:03', ent2: '12:54', sai2: '18:32', normais: '08:48', extras: '02:30', carga: '08:48' },
    { matricula: '0200000000000000011566', nome: 'HEBERT PASSOS DA SILVA', ent1: '07:16', sai1: '11:57', ent2: '12:57', sai2: '18:22', extras: '02:10', carga: '08:48' },
  ],
};

const ARQUIVO_B = planilhaLayoutB({
  departamentos: [ADMIN, FABRICA],
  totalGeral: { funcionarios: '6', normais: '44:00', faltas: '08:48', extras: '09:54', carga: '52:48' },
});

describe('detecção de layout', () => {
  it('reconhece o Ponto Diário pela linha "Dia:"', () => {
    expect(detectarLayout(ARQUIVO_B)).toBe('B');
  });

  it('reconhece o Ponto por período pela linha "Período:"', () => {
    const abas = planilhaLayoutA([{
      nome: 'Fabrica 01', departamento: 'FABRICA 1', periodo: ['14/09/2026', '19/09/2026'],
      linhas: [{ data: '14/09/2026', nome: 'ALEX', extras: '01:00' }],
    }]);
    expect(detectarLayout(abas)).toBe('A');
  });

  it('arquivo sem nenhum dos dois marcadores é recusado com mensagem de RH', () => {
    const abas = [{ nome: 'Plan1', linhas: [linha([0, 'qualquer coisa'])] }];
    expect(() => detectarLayout(abas)).toThrow(ErroImportacao);
    expect(() => detectarLayout(abas)).toThrow(/Ponto Di[áa]rio/);
  });
});

describe('cabeçalho aprendido pelas colunas', () => {
  it('mapeia os rótulos do layout B para os índices reais', () => {
    expect(lerCabecalho(CAB_B)).toEqual({
      matricula: 0, nome: 5, ent1: 11, sai1: 13, ent2: 15, sai2: 17,
      ent3: 19, sai3: 21, normais: 23, faltas: 25, extras: 27, carga: 29,
    });
  });

  it('ignora acento e pontuação nos rótulos', () => {
    const mapa = lerCabecalho(linha([0, 'DATA'], [1, 'NOME'], [3, 'ENT.1'], [4, 'SAI. 1'], [7, 'EXTRAS']));
    expect(mapa).toMatchObject({ data: 0, nome: 1, ent1: 3, sai1: 4, extras: 7 });
  });

  it('linha comum não é confundida com cabeçalho', () => {
    expect(lerCabecalho(linha([0, '1234'], [5, 'FULANO'], [27, '02:10']))).toBeNull();
    expect(lerCabecalho(VAZIA)).toBeNull();
  });
});

describe('utilitários de linha', () => {
  it('matrícula é numérica de qualquer comprimento', () => {
    expect(ehMatricula('1234')).toBe(true);
    expect(ehMatricula('0200000000000000000610')).toBe(true);
    expect(ehMatricula('SUBTOTAL')).toBe(false);
    expect(ehMatricula('')).toBe(false);
    expect(ehMatricula('12A4')).toBe(false);
  });

  it('converte data brasileira para ISO', () => {
    expect(dataBRparaISO('22/09/2026')).toBe('2026-09-22');
    expect(dataBRparaISO('Dia: 22/09/2026. Agrupado')).toBe('2026-09-22');
    expect(dataBRparaISO('32/13/2026')).toBeNull();
    expect(dataBRparaISO('sem data')).toBeNull();
  });
});

describe('layout B — Ponto Diário', () => {
  const arquivo = lerArquivoPonto(ARQUIVO_B);

  it('extrai a data única do arquivo', () => {
    expect(arquivo.layout).toBe('B');
    expect(arquivo.dataInicio).toBe('2026-09-22');
    expect(arquivo.dataFim).toBe('2026-09-22');
  });

  it('lê todos os lançamentos, inclusive depois da quebra de página', () => {
    expect(arquivo.lancamentos).toHaveLength(6);
    expect(arquivo.lancamentos.map((l) => l.nome)).toContain('HEBERT PASSOS DA SILVA');
  });

  // O departamento aparece uma vez e vale até o próximo; o cabeçalho é que se
  // repete. Trocar isso atribuiria metade da fábrica ao departamento errado.
  it('mantém o departamento corrente através das quebras de página', () => {
    const porNome = new Map(arquivo.lancamentos.map((l) => [l.nome, l.departamentoCodigo]));
    expect(porNome.get('ADRIANA SILVA DAMASCENO')).toBe('ADMINISTRAÇÃO');
    expect(porNome.get('ALEX DA SILVA FERREIRA')).toBe('FABRICA 1');
    expect(porNome.get('HEBERT PASSOS DA SILVA')).toBe('FABRICA 1');
    expect(arquivo.departamentos).toEqual(['ADMINISTRAÇÃO', 'FABRICA 1']);
  });

  it('separa batidas de códigos de afastamento', () => {
    const falta = arquivo.lancamentos.find((l) => l.nome === 'GABRIEL DA SILVA GOMES')!;
    expect(falta.statusAfastamento).toBe('FALTA');
    expect(falta.ent1).toBeNull();
    expect(falta.extrasMin).toBe(0);

    const licenca = arquivo.lancamentos.find((l) => l.nome === 'JULIANA ALVES TEIXEIRA')!;
    expect(licenca.statusAfastamento).toBe('LICENÇA MATERNIDADE');
  });

  it('usa o valor de EXTRAS como veio, sem recalcular pelas batidas', () => {
    const alex = arquivo.lancamentos.find((l) => l.nome === 'ALEX DA SILVA FERREIRA')!;
    expect(formatMin(alex.extrasMin)).toBe('03:12');
    expect(alex.ent1).toBe('06:16');
    expect(alex.sai2).toBe('18:28');
  });

  it('EXTRAS vazio é zero, não erro', () => {
    const semExtra = arquivo.lancamentos.find((l) => l.nome === 'JULIANA ALVES TEIXEIRA')!;
    expect(semExtra.extrasMin).toBe(0);
  });

  it('captura SUBTOTAL por departamento e o TOTAL GERAL', () => {
    expect(arquivo.subtotais).toHaveLength(2);
    expect(arquivo.subtotais[0]).toMatchObject({ departamentoCodigo: 'ADMINISTRAÇÃO', funcionarios: 3 });
    expect(formatMin(arquivo.subtotais[1].extrasMin)).toBe('07:52');
    expect(arquivo.totalGeral).toMatchObject({ funcionarios: 6 });
    expect(formatMin(arquivo.totalGeral!.extrasMin)).toBe('09:54');
  });

  it('descarta rodapé, URL, PÁGINA e o próprio cabeçalho repetido', () => {
    for (const l of arquivo.lancamentos) {
      expect(l.nome).not.toMatch(/SUBTOTAL|TOTAL|PÁGINA|secullum|NOME/i);
    }
  });

  it('não avisa nada quando os departamentos são conhecidos', () => {
    expect(arquivo.avisos).toEqual([]);
  });

  it('avisa departamento fora do mapa em vez de recusar o arquivo', () => {
    const a = lerArquivoPonto(planilhaLayoutB({
      departamentos: [{ codigo: 'SETOR NOVO XYZ', funcionarios: [{ matricula: '1', nome: 'FULANO', extras: '01:00' }] }],
    }));
    expect(a.lancamentos).toHaveLength(1);
    expect(a.avisos.join(' ')).toMatch(/SETOR NOVO XYZ/);
  });

  it('avisa matrícula repetida no mesmo dia', () => {
    const a = lerArquivoPonto(planilhaLayoutB({
      departamentos: [{
        codigo: 'FABRICA 1',
        funcionarios: [
          { matricula: '77', nome: 'FULANO', extras: '01:00' },
          { matricula: '77', nome: 'FULANO', extras: '02:00' },
        ],
      }],
    }));
    expect(a.avisos.join(' ')).toMatch(/Matrícula repetida/);
  });

  it('recusa planilha sem a linha "Dia:"', () => {
    const abas = [{ nome: 'Page 1', linhas: [linha([8, 'PONTO DIÁRIO']), CAB_B] }];
    expect(() => lerArquivoPonto(abas)).toThrow(/reconhecer o formato do arquivo/i);
  });

  it('recusa arquivo com cabeçalho mas sem nenhum registro', () => {
    expect(() => lerArquivoPonto(planilhaLayoutB({ departamentos: [{ codigo: 'FABRICA 1', funcionarios: [] }] })))
      .toThrow(/Nenhum registro de ponto/);
  });
});

describe('layout A — Ponto por período', () => {
  const arquivo = lerArquivoPonto(planilhaLayoutA([
    {
      nome: 'Fabrica 01', departamento: 'FABRICA 1', periodo: ['14/09/2026', '19/09/2026'], total: '05:00',
      linhas: [
        { data: '14/09/2026', nome: 'ALEX DA SILVA', ent1: '06:16', sai1: '11:59', ent2: '12:56', sai2: '18:28', extras: '03:00' },
        { data: '19/09/2026', nome: 'ALEX DA SILVA', ent1: '06:10', sai1: '12:00', extras: '02:00' },
        { data: '15/09/2026', nome: 'MARIA SOUZA', afastamento: 'FERIAS' },
      ],
    },
    {
      nome: 'MOVEIS', departamento: 'FABRICA DE MOVEIS', periodo: ['14/09/2026', '19/09/2026'], total: '01:30',
      linhas: [{ data: '16/09/2026', nome: 'JOAO LIMA', ent1: '07:00', sai1: '12:00', extras: '01:30' }],
    },
  ]));

  it('agrega as abas e apura o período completo', () => {
    expect(arquivo.layout).toBe('A');
    expect(arquivo.dataInicio).toBe('2026-09-14');
    expect(arquivo.dataFim).toBe('2026-09-19');
    expect(arquivo.lancamentos).toHaveLength(4);
  });

  it('toma o departamento do cabeçalho da aba, não do nome da aba', () => {
    expect(arquivo.departamentos).toEqual(['FABRICA 1', 'FABRICA DE MOVEIS']);
  });

  it('cada aba vira uma linha de conferência', () => {
    expect(arquivo.subtotais.map((s) => s.departamentoCodigo)).toEqual(['FABRICA 1', 'FABRICA DE MOVEIS']);
    expect(formatMin(arquivo.subtotais[0].extrasMin)).toBe('05:00');
  });

  // Sem coluna de matrícula, a identidade possível é departamento+nome. O mesmo
  // funcionário em dias diferentes precisa ser a MESMA pessoa no ranking.
  it('identifica o mesmo funcionário em dias diferentes', () => {
    const alex = arquivo.lancamentos.filter((l) => l.nome === 'ALEX DA SILVA');
    expect(alex).toHaveLength(2);
    expect(new Set(alex.map((l) => l.matricula)).size).toBe(1);
  });

  it('normaliza o código de afastamento também neste layout', () => {
    const ferias = arquivo.lancamentos.find((l) => l.nome === 'MARIA SOUZA')!;
    expect(ferias.statusAfastamento).toBe('FÉRIAS');
    expect(ferias.extrasMin).toBe(0);
  });
});
