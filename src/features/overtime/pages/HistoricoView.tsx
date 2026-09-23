import { useState } from 'react';
import { CheckCircle2, History, Loader2, RefreshCw, Trash2, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { SectionCard } from '@/components/app/SectionCard';
import { EmptyState } from '@/components/app/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useResourceAccess } from '@/hooks/useResourceAccess';
import { useOvertimeHistory } from '../hooks/useOvertimeHistory';
import { formatMin } from '../domain/tempo';
import { rotuloPeriodo } from '../domain/filtros';
import { VARIANTE_LABEL, type VarianteRelatorio } from '../domain/relatorioHtml';
import type { ImportacaoRow } from '../services/overtimeApi';

const num = 'text-right font-mono tabular-nums';

const dataHora = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export function HistoricoView() {
  const acesso = useResourceAccess('he_historico');
  const h = useOvertimeHistory();
  const [aExcluir, setAExcluir] = useState<ImportacaoRow | null>(null);

  const podeExcluir = h.podeExcluir && (!acesso.granular || acesso.podeExcluir);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <PageHeader
        icon={History}
        title="Histórico"
        description="Importações feitas e relatórios gerados, com quem operou e quando."
        actions={
          <Button variant="outline" className="gap-2" onClick={() => void h.recarregar()} disabled={h.carregando}>
            <RefreshCw className={h.carregando ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        }
      />

      <SectionCard title="Importações" noBodyPadding>
        {h.carregando ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando…
          </div>
        ) : h.importacoes.length === 0 ? (
          <EmptyState icon={History} title="Nenhuma importação registrada" description="A primeira importação aparece aqui." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead className="text-right">Registros</TableHead>
                  <TableHead className="text-right">Horas extras</TableHead>
                  <TableHead>Conciliação</TableHead>
                  <TableHead>Importado por</TableHead>
                  <TableHead>Quando</TableHead>
                  {podeExcluir && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {h.importacoes.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">
                      {rotuloPeriodo(i.data_referencia_inicio, i.data_referencia_fim)}
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-muted-foreground" title={i.arquivo_nome}>
                      {i.arquivo_nome}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{i.layout === 'B' ? 'Ponto Diário' : 'Por período'}</Badge>
                    </TableCell>
                    <TableCell className={num}>{i.qtd_registros}</TableCell>
                    <TableCell className={num}>{formatMin(i.total_extras_min)}</TableCell>
                    <TableCell>
                      {i.conciliacao_ok ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" /> Conferida
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm text-[#7d2318] dark:text-[#e07a6c]">
                          <XCircle className="h-4 w-4" /> Divergente{i.forcada ? ' (liberada)' : ''}
                        </span>
                      )}
                      {i.substituiu_importacao_id && (
                        <span className="ml-2 text-xs text-muted-foreground">substituiu anterior</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{i.responsavel ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                      {dataHora(i.created_at)}
                    </TableCell>
                    {podeExcluir && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          aria-label="Excluir importação"
                          disabled={h.excluindo === i.id}
                          onClick={() => setAExcluir(i)}
                        >
                          {h.excluindo === i.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Relatórios gerados"
        description="Registro de quem exportou dado de ponto — exigência da LGPD."
        noBodyPadding
      >
        {h.relatorios.length === 0 ? (
          <EmptyState icon={History} title="Nenhum relatório gerado ainda" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Gerado por</TableHead>
                  <TableHead>Quando</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {h.relatorios.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {VARIANTE_LABEL[r.tipo as VarianteRelatorio] ?? r.tipo}
                    </TableCell>
                    <TableCell>{rotuloPeriodo(r.periodo_inicio, r.periodo_fim)}</TableCell>
                    <TableCell className="max-w-[300px] truncate font-mono text-xs" title={r.arquivo_nome}>
                      {r.arquivo_nome}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.responsavel ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                      {dataHora(r.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <AlertDialog open={!!aExcluir} onOpenChange={(aberto) => !aberto && setAExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir a importação?</AlertDialogTitle>
            <AlertDialogDescription>
              Os {aExcluir?.qtd_registros} lançamentos de{' '}
              <b>{aExcluir && rotuloPeriodo(aExcluir.data_referencia_inicio, aExcluir.data_referencia_fim)}</b>{' '}
              saem da base. O período fica sem ponto até você reimportar o arquivo do Secullum.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (aExcluir) void h.excluir(aExcluir.id);
                setAExcluir(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
