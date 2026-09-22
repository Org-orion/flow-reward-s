import { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, X, Check, ChevronLeft, AlertTriangle, Download, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { useEmployeeUpdateImport, UpdateStep, UpdateRow, UpdateRowStatus } from '@/features/employees/hooks/useEmployeeUpdateImport';

const MAX_SIZE_MB = 5;
const ACCEPTED = ['.xlsx', '.xls'];

const STATUS_META: Record<UpdateRowStatus, { label: string; className: string }> = {
  atualiza: { label: 'Atualiza', className: 'bg-success/10 text-success' },
  divergente: { label: 'Divergente', className: 'bg-status-warning/10 text-status-warning' },
  sem_mudanca: { label: 'Sem mudança', className: 'bg-muted text-muted-foreground' },
  sem_correspondencia: { label: 'Não encontrado', className: 'bg-muted text-muted-foreground' },
  invalido: { label: 'Inválido', className: 'bg-destructive/10 text-destructive' },
};

const STEP_LABELS: Record<UpdateStep, string> = { arquivo: 'Arquivo', validacao: 'Conferência', confirmacao: 'Resultado' };
const STEP_ORDER: UpdateStep[] = ['arquivo', 'validacao', 'confirmacao'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estado: ReturnType<typeof useEmployeeUpdateImport>;
}

/**
 * Atualização de cadastros em lote a partir de planilha. Diferente da
 * importação, NÃO cria funcionário: casa pelo código e completa quem já existe.
 */
export function EmployeeUpdateWizard({ open, onOpenChange, estado }: Props) {
  const {
    step, setStep, file, isParsing, isSaving, progress, sobrescrever, setSobrescrever,
    rows, summary, atualizados, erros, reset, buildPreview, commitUpdate, downloadRelatorio,
  } = estado;

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const aceitar = (f: File | null) => {
    setErroArquivo(null);
    if (!f) { setArquivo(null); return; }
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED.includes(ext)) { setErroArquivo('Formato não suportado. Use .xlsx ou .xls.'); return; }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) { setErroArquivo(`Arquivo maior que ${MAX_SIZE_MB}MB.`); return; }
    setArquivo(f);
  };

  const fechar = () => { onOpenChange(false); reset(); setArquivo(null); setErroArquivo(null); };
  const stepIdx = STEP_ORDER.indexOf(step);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) fechar(); }}>
      <DialogContent className="max-w-[860px]">
        <DialogHeader>
          <DialogTitle>Atualizar cadastros por planilha</DialogTitle>
          <DialogDescription>
            Completa o cadastro de funcionários que já existem, casando pelo código. Não cria funcionário novo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 pb-1">
          {STEP_ORDER.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                i < stepIdx ? 'bg-primary text-primary-foreground' : i === stepIdx ? 'bg-primary/15 text-primary ring-2 ring-primary/30' : 'bg-muted text-muted-foreground',
              )}>
                {i < stepIdx ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn('hidden text-xs font-medium sm:block', i === stepIdx ? 'text-foreground' : 'text-muted-foreground')}>{STEP_LABELS[s]}</span>
              {i < STEP_ORDER.length - 1 && <div className="h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>

        <div className="max-h-[55vh] min-w-0 overflow-y-auto py-2">
          {/* ------------------------------------------------ 1. arquivo */}
          {step === 'arquivo' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Use a mesma planilha da importação. O sistema localiza cada funcionário pelo <strong>código</strong>
                {' '}(aceita as colunas <em>cod_funcionario</em>, <em>codigo</em>, <em>matricula</em> ou <em>cpf</em>) e preenche
                {' '}os campos que estiverem vazios no cadastro: empresa, setor, função, categoria, base de premiação,
                {' '}faixa, local de DSS, data de admissão, nome e status.
              </p>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); aceitar(e.dataTransfer.files?.[0] ?? null); }}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  'flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors',
                  dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                )}
              >
                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Arraste a planilha ou clique para escolher</p>
                <p className="text-xs text-muted-foreground">.xlsx ou .xls, até {MAX_SIZE_MB}MB</p>
                <input ref={inputRef} type="file" accept={ACCEPTED.join(',')} className="hidden"
                  onChange={(e) => aceitar(e.target.files?.[0] ?? null)} />
              </div>

              {arquivo && (
                <div className="flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm">
                  <FileSpreadsheet className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate">{arquivo.name}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setArquivo(null); }} aria-label="Remover arquivo">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {erroArquivo && (
                <p className="flex items-center gap-2 text-sm text-destructive"><AlertTriangle className="h-4 w-4" /> {erroArquivo}</p>
              )}
            </div>
          )}

          {/* --------------------------------------------- 2. conferência */}
          {step === 'validacao' && (
            <div className="min-w-0 space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Resumo rot="Vão atualizar" val={summary.atualiza} tom="success" />
                <Resumo rot="Ficam completos" val={summary.ficamCompletos} tom="success" />
                <Resumo rot="Divergentes" val={summary.divergentes} tom="warning" />
                <Resumo rot="Não encontrados" val={summary.semCorrespondencia} tom="muted" />
              </div>

              <p className="text-xs text-muted-foreground">
                {summary.camposPreenchidos} campo(s) serão gravados em {summary.atualiza} cadastro(s).
                {summary.semMudanca > 0 && ` ${summary.semMudanca} linha(s) já estão iguais ao cadastro.`}
                {summary.invalidos > 0 && ` ${summary.invalidos} linha(s) com problema.`}
              </p>

              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-status-warning/40 bg-status-warning/5 p-2.5">
                <Switch checked={sobrescrever} onCheckedChange={setSobrescrever} aria-label="Substituir valores divergentes" />
                <span className="min-w-0 text-xs text-foreground">
                  <strong>Substituir valores divergentes.</strong> Desligado, a planilha só preenche campo vazio e
                  nunca troca o que já está no cadastro. Ligue apenas se a planilha for a fonte correta — isso
                  sobrescreve {summary.divergentes} valor(es) já gravado(s).
                </span>
              </label>

              <div className="min-w-0 overflow-x-auto rounded-lg border border-border/70">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-14">Linha</TableHead>
                      <TableHead className="w-24">Código</TableHead>
                      <TableHead className="min-w-[160px]">Funcionário</TableHead>
                      <TableHead className="w-28">Situação</TableHead>
                      <TableHead className="min-w-[240px]">O que muda</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => <LinhaPrevia key={`${r.line}-${r.cod}`} r={r} />)}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* ----------------------------------------------- 3. resultado */}
          {step === 'confirmacao' && (
            <div className="space-y-3">
              {isSaving ? (
                <div className="space-y-2"><Progress value={progress} /><p className="text-sm text-muted-foreground">Gravando… {progress}%</p></div>
              ) : (
                <>
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{atualizados}</span> cadastro(s) atualizado(s).
                  </p>
                  {erros.length > 0 && (
                    <p className="flex items-center gap-2 text-sm text-destructive">
                      <AlertTriangle className="h-4 w-4" /> {erros.length} linha(s) falharam ao gravar.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------- rodapé */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
          <div className="flex items-center gap-2">
            {step === 'validacao' && (
              <Button variant="ghost" onClick={() => setStep('arquivo')}><ChevronLeft className="mr-1 h-4 w-4" /> Voltar</Button>
            )}
            {step !== 'arquivo' && rows.some((r) => r.status !== 'atualiza' && r.status !== 'sem_mudanca') && (
              <Button variant="outline" onClick={downloadRelatorio}><Download className="mr-1 h-4 w-4" /> Baixar pendências</Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={fechar}>{step === 'confirmacao' ? 'Fechar' : 'Cancelar'}</Button>
            {step === 'arquivo' && (
              <Button disabled={!arquivo || isParsing} onClick={() => arquivo && buildPreview(arquivo)}>
                {isParsing ? 'Lendo…' : 'Conferir'}
              </Button>
            )}
            {step === 'validacao' && (
              <Button disabled={summary.atualiza === 0 || isSaving} onClick={commitUpdate}>
                {isSaving ? 'Gravando…' : `Atualizar ${summary.atualiza} cadastro(s)`}
              </Button>
            )}
          </div>
        </div>
        {file && step === 'arquivo' && <span className="sr-only">{file.name}</span>}
      </DialogContent>
    </Dialog>
  );
}

function Resumo({ rot, val, tom }: { rot: string; val: number; tom: 'success' | 'warning' | 'muted' }) {
  const cor = tom === 'success' ? 'text-success' : tom === 'warning' ? 'text-status-warning' : 'text-muted-foreground';
  return (
    <div className="rounded-lg border border-border/70 px-3 py-2">
      <div className={cn('text-xl font-bold tabular-nums', cor)}>{val}</div>
      <div className="text-[11px] text-muted-foreground">{rot}</div>
    </div>
  );
}

function LinhaPrevia({ r }: { r: UpdateRow }) {
  const meta = STATUS_META[r.status];
  return (
    <TableRow>
      <TableCell className="text-xs tabular-nums text-muted-foreground">{r.line}</TableCell>
      <TableCell className="font-mono text-xs">{r.cod || '—'}</TableCell>
      <TableCell className="max-w-[220px] truncate text-sm">{r.nome || '—'}</TableCell>
      <TableCell>
        <span className={cn('inline-block rounded-full px-2 py-0.5 text-[11px] font-medium', meta.className)}>{meta.label}</span>
      </TableCell>
      <TableCell className="text-xs">
        {r.problema && <p className="text-muted-foreground">{r.problema}</p>}
        {r.plano?.preenchimentos.map((m) => (
          <p key={m.campo} className="text-success">+ {m.rotulo}</p>
        ))}
        {r.plano?.divergencias.map((m) => (
          <p key={m.campo} className="flex items-center gap-1 text-status-warning">
            {m.rotulo}: <span className="line-through opacity-70">{m.de}</span>
            <ArrowRight className="h-3 w-3" />{m.para}
          </p>
        ))}
        {r.status === 'atualiza' && r.faltavaAntes.length > 0 && r.faltaDepois.length === 0 && (
          <p className="mt-0.5 font-medium text-success">Cadastro fica completo</p>
        )}
        {r.faltaDepois.length > 0 && r.status !== 'invalido' && r.status !== 'sem_correspondencia' && (
          <p className="mt-0.5 text-muted-foreground">Continua faltando: {r.faltaDepois.join(', ')}</p>
        )}
      </TableCell>
    </TableRow>
  );
}
