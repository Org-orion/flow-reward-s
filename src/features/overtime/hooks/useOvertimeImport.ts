import { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { lerArquivoPonto } from '../domain/pontoParser';
import { conciliarArquivo, type ResultadoConciliacao } from '../domain/conciliacao';
import { rotuloDepartamento } from '../domain/departamentos';
import { classificarFaixa, type LimitesFaixa } from '../domain/faixas';
import { porDepartamento, resumoExecutivo } from '../domain/agregacoes';
import { ErroImportacao, type AbaCrua, type ArquivoPonto, type Lancamento } from '../domain/pontoTipos';
import { gravarImportacao, importacaoExistente, type ImportacaoRow } from '../services/overtimeApi';

export type EtapaImportacao = 'arquivo' | 'conferencia' | 'resultado';

export interface PreviaImportacao {
  arquivo: ArquivoPonto;
  conciliacao: ResultadoConciliacao;
  lancamentos: Lancamento[];
  /** Importação anterior que cobre o mesmo período, se houver. */
  anterior: ImportacaoRow | null;
}

const MB = 1024 * 1024;
const TAMANHO_MAXIMO = 25 * MB;

/** Mensagem de erro escrita para o RH, não para quem programa. */
function mensagemDeErro(e: unknown): string {
  if (e instanceof ErroImportacao) return e.message;
  if (e instanceof Error && /zip|corrupt|end of central/i.test(e.message)) {
    return 'O arquivo parece estar corrompido. Exporte novamente do Secullum e tente de novo.';
  }
  return e instanceof Error ? e.message : 'Não foi possível ler o arquivo.';
}

/**
 * Importação do ponto: ler → conferir → confirmar.
 *
 * A gravação só acontece depois da conferência, e a divergência de conciliação
 * BLOQUEIA a confirmação para quem não é administrador. O administrador pode
 * seguir mesmo assim, e isso fica gravado em `forcada` — a especificação exige
 * a saída de emergência, mas registrada.
 */
export function useOvertimeImport(limites: LimitesFaixa, aoConcluir: () => void) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const ehAdmin = profile?.perfil === 'admin';

  const [etapa, setEtapa] = useState<EtapaImportacao>('arquivo');
  const [arquivoNome, setArquivoNome] = useState('');
  const [lendo, setLendo] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [previa, setPrevia] = useState<PreviaImportacao | null>(null);
  const [forcar, setForcar] = useState(false);
  const [resultado, setResultado] = useState<{ registros: number; substituiu: boolean } | null>(null);

  const reiniciar = useCallback(() => {
    setEtapa('arquivo');
    setArquivoNome('');
    setPrevia(null);
    setForcar(false);
    setResultado(null);
  }, []);

  /** Etapa 1 → 2. */
  const analisar = useCallback(async (file: File) => {
    if (!/\.xlsx$/i.test(file.name)) {
      toast({
        title: 'Formato não aceito',
        description: 'Envie o arquivo .xlsx exportado do Secullum. Arquivos .xls antigos precisam ser salvos como .xlsx.',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > TAMANHO_MAXIMO) {
      toast({ title: 'Arquivo muito grande', description: 'O limite é de 25 MB.', variant: 'destructive' });
      return;
    }

    setLendo(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', raw: false });
      const abas: AbaCrua[] = wb.SheetNames.map((nome) => ({
        nome,
        linhas: XLSX.utils.sheet_to_json(wb.Sheets[nome], {
          header: 1, raw: false, defval: null, blankrows: true,
        }) as (string | null)[][],
      }));

      const arquivo = lerArquivoPonto(abas);
      const conciliacao = conciliarArquivo(arquivo);
      const lancamentos: Lancamento[] = arquivo.lancamentos.map((l) => ({
        ...l,
        departamentoNome: rotuloDepartamento(l.departamentoCodigo),
        faixa: classificarFaixa(l.extrasMin, limites),
      }));

      let anterior: ImportacaoRow | null = null;
      try {
        anterior = await importacaoExistente(arquivo.dataInicio, arquivo.dataFim);
      } catch {
        // Consulta de conveniência: sem ela a tela apenas deixa de avisar sobre
        // substituição, e a própria gravação continua idempotente.
      }

      setPrevia({ arquivo, conciliacao, lancamentos, anterior });
      setArquivoNome(file.name);
      setForcar(false);
      setEtapa('conferencia');
    } catch (e) {
      toast({ title: 'Não foi possível importar', description: mensagemDeErro(e), variant: 'destructive' });
    } finally {
      setLendo(false);
    }
  }, [limites, toast]);

  const bloqueado = !!previa && !previa.conciliacao.ok && !(ehAdmin && forcar);

  /** Etapa 2 → 3. */
  const confirmar = useCallback(async () => {
    if (!previa || bloqueado) return;
    setGravando(true);
    try {
      const r = await gravarImportacao({
        arquivo: previa.arquivo,
        arquivoNome,
        conciliacao: previa.conciliacao,
        forcada: !previa.conciliacao.ok,
        limites,
      });
      setResultado({ registros: r.registros, substituiu: !!r.substituiu });
      setEtapa('resultado');
      aoConcluir();
      toast({
        title: 'Importação concluída',
        description: `${r.registros} lançamentos gravados${r.substituiu ? ', substituindo a importação anterior do período' : ''}.`,
      });
    } catch (e) {
      toast({ title: 'Erro ao gravar', description: mensagemDeErro(e), variant: 'destructive' });
    } finally {
      setGravando(false);
    }
  }, [previa, bloqueado, arquivoNome, limites, aoConcluir, toast]);

  // Derivados da prévia — a tela mostra exatamente o que será gravado.
  const resumo = previa ? resumoExecutivo(previa.lancamentos) : null;
  const porDepto = previa ? porDepartamento(previa.lancamentos) : [];

  return {
    etapa, setEtapa, arquivoNome, lendo, gravando, previa, resultado,
    resumo, porDepto,
    ehAdmin, forcar, setForcar, bloqueado,
    analisar, confirmar, reiniciar,
  };
}
