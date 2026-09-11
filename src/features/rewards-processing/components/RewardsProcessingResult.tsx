import { CheckCircle2, Eye, FileBarChart2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrencyBRL } from '@/lib/formatters';
import { formatDateTimeBR } from '@/lib/dateTime';
import { competenciaLabelLong } from '@/features/dashboard/utils/dates';
import { useResourceAccess } from '@/hooks/useResourceAccess';

export interface ResultData {
  competencia: string;
  baseNomes: string[];
  funcionarios: number;
  comBonus: number;
  semBonus: number;
  valorTotal: number;
  processadoEm: Date;
}

interface Props {
  data: ResultData;
  onDetails: () => void;
  onReport: () => void;
  onNew: () => void;
}

/** Painel de sucesso pós-processamento. */
export function RewardsProcessingResult({ data, onDetails, onReport, onNew }: Props) {
  const acesso = useResourceAccess('gerar_premiacoes');
  return (
    <div className="rounded-2xl border border-success/30 bg-success/[0.04] p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/10 text-success"><CheckCircle2 className="h-6 w-6" /></span>
        <div>
          <p className="text-base font-bold text-foreground">Processamento concluído</p>
          <p className="text-xs text-muted-foreground">{competenciaLabelLong(data.competencia)} · {data.baseNomes.join(', ')} · {formatDateTimeBR(data.processadoEm)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Cell label="Funcionários" value={String(data.funcionarios)} />
        <Cell label="Com premiação" value={String(data.comBonus)} />
        <Cell label="Sem premiação" value={String(data.semBonus)} />
        <div className="rounded-lg border border-[#c8a83f]/40 bg-[#f7f0d7]/40 p-3">
          <p className="text-[11px] text-[#8a6d1f]">Valor total</p>
          <p className="mt-0.5 text-base font-bold text-[#7a5f16]">{formatCurrencyBRL(data.valorTotal)}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button className="gap-1.5" onClick={onReport}><FileBarChart2 className="h-4 w-4" /> Abrir Relatório de Premiações</Button>
        <Button variant="outline" className="gap-1.5" onClick={onDetails}><Eye className="h-4 w-4" /> Ver detalhes</Button>
        {acesso.pode('processar') && <Button variant="ghost" className="gap-1.5" onClick={onNew}><RefreshCw className="h-4 w-4" /> Novo processamento</Button>}
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-bold text-foreground">{value}</p>
    </div>
  );
}
