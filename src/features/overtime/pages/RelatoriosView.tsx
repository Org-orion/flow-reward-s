import { Download, Eye, FileText, Loader2, Printer } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { SectionCard } from '@/components/app/SectionCard';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useResourceAccess } from '@/hooks/useResourceAccess';
import { AccessDenied } from '@/components/AccessDenied';
import { useOvertime } from '../components/OvertimeContext';
import { useOvertimeData } from '../hooks/useOvertimeData';
import { useOvertimeReport } from '../hooks/useOvertimeReport';
import { OvertimeFilters } from '../components/OvertimeFilters';
import { VARIANTE_LABEL, type VarianteRelatorio } from '../domain/relatorioHtml';
import { rotuloPeriodo } from '../domain/filtros';

const VARIANTES: { valor: VarianteRelatorio; descricao: string }[] = [
  { valor: 'completo', descricao: 'As oito seções, do resumo executivo ao anexo por funcionário e dia. É o relatório diário padrão.' },
  { valor: 'reporte_ocorrencias', descricao: 'Documento avulso: indicadores e a relação nominal das ocorrências, para circular com as chefias.' },
  { valor: 'reporte_ranking', descricao: 'Documento avulso: indicadores e o ranking de funcionários acima do limite.' },
];

export function RelatoriosView() {
  const acesso = useResourceAccess('he_relatorios');
  const { limites, rotulos, config } = useOvertime();
  const d = useOvertimeData(limites, rotulos);
  const r = useOvertimeReport({
    lancamentos: d.lancamentos,
    filtros: d.filtros,
    descricaoFiltros: d.descricaoFiltros,
    limites,
    departamentoUnico: d.departamentoUnico,
    importacoes: d.importacoes,
    config,
  });

  if (acesso.granular && !acesso.podeVer) return <AccessDenied area="Relatórios de horas extras" />;

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-5">
      <PageHeader
        icon={FileText}
        title="Relatórios"
        description="O HTML da prévia é exatamente o que vira PDF — não existem dois documentos."
      />

      <SectionCard>
        <OvertimeFilters
          filtros={d.filtros}
          setFiltros={d.setFiltros}
          departamentos={d.departamentosDoPeriodo}
          descricao={d.descricaoFiltros}
          temFiltroAtivo={d.temFiltroAtivo}
          aplicarAtalho={d.aplicarAtalho}
          limpar={d.limparFiltros}
        />
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-[minmax(320px,380px)_1fr]">
        <div className="space-y-5">
          <SectionCard title="Tipo de relatório">
            <RadioGroup
              value={r.variante}
              onValueChange={(v) => r.setVariante(v as VarianteRelatorio)}
              className="space-y-3"
            >
              {VARIANTES.map((v) => (
                <label key={v.valor} className="flex cursor-pointer gap-3 rounded-lg border p-3 hover:bg-muted/40">
                  <RadioGroupItem value={v.valor} id={`he-var-${v.valor}`} className="mt-0.5" />
                  <div className="min-w-0">
                    <Label htmlFor={`he-var-${v.valor}`} className="cursor-pointer font-medium">
                      {VARIANTE_LABEL[v.valor]}
                    </Label>
                    <p className="mt-0.5 text-xs text-muted-foreground">{v.descricao}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </SectionCard>

          <SectionCard title="O que será gerado">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Período</dt>
                <dd className="font-medium">{rotuloPeriodo(d.filtros.inicio, d.filtros.fim)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Lançamentos</dt>
                <dd className="font-mono tabular-nums">{d.lancamentos.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Horas extras</dt>
                <dd className="font-mono tabular-nums">{r.totalExtras}</dd>
              </div>
              {d.departamentoUnico && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Departamento</dt>
                  <dd className="font-medium">{d.departamentoUnico}</dd>
                </div>
              )}
              <div className="border-t pt-2">
                <dt className="text-muted-foreground">Nome do arquivo</dt>
                <dd className="mt-1 break-all font-mono text-xs">{r.nomeSugerido}</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-col gap-2">
              <Button
                className="gap-2"
                onClick={() => void r.baixarPdf()}
                disabled={r.semDados || d.carregando}
              >
                <Printer className="h-4 w-4" /> Baixar PDF
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => void r.baixarHtml()}
                disabled={r.semDados || d.carregando}
              >
                <Download className="h-4 w-4" /> Baixar HTML
              </Button>
              <Button
                variant="ghost"
                className="gap-2"
                onClick={() => r.setPreviaAberta(!r.previaAberta)}
                disabled={r.semDados}
              >
                <Eye className="h-4 w-4" /> {r.previaAberta ? 'Ocultar prévia' : 'Ver prévia'}
              </Button>
            </div>

            {/* O envio por e-mail depende de SMTP corporativo, que ainda não
                está ligado a este módulo. Dizer isso é melhor do que oferecer
                um botão que não envia. */}
            <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
              O envio automático por e-mail aos destinatários ainda não está ligado.
              Por enquanto, baixe o PDF e anexe no envio diário.
            </p>
          </SectionCard>
        </div>

        <SectionCard
          title="Prévia"
          description={r.titulo}
          actions={<Badge variant="secondary">{VARIANTE_LABEL[r.variante]}</Badge>}
          noBodyPadding
        >
          {d.carregando ? (
            <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando o período…
            </div>
          ) : r.semDados ? (
            <p className="px-5 py-24 text-center text-sm text-muted-foreground">
              O recorte selecionado não tem nenhum lançamento. Ajuste o período ou os filtros.
            </p>
          ) : r.previaAberta ? (
            <iframe
              title="Prévia do relatório"
              srcDoc={r.html}
              className="h-[75vh] w-full rounded-b-xl border-0 bg-white"
              sandbox="allow-same-origin"
            />
          ) : (
            <p className="px-5 py-24 text-center text-sm text-muted-foreground">
              A prévia carrega o documento inteiro. Clique em <b>Ver prévia</b> para abri-la.
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
