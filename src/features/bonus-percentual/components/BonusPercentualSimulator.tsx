import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { SectionCard } from '@/components/app/SectionCard';
import { EmptyState } from '@/components/app/EmptyState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { competenciaLabelLong } from '@/features/dashboard/utils/dates';
import { formatCurrencyBRL, formatNumberBR, formatPercentBR } from '@/lib/formatters';
import { BonusPercentualBreakdown } from './BonusPercentualBreakdown';
import { BonusPercentualScale } from './BonusPercentualScale';
import { BonusPercentualStatus } from './BonusPercentualStatus';
import { toCalculoInput } from '../domain/bonusPercentualRow';
import type { BonusPercentualRow } from '../types/bonus-percentual.types';

interface Props { rows: BonusPercentualRow[]; initialConfigId?: string | null }

/** Simulador independente — usa a mesma função pura do cálculo. */
export function BonusPercentualSimulator({ rows, initialConfigId }: Props) {
  const [configId, setConfigId] = useState<string>(
    initialConfigId ?? rows.find(r => r.state.state === 'atual')?.id ?? rows[0]?.id ?? '',
  );
  const [kitsInput, setKitsInput] = useState('13500');

  const config = useMemo(() => rows.find(r => r.id === configId) ?? null, [rows, configId]);
  const kits = useMemo(() => {
    const n = Number(kitsInput.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [kitsInput]);

  if (rows.length === 0) {
    return <EmptyState icon={Calculator} title="Sem configurações" description="Cadastre uma configuração para simular o bônus percentual." />;
  }

  const cfg = config ? toCalculoInput(config) : null;

  return (
    <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
      <SectionCard title="Simulador" description="Escolha a regra e informe a quantidade de kits.">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Configuração</Label>
            <Select value={configId} onValueChange={setConfigId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {rows.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.sentinela ? 'Regra inicial' : competenciaLabelLong(r.vigenciaInicio)} · {r.state.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bp-sim-kits">Quantidade de kits</Label>
            <Input id="bp-sim-kits" inputMode="numeric" value={kitsInput} onChange={(e) => setKitsInput(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="Ex: 13500" className="tabular-nums" />
          </div>
          {config && (
            <div className="rounded-lg border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
              Regra: meta {formatNumberBR(config.metaKits)} kits · bônus da meta {formatCurrencyBRL(config.bonusMeta)} · bloco{' '}
              {formatNumberBR(config.blocoKits)} kits = 100% = {formatCurrencyBRL(config.valorBloco)} ·{' '}
              {config.percentualMaximo != null ? `teto ${formatPercentBR(config.percentualMaximo)}` : 'sem teto'}
            </div>
          )}
          {cfg && (
            <div className="rounded-lg border border-border/70 p-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Escala percentual</p>
              <BonusPercentualScale config={cfg} />
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Detalhamento" description="Percentual atingido e o valor derivado dele.">
        {config && cfg ? (
          <>
            <div className="mb-2"><BonusPercentualStatus state={config.state} /></div>
            <BonusPercentualBreakdown kits={kits} config={cfg} />
          </>
        ) : <p className="text-sm text-muted-foreground">Selecione uma configuração.</p>}
      </SectionCard>
    </div>
  );
}
