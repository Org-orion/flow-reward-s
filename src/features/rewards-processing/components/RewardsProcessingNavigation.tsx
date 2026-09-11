import { cn } from '@/lib/utils';
import { REWARDS_VIEWS, type RewardsView } from '../views';

interface Props {
  active: RewardsView;
  onChange: (v: RewardsView) => void;
  /** Visões permitidas ao usuário. Ausente = todas. */
  disponiveis?: RewardsView[];
}

export function RewardsProcessingNavigation({ active, onChange, disponiveis }: Props) {
  const views = disponiveis ? REWARDS_VIEWS.filter(v => disponiveis.includes(v.key)) : REWARDS_VIEWS;
  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = views.findIndex(v => v.key === active);
    if (e.key === 'ArrowRight' && i < views.length - 1) { e.preventDefault(); onChange(views[i + 1].key); }
    if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); onChange(views[i - 1].key); }
  };
  return (
    <nav role="tablist" aria-label="Visões de processamento" onKeyDown={onKeyDown} className="flex gap-1.5 overflow-x-auto pb-0.5">
      {views.map(v => {
        const isActive = v.key === active;
        const Icon = v.icon;
        return (
          <button key={v.key} type="button" role="tab" aria-selected={isActive} tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(v.key)}
            className={cn('inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
              isActive ? 'bg-[#08783e] text-white shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
            <Icon className="h-4 w-4" /> {v.label}
          </button>
        );
      })}
    </nav>
  );
}
