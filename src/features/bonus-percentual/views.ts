import { CalendarClock, Calculator, type LucideIcon } from 'lucide-react';

export type BonusPercentualView = 'regras' | 'simulador';

export interface BonusPercentualViewDef { key: BonusPercentualView; label: string; icon: LucideIcon }

export const BONUS_PERCENTUAL_VIEWS: BonusPercentualViewDef[] = [
  { key: 'regras', label: 'Regras e Vigências', icon: CalendarClock },
  { key: 'simulador', label: 'Simulador', icon: Calculator },
];

export const DEFAULT_BONUS_PERCENTUAL_VIEW: BonusPercentualView = 'regras';

export function normalizeBonusPercentualView(v: string | null): BonusPercentualView {
  return BONUS_PERCENTUAL_VIEWS.some(x => x.key === v) ? (v as BonusPercentualView) : DEFAULT_BONUS_PERCENTUAL_VIEW;
}
