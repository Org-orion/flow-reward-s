import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Funcionario } from '@/hooks/useFuncionarios';
import type { Empresa } from '@/hooks/useEmpresas';
import type { Setor } from '@/hooks/useSetores';
import type { Funcao } from '@/hooks/useFuncoes';
import type { Categoria } from '@/hooks/useCategorias';
import type { BasePremiacao } from '@/hooks/useBasePremiacao';
import type { Faixa } from '@/hooks/useFaixas';
import type { LocalDSS } from '@/hooks/useLocaisDSS';
import { lerLinhaPlanilha, mapByNome, resolverRef, type LinhaPlanilha } from '../domain/importParsing';
import { planejarAtualizacao, temMudanca, type PlanoAtualizacao, type ValoresDoArquivo } from '../domain/employeeUpdatePlan';
import { checkEmployeeCompletion } from '../domain/employeeCompletion';

export type UpdateStep = 'arquivo' | 'validacao' | 'confirmacao';

export type UpdateRowStatus =
  | 'atualiza'            // há campo a gravar
  | 'divergente'          // só diverge, e sobrescrever está desligado
  | 'sem_mudanca'         // já está igual/completo
  | 'sem_correspondencia' // código não existe no cadastro
  | 'invalido';           // linha sem código ou com referência inexistente

export interface UpdateRow {
  line: number;
  cod: string;
  nome: string;
  status: UpdateRowStatus;
  problema?: string;
  funcionarioId?: string;
  /** Faltava antes; fica vazio quando o cadastro já estava completo. */
  faltavaAntes: string[];
  /** Continua faltando depois de aplicar o plano. */
  faltaDepois: string[];
  plano?: PlanoAtualizacao;
}

interface RefData {
  empresas: Empresa[]; setores: Setor[]; funcoes: Funcao[]; categorias: Categoria[];
  bases: BasePremiacao[]; faixas: Faixa[]; locaisDSS: LocalDSS[];
}

/** Aplica o patch sobre uma cópia, para prever a completude resultante. */
function aplicar(f: Funcionario, plano: PlanoAtualizacao): Funcionario {
  return { ...f, ...plano.patch } as Funcionario;
}

/**
 * Importação de ATUALIZAÇÃO de cadastro. O importador existente
 * (useEmployeeImport) só INSERE e ignora quem já existe; este completa quem já
 * está cadastrado, casando pelo código do funcionário.
 *
 * Segurança do dado: por padrão só preenche campo VAZIO. Divergências contra
 * valores já gravados são listadas e só entram com `sobrescrever` ligado — ver
 * domain/employeeUpdatePlan.
 */
