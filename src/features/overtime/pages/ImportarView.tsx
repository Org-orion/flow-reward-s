import { useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, CheckCircle2, FileSpreadsheet, Loader2, Upload, XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { SectionCard } from '@/components/app/SectionCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useResourceAccess } from '@/hooks/useResourceAccess';
import { AccessDenied } from '@/components/AccessDenied';
import { useOvertime } from '../components/OvertimeContext';
import { useOvertimeImport } from '../hooks/useOvertimeImport';
import { IndicadoresResumo } from '../components/IndicadoresResumo';
import { FaixaLegenda } from '../components/FaixaBadge';
import { formatMin } from '../domain/tempo';
import { dataBR } from '../domain/agregacoes';
import { CAMPO_ROTULO } from '../domain/conciliacao';
import { rotuloPeriodo } from '../domain/filtros';

const num = 'text-right font-mono tabular-nums';

export function ImportarView() {
  const acesso = useResourceAccess('he_importar');
  const navigate = useNavigate();
  const { limites, recarregar: recarregarConfig } = useOvertime();
  const imp = useOvertimeImport(limites, recarregarConfig);
  const [arrastando, setArrastando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (acesso.granular && !acesso.podeImportar) {
    return <AccessDenied area="Importar ponto" />;
  }

  const soltar = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastando(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void imp.analisar(file);
  };

  // ------------------------------------------------------------ etapa 3
  if (imp.etapa === 'resultado' && imp.resultado) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <PageHeader icon={CheckCircle2} title="Importação concluída" />
        <SectionCard>
          <div className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <div>
              <p className="text-lg font-semibold">
                {imp.resultado.registros} lançamentos gravados
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Período {rotuloPeriodo(imp.previa!.arquivo.dataInicio, imp.previa!.arquivo.dataFim)}
                {imp.resultado.substituiu && ' — substituindo a importação anterior do mesmo período.'}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => navigate('/horas-extras')}>Ver o painel</Button>
              <Button variant="outline" onClick={() => navigate('/horas-extras/relatorios')}>Gerar relatório</Button>
              <Button variant="ghost" onClick={imp.reiniciar}>Importar outro arquivo</Button>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  // ------------------------------------------------------------ etapa 2
  if (imp.etapa === 'conferencia' && imp.previa && imp.resumo) {
    const { arquivo, conciliacao, anterior } = imp.previa;
    return (
      <div className="mx-auto w-full max-w-[1400px] space-y-5">
        <PageHeader
          icon={FileSpreadsheet}
          title="Conferir importação"
          description={`${imp.arquivoNome} · layout ${arquivo.layout === 'B' ? 'Ponto Diário' : 'Ponto por período'} · ${rotuloPeriodo(arquivo.dataInicio, arquivo.dataFim)}`}
          actions={
            <Button variant="ghost" className="gap-2" onClick={imp.reiniciar}>
              <ArrowLeft className="h-4 w-4" /> Trocar arquivo
            </Button>
          }
        />

        {/* Conciliação primeiro: é ela que decide se a importação pode seguir. */}
        <div
          className={cn(
            'flex gap-3 rounded-xl border p-4',
            conciliacao.ok
              ? 'border-emerald-600/30 bg-emerald-50/60 dark:bg-emerald-950/20'
              : 'border-[#c0392b]/40 bg-[#f9e1dd]/60 dark:bg-[#c0392b]/10',
          )}
        >
          {conciliacao.ok
            ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#c0392b]" />}
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {conciliacao.ok
                ? `Conciliação conferida — ${conciliacao.conferencias} comparações contra SUBTOTAL e TOTAL GERAL do arquivo.`
                : `Conciliação divergente — ${conciliacao.divergencias.length} diferença(s) em relação aos totais do próprio arquivo.`}
            </p>
            {conciliacao.semReferencia.length > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                Sem linha de conferência: {conciliacao.semReferencia.join(', ')}.
              </p>
            )}

            {!conciliacao.ok && (
              <div className="mt-3 overflow-x-auto rounded-lg border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Onde</TableHead>
                      <TableHead>Campo</TableHead>
                      <TableHead className="text-right">No arquivo</TableHead>
                      <TableHead className="text-right">Lido pelo sistema</TableHead>
                      <TableHead className="text-right">Diferença</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conciliacao.divergencias.map((d, i) => {
                      const hora = d.campo !== 'funcionarios';
                      return (
                        <TableRow key={`${d.referencia}-${d.campo}-${i}`}>
                          <TableCell className="font-medium">{d.referencia}</TableCell>
                          <TableCell>{CAMPO_ROTULO[d.campo]}</TableCell>
                          <TableCell className={num}>{hora ? formatMin(d.esperado) : d.esperado}</TableCell>
                          <TableCell className={num}>{hora ? formatMin(d.calculado) : d.calculado}</TableCell>
                          <TableCell className={cn(num, 'font-semibold text-[#c0392b]')}>
                            {hora ? formatMin(d.delta) : d.delta}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        {anterior && (
          <div className="flex gap-3 rounded-xl border border-[#d9a520]/40 bg-[#fbf0d5]/60 p-4 dark:bg-[#d9a520]/10">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#b8860b]" />
            <p className="text-sm">
              Já existe importação para {rotuloPeriodo(anterior.data_referencia_inicio, anterior.data_referencia_fim)},
              feita por <b>{anterior.responsavel ?? 'usuário do sistema'}</b> em {dataBR(anterior.created_at.slice(0, 10))}.
              Confirmar <b>substitui</b> os lançamentos daquele período.
            </p>
          </div>
        )}

        {arquivo.avisos.length > 0 && (
          <SectionCard title="Observações do arquivo">
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {arquivo.avisos.map((a) => <li key={a}>{a}</li>)}
            </ul>
          </SectionCard>
        )}

        <IndicadoresResumo
          resumo={imp.resumo}
          verdeMaxMin={limites.verdeMaxMin}
          amareloMaxMin={limites.amareloMaxMin}
        />

        <SectionCard
          title="Totais por departamento"
          description="Confira contra a exportação antes de gravar."
          noBodyPadding
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Departamento</TableHead>
                  <TableHead className="text-right">Funcionários</TableHead>
                  <TableHead className="text-right">Horas extras</TableHead>
                  <TableHead className="text-right">Ocorrências</TableHead>
                  <TableHead className="text-right">Vermelhas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imp.porDepto.map((d) => (
                  <TableRow key={d.codigo}>
                    <TableCell className="font-medium">{d.nome}</TableCell>
                    <TableCell className={num}>{d.funcionarios}</TableCell>
                    <TableCell className={num}>{formatMin(d.extrasMin)}</TableCell>
                    <TableCell className={num}>{d.ocorrencias}</TableCell>
                    <TableCell className={num}>{d.vermelhas || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="border-t px-5 py-3">
            <FaixaLegenda contagens={imp.resumo.faixas} />
          </div>
        </SectionCard>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
          <div className="min-w-0">
            {imp.bloqueado ? (
              <p className="text-sm text-[#7d2318] dark:text-[#e07a6c]">
                {imp.ehAdmin
                  ? 'A importação está bloqueada pela divergência. Como administrador, você pode liberar abaixo — a liberação fica registrada.'
                  : 'A importação está bloqueada pela divergência. Exporte o arquivo novamente do Secullum ou peça a um administrador para liberar.'}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {imp.resumo.lancamentos} lançamentos serão gravados · {formatMin(imp.resumo.extrasMin)} de horas extras.
              </p>
            )}

            {imp.ehAdmin && !imp.previa.conciliacao.ok && (
              <div className="mt-3 flex items-center gap-2">
                <Switch id="he-forcar" checked={imp.forcar} onCheckedChange={imp.setForcar} />
                <Label htmlFor="he-forcar" className="text-sm font-normal">
                  Importar mesmo assim, com a divergência registrada
                </Label>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={imp.reiniciar} disabled={imp.gravando}>Cancelar</Button>
            <Button onClick={() => void imp.confirmar()} disabled={imp.bloqueado || imp.gravando} className="gap-2">
              {imp.gravando && <Loader2 className="h-4 w-4 animate-spin" />}
              {anterior ? 'Substituir e gravar' : 'Confirmar importação'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------ etapa 1
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <PageHeader
        icon={Upload}
        title="Importar ponto"
        description="Envie o arquivo .xlsx exportado do Secullum. O sistema identifica o formato sozinho."
      />

      <SectionCard>
        <div
          onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
          onDragLeave={() => setArrastando(false)}
          onDrop={soltar}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors',
            arrastando ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/40',
          )}
        >
          {imp.lendo ? (
            <>
              <Loader2 className="h-9 w-9 animate-spin text-primary" />
              <p className="font-medium">Lendo o arquivo…</p>
            </>
          ) : (
            <>
              <FileSpreadsheet className="h-9 w-9 text-muted-foreground" />
              <div>
                <p className="font-medium">Arraste o arquivo aqui ou clique para escolher</p>
                <p className="mt-1 text-sm text-muted-foreground">Somente .xlsx, até 25 MB</p>
              </div>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void imp.analisar(f);
              e.target.value = '';
            }}
          />
        </div>
      </SectionCard>

      <SectionCard title="Formatos aceitos">
        <div className="space-y-3 text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <Badge variant="secondary" className="mt-0.5 shrink-0">Ponto Diário</Badge>
            <span>Aba única agrupada por departamento, com a linha <b>Dia: dd/mm/aaaa</b> no topo. É o relatório do envio diário.</span>
          </p>
          <p className="flex items-start gap-2">
            <Badge variant="secondary" className="mt-0.5 shrink-0">Ponto por período</Badge>
            <span>Uma aba por departamento, com a linha <b>Período: dd/mm/aaaa até dd/mm/aaaa</b> no topo.</span>
          </p>
          <p className="border-t pt-3">
            Os valores da coluna <b>EXTRAS</b> são usados exatamente como o Secullum apurou — o sistema
            nunca recalcula hora extra a partir das batidas. Reimportar o mesmo dia substitui os
            lançamentos daquele dia, sem duplicar.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
