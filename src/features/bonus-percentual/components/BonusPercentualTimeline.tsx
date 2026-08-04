import { SectionCard } from '@/components/app/SectionCard';
import { BonusPercentualTimelineItem, type BonusPercentualRowHandlers } from './BonusPercentualTimelineItem';
import type { BonusPercentualRow } from '../types/bonus-percentual.types';

/** Linha do tempo — configurações em ordem decrescente de vigência. */
export function BonusPercentualTimeline({ rows, handlers }: { rows: BonusPercentualRow[]; handlers: BonusPercentualRowHandlers }) {
  return (
    <SectionCard title="Linha do tempo de vigências" description="Regras em ordem decrescente. Cada uma vale até o mês anterior à próxima.">
      <div className="space-y-2.5">
        {rows.map(r => <BonusPercentualTimelineItem key={r.id} row={r} handlers={handlers} />)}
      </div>
    </SectionCard>
  );
}
