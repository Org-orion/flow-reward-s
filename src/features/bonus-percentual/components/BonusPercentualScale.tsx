import { formatCurrencyBRL, formatNumberBR, formatPercentBR } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { buildEscalaPercentual } from '../domain/bonusPercentualEscala';
import type { BonusPercentualInput } from '../domain/bonusPercentualCalculo';

interface Props { config: BonusPercentualInput }

/**
 * Escala de referência: kits → percentual → valor. Inclui múltiplos fracionários
 * (0,5 e 2,5 bloco) justamente para deixar visível que frações contam.
 */
export function BonusPercentualScale({ config }: Props) {
  const pontos = buildEscalaPercentual(config);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[380px] text-sm">
        <thead>
          <tr className="bg-muted/50 text-left">
            <th className="px-3 py-1.5 font-medium">Kits</th>
            <th className="px-3 py-1.5 text-right font-medium">Excedente</th>
            <th className="px-3 py-1.5 text-right font-medium">Percentual</th>
            <th className="px-3 py-1.5 text-right font-medium">Adicional</th>
            <th className="px-3 py-1.5 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {pontos.map(({ multiplo, kits, breakdown }) => (
            <tr key={multiplo} className="border-t border-border/50">
              <td className="px-3 py-1.5 tabular-nums text-foreground">{formatNumberBR(kits)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{formatNumberBR(breakdown.excedente)}</td>
              <td className={cn('px-3 py-1.5 text-right font-bold tabular-nums text-[#7a5f16]', breakdown.tetoAplicado && 'text-status-warning')}>
                {formatPercentBR(breakdown.percentualAplicado)}
                {breakdown.tetoAplicado && <span className="ml-1 text-[10px] font-normal">(teto)</span>}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-foreground">{formatCurrencyBRL(breakdown.adicional)}</td>
              <td className="px-3 py-1.5 text-right font-medium tabular-nums text-foreground">{formatCurrencyBRL(breakdown.bonusTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
