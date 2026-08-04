import { Skeleton } from '@/components/ui/skeleton';

export function BonusPercentualSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-[18px]" aria-busy="true">
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}