export function useEmployeeUpdateImport(refs: RefData, refetch: () => void) {
  const { toast } = useToast();
  const [step, setStep] = useState<UpdateStep>('arquivo');
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sobrescrever, setSobrescrever] = useState(false);
  const [atualizados, setAtualizados] = useState(0);
  const [erros, setErros] = useState<UpdateRow[]>([]);

  // Cru da planilha + funcionários casados. Os planos são DERIVADOS, para o
  // interruptor "substituir divergentes" refletir na hora na prévia — a tela
  // sempre mostra exatamente o que será gravado.
  const [linhas, setLinhas] = useState<{ line: number; dados: LinhaPlanilha; valores: ValoresDoArquivo; problema?: string }[]>([]);
  const [porCodigo, setPorCodigo] = useState<Map<string, Funcionario>>(new Map());

  const reset = () => {
    setStep('arquivo'); setFile(null); setLinhas([]); setPorCodigo(new Map());
    setAtualizados(0); setErros([]); setProgress(0); setSobrescrever(false);
  };

  /** Etapa 1 → 2: lê o arquivo, resolve referências e busca os cadastros. */
  const buildPreview = async (f: File) => {
    setIsParsing(true);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const sheetName = wb.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' }) as Record<string, unknown>[];
      if (data.length === 0) {
        toast({ title: 'Arquivo vazio', description: `Aba lida: "${sheetName}".`, variant: 'destructive' });
        return;
      }

      const idx = {
        empresas: mapByNome(refs.empresas), setores: mapByNome(refs.setores),
        funcoes: mapByNome(refs.funcoes), categorias: mapByNome(refs.categorias),
        bases: mapByNome(refs.bases), faixas: mapByNome(refs.faixas), locaisDSS: mapByNome(refs.locaisDSS),
      };

      const lidas = data.map((row, i) => {
        const dados = lerLinhaPlanilha(row);
        const line = i + 2; // +1 cabeçalho, +1 base 1

        const empresa = resolverRef(dados.empresaId, dados.empresaNome, idx.empresas);
        const setor = resolverRef(dados.setorId, dados.setorNome, idx.setores);
        const funcao = resolverRef(dados.funcaoId, dados.funcaoNome, idx.funcoes);
        const categoria = resolverRef(dados.categoriaId, dados.categoriaNome, idx.categorias);
        const base = resolverRef(dados.baseId, dados.baseNome, idx.bases);
        const faixa = resolverRef(dados.faixaId, dados.faixaNome, idx.faixas);
        const local = resolverRef(dados.localDssId, dados.localDssNome, idx.locaisDSS);

        const faltando = [
          empresa.naoEncontrado && 'Empresa', setor.naoEncontrado && 'Setor',
          funcao.naoEncontrado && 'Função', categoria.naoEncontrado && 'Categoria',
          base.naoEncontrado && 'Base de Premiação', faixa.naoEncontrado && 'Faixa',
          local.naoEncontrado && 'Local DSS',
        ].filter(Boolean) as string[];

        const problema = !dados.cod
          ? 'Linha sem código do funcionário'
          : faltando.length
            ? `Não existe no cadastro: ${faltando.join(', ')}`
            : undefined;

        const valores: ValoresDoArquivo = {
          empresa_id: empresa.id, setor_id: setor.id, funcao_id: funcao.id,
          categoria_id: categoria.id, base_premiacao_id: base.id, faixa_id: faixa.id,
          local_dss_id: local.id, data_admissao: dados.dataAdmissao,
          nome: dados.nome || null, status: dados.status || null,
        };
        return { line, dados, valores, problema };
      });

      // Busca só os códigos do arquivo — não depende da lista já carregada na
      // tela, que é paginada e pode não conter o funcionário da linha.
      const codigos = [...new Set(lidas.map((l) => l.dados.cod).filter(Boolean))];
      const encontrados: Funcionario[] = [];
      for (let i = 0; i < codigos.length; i += 200) {   // PostgREST limita o tamanho da URL
        const { data: parte, error } = await supabase
          .from('concremrh_funcionarios').select('*').in('cpf', codigos.slice(i, i + 200));
        if (error) throw new Error(error.message);
        encontrados.push(...((parte ?? []) as unknown as Funcionario[]));
      }

      setPorCodigo(new Map(encontrados.map((f) => [String(f.cpf), f])));
      setLinhas(lidas);
      setFile(f);
      setStep('validacao');
    } catch (e) {
      toast({ title: 'Erro ao ler arquivo', description: e instanceof Error ? e.message : 'Falha ao processar', variant: 'destructive' });
    } finally {
      setIsParsing(false);
    }
  };

  /** Prévia derivada: muda junto com o interruptor de sobrescrever. */
  const rows = useMemo<UpdateRow[]>(() => linhas.map(({ line, dados, valores, problema }) => {
    const base = { line, cod: dados.cod, nome: dados.nome, faltavaAntes: [] as string[], faltaDepois: [] as string[] };
    if (problema) return { ...base, status: 'invalido', problema };

    const atual = porCodigo.get(dados.cod);
    if (!atual) {
      return { ...base, status: 'sem_correspondencia', problema: 'Código não encontrado no cadastro' };
    }

    const faltavaAntes = checkEmployeeCompletion(atual).missing;
    const plano = planejarAtualizacao(atual, valores, { sobrescrever });
    const faltaDepois = checkEmployeeCompletion(aplicar(atual, plano)).missing;
    const nome = dados.nome || atual.nome;

    if (temMudanca(plano)) {
      return { ...base, nome, status: 'atualiza', funcionarioId: atual.id, faltavaAntes, faltaDepois, plano };
    }
    if (plano.divergencias.length) {
      return {
        ...base, nome, status: 'divergente', funcionarioId: atual.id, faltavaAntes, faltaDepois, plano,
        problema: 'Valores diferentes do cadastro — ligue "substituir divergentes" para aplicar',
      };
    }
    return { ...base, nome, status: 'sem_mudanca', funcionarioId: atual.id, faltavaAntes, faltaDepois, plano };
  }), [linhas, porCodigo, sobrescrever]);

  const summary = useMemo(() => ({
    total: rows.length,
    atualiza: rows.filter((r) => r.status === 'atualiza').length,
    divergentes: rows.filter((r) => r.status === 'divergente').length,
    semMudanca: rows.filter((r) => r.status === 'sem_mudanca').length,
    semCorrespondencia: rows.filter((r) => r.status === 'sem_correspondencia').length,
    invalidos: rows.filter((r) => r.status === 'invalido').length,
    camposPreenchidos: rows.reduce((a, r) => a + (r.plano ? Object.keys(r.plano.patch).length : 0), 0),
    ficamCompletos: rows.filter((r) => r.status === 'atualiza' && r.faltavaAntes.length > 0 && r.faltaDepois.length === 0).length,
  }), [rows]);

  /** Etapa 2 → 3: grava apenas as linhas com algo a mudar. */
  const commitUpdate = async () => {
    const aGravar = rows.filter((r) => r.status === 'atualiza' && r.funcionarioId && r.plano);
    if (aGravar.length === 0) return;
    setIsSaving(true);
    setProgress(0);
    let ok = 0;
    const falhas: UpdateRow[] = [];
    for (let i = 0; i < aGravar.length; i++) {
      const r = aGravar[i];
      const { error } = await supabase
        .from('concremrh_funcionarios')
        .update({ ...r.plano!.patch, updated_at: new Date().toISOString() } as never)
        .eq('id', r.funcionarioId!);
      if (error) falhas.push({ ...r, status: 'invalido', problema: error.message });
      else ok++;
      if (i % 5 === 0) setProgress(Math.round(((i + 1) / aGravar.length) * 100));
    }
    setProgress(100);
    setAtualizados(ok);
    setErros(falhas);
    toast({
      title: 'Atualização concluída',
      description: `${ok} cadastro(s) atualizado(s)${falhas.length ? `, ${falhas.length} com erro` : ''}.`,
      variant: falhas.length ? 'destructive' : undefined,
    });
    setIsSaving(false);
    setStep('confirmacao');
    refetch();
  };

  /** Relatório do que não pôde ser aplicado, para corrigir a planilha. */
  const downloadRelatorio = () => {
    const problema = rows.filter((r) => r.status !== 'atualiza' && r.status !== 'sem_mudanca');
    if (problema.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(problema.map((r) => ({
      Linha: r.line, Código: r.cod, Funcionário: r.nome, Situação: r.status, Detalhe: r.problema ?? '',
      Divergências: (r.plano?.divergencias ?? []).map((d) => `${d.rotulo}: "${d.de}" → "${d.para}"`).join(' | '),
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nao aplicados');
    XLSX.writeFile(wb, 'relatorio_atualizacao_cadastros.xlsx');
  };

  return {
    step, setStep, file, isParsing, isSaving, progress,
    sobrescrever, setSobrescrever,
    rows, summary, atualizados, erros,
    reset, buildPreview, commitUpdate, downloadRelatorio,
  };
}
