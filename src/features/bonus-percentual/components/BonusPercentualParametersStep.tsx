import { AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { formatCurrencyBRL, formatNumberBR } from '@/lib/formatters';
import { BonusPercentualBreakdown } from './BonusPercentualBreakdown';
import { vigenciaLabel } from './periodLabel';
import { kitsExemplo } from '../domain/bonusPercentualCalculo';
import type { useBonusPercentualEditor } from '../hooks/useBonusPercentualEditor';
import type { BonusPercentualRow } from '../types/bonus-percentual.types';

type Editor = ReturnType<typeof useBonusPercentualEditor>;

interface Props { ed: Editor; duplicado: BonusPercentualRow | undefined; onOpenExisting: (r: BonusPercentualRow) => void }

const soNumero = (v: string) => v.replace(/[^\d.,]/g, '');

export function BonusPercentualParametersStep({ ed, duplicado, onOpenExisting }: Props) {
  const p = ed.parsed;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="bp-vig">Vigência a partir de *</Label>
          <Input id="bp-vig" type="month" value={ed.vigencia} onChange={(e) => ed.setVigencia(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bp-meta">Meta de kits *</Label>
          <Input id="bp-meta" inputMode="numeric" value={ed.meta} onChange={(e) => ed.setMeta(soNumero(e.target.value))} placeholder="Ex: 11000" className="tabular-nums" />
          <p className="text-[11px] text-muted-foreground">O adicional percentual só começa a contar acima deste valor.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bp-bonus-meta">Bônus ao bater a meta (R$) *</Label>
          <Input id="bp-bonus-meta" inputMode="decimal" value={ed.bonusMeta} onChange={(e) => ed.setBonusMeta(soNumero(e.target.value))} placeholder="Ex: 100" className="tabular-nums" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bp-bloco">Bloco de kits (= 100%) *</Label>
          <Input id="bp-bloco" inputMode="numeric" value={ed.bloco} onChange={(e) => ed.setBloco(soNumero(e.target.value))} placeholder="Ex: 1000" className="tabular-nums" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bp-valor">Valor por bloco (R$) *</Label>
          <Input id="bp-valor" inputMode="decimal" value={ed.valorBloco} onChange={(e) => ed.setValorBloco(soNumero(e.target.value))} placeholder="Ex: 100" className="tabular-nums" />
          <p className="text-[11px] text-muted-foreground">Valor equivalente a 100% (um bloco completo acima da meta).</p>
        </div>
        <div className="space-y-1.5">
          <Label>Percentual máximo</Label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={ed.semTeto} onCheckedChange={(v) => ed.setSemTeto(!!v)} /> Sem teto
          </label>
          {!ed.semTeto && (
            <Input inputMode="decimal" value={ed.percentualMaximo} onChange={(e) => ed.setPercentualMaximo(soNumero(e.target.value))} placeholder="Ex: 500" className="tabular-nums" />
          )}
          <p className="text-[11px] text-muted-foreground">Diferente do máximo de faixas dos kits, este teto <strong>é aplicado</strong> no cálculo.</p>
        </div>
      </div>

      {p.metaKits != null && p.blocoKits != null && p.valorBloco != null && p.blocoKits > 0 && (
        <p className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm text-foreground">
          Regra: acima de <strong>{formatNumberBR(p.metaKits)} kits</strong>, cada{' '}
          <strong>{formatNumberBR(p.blocoKits)} kits</strong> equivalem a <strong className="text-[#7a5f16]">100%</strong> ={' '}
          <strong>{formatCurrencyBRL(p.valorBloco)}</strong>, proporcionalmente.
        </p>
      )}

      {duplicado && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="text-foreground">Já existe uma configuração para <strong>{vigenciaLabel(duplicado)}</strong>.</p>
            <Button variant="link" className="h-auto p-0 text-xs" onClick={() => onOpenExisting(duplicado)}>Ver configuração existente</Button>
          </div>
        </div>
      )}

      {ed.podePrevia && (
        <div className="rounded-xl border border-[#c8a83f]/40 bg-[#f7f0d7]/40 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a6d1f]">
            Prévia — {formatNumberBR(kitsExemplo(ed.configPreview))} kits (2,5 blocos acima da meta)
          </p>
          <div className="mt-1.5">
            <BonusPercentualBreakdown kits={kitsExemplo(ed.configPreview)} config={ed.configPreview} compact />
          </div>
        </div>
      )}

      {ed.validation.errors.length > 0 && (
        <ul className="space-y-0.5 text-xs text-destructive">{ed.validation.errors.map((e, i) => <li key={i}>• {e}</li>)}</ul>
      )}
    </div>
  );
}
