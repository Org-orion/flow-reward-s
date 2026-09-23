import { cn } from '@/lib/utils';
import { FAIXA_LABEL, type Faixa } from '../domain/faixas';
import { formatMin } from '../domain/tempo';

/**
 * Cores do semáforo — as MESMAS do relatório impresso (domain/relatorioHtml).
 * Quem confere a tela contra o PDF precisa ver o mesmo vermelho nos dois.
 */
export const FAIXA_CLASSE: Record<Faixa, string> = {
  verde: 'bg-[#e6efe6] text-[#1c3a29] border-l-[3px] border-l-[#2e7d4f]',
  amarelo: 'bg-[#fbf0d5] text-[#7a5410] border-l-[3px] border-l-[#d9a520]',
  vermelho: 'bg-[#f9e1dd] text-[#7d2318] border-l-[3px] border-l-[#c0392b]',
  sem_extra: 'bg-muted text-muted-foreground border-l-[3px] border-l-border',
};

export const FAIXA_PONTO: Record<Faixa, string> = {
  verde: 'bg-[#2e7d4f]',
  amarelo: 'bg-[#d9a520]',
  vermelho: 'bg-[#c0392b]',
  sem_extra: 'bg-border',
};

interface Props {
  faixa: Faixa;
  /** Quando informado, exibe o valor; senão, o nome da faixa. */
  minutos?: number;
  className?: string;
}

export function FaixaBadge({ faixa, minutos, className }: Props) {
  return (
    <span
      className={cn(
        'inline-block rounded-sm px-1.5 py-0.5 font-mono text-xs tabular-nums',
        FAIXA_CLASSE[faixa],
        className,
      )}
    >
      {minutos === undefined ? FAIXA_LABEL[faixa] : formatMin(minutos)}
    </span>
  );
}

/** Legenda do semáforo, com as contagens do recorte. */
export function FaixaLegenda({ contagens }: { contagens: Record<Faixa, number> }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {(['verde', 'amarelo', 'vermelho', 'sem_extra'] as Faixa[]).map((f) => (
        <span key={f} className="inline-flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', FAIXA_PONTO[f])} />
          {FAIXA_LABEL[f]}
          <b className="font-mono tabular-nums text-foreground">{contagens[f]}</b>
        </span>
      ))}
    </div>
  );
}
