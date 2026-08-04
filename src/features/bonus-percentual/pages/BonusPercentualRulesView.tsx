import { CurrentBonusPercentualRule } from '../components/CurrentBonusPercentualRule';
import { BonusPercentualContext } from '../components/BonusPercentualContext';
import { BonusPercentualTimeline } from '../components/BonusPercentualTimeline';
import type { BonusPercentualRowHandlers } from '../components/BonusPercentualTimelineItem';
import type { BonusPercentualRow } from '../types/bonus-percentual.types';

interface Props {
  rows: BonusPercentualRow[];
  atual: BonusPercentualRow | null;
  proxima: BonusPercentualRow | null;
  handlers: BonusPercentualRowHandlers;
  onNovaVigencia: () => void;
}

export function BonusPercentualRulesView({ rows, atual, proxima, handlers, onNovaVigencia }: Props) {
  return (
    <div className="space-y-[18px]">
      <CurrentBonusPercentualRule atual={atual} proxima={proxima} onSimular={handlers.onSimular} onNovaVigencia={onNovaVigencia} />
      <BonusPercentualContext rows={rows} atual={atual} proxima={proxima} />
      <BonusPercentualTimeline rows={rows} handlers={handlers} />
    </div>
  );
}
