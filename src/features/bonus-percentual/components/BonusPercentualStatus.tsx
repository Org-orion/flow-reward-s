import { StatusBadge } from '@/components/app/StatusBadge';
import type { BonusPercentualState } from '../types/bonus-percentual.types';

export function BonusPercentualStatus({ state }: { state: BonusPercentualState }) {
  return <StatusBadge variant={state.variant}>{state.label}</StatusBadge>;
}
