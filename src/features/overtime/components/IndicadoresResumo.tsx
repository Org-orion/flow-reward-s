import { cn } from '@/lib/utils';
import { formatMin } from '../domain/tempo';
import type { ResumoExecutivo } from '../domain/agregacoes';

interface CartaoProps {
  rotulo: string;
  valor: string;
  observacao?: string;
  tom?: 'neutro' | 'amarelo' | 'vermelho';
}

const TOPO = {
  neutro: 'border-t-[#2e7d4f]',
  amarelo: 'border-t-[#d9a520]',
  vermelho: 'border-t-[#c0392b]',
};

const VALOR = {
  neutro: 'text-foreground',
  amarelo: 'text-[#7a5410] dark:text-[#d9a520]',
  vermelho: 'text-[#7d2318] dark:text-[#e07a6c]',
};

function Cartao({ rotulo, valor, observacao, tom = 'neutro' }: CartaoProps) {
  return (
    <div className={cn('rounded-xl border border-border/70 border-t-[3px] bg-card p-4 shadow-[var(--shadow-card)]', TOPO[tom])}>
      <p className="text-[11px] uppercase leading-tight tracking-wider text-muted-foreground">{rotulo}</p>
      <p className={cn('mt-1 font-mono text-2xl font-semibold tabular-nums', VALOR[tom])}>{valor}</p>
      {observacao && <p className="mt-0.5 text-xs text-muted-foreground">{observacao}</p>}
    </div>
  );
}

/**
 * Os quatro indicadores de destaque — os mesmos do topo do relatório impresso.
 * Os rótulos citam o limite CONFIGURADO, e não "2h" fixo: se o administrador
 * mudar a faixa, a tela não pode continuar dizendo o número antigo.
 */
export function IndicadoresResumo({
  resumo, verdeMaxMin, amareloMaxMin,
}: { resumo: ResumoExecutivo; verdeMaxMin: number; amareloMaxMin: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Cartao
        rotulo="Horas extras do período"
        valor={formatMin(resumo.extrasMin)}
        observacao={`${resumo.lancamentos} lançamentos de ponto`}
      />
      <Cartao
        tom="amarelo"
        rotulo={`Ocorrências acima de ${formatMin(verdeMaxMin)}`}
        valor={String(resumo.ocorrencias)}
        observacao={`${formatMin(resumo.extrasNasOcorrenciasMin)} de horas extras`}
      />
      <Cartao
        tom="amarelo"
        rotulo={`Funcionários acima de ${formatMin(verdeMaxMin)}`}
        valor={String(resumo.funcionariosAcima)}
        observacao={`de ${resumo.funcionarios} no período`}
      />
      <Cartao
        tom="vermelho"
        rotulo={`Ocorrências acima de ${formatMin(amareloMaxMin)}`}
        valor={String(resumo.faixas.vermelho)}
        observacao="faixa vermelha"
      />
    </div>
  );
}
