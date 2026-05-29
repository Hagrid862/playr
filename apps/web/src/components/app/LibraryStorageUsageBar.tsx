import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useLibraryStorageUsage } from '@/hooks/api/library/useLibraryStorageUsage';
import { formatBytes } from '@/lib/format-bytes';
import { useAuthStore } from '@/stores/auth.store';
import { HardDrivesIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

type LibraryStorageUsageBarProps = {
  className?: string;
};

export function LibraryStorageUsageBar({ className }: LibraryStorageUsageBarProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { data, isLoading, isError } = useLibraryStorageUsage({
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div
        className={cn('space-y-2 px-2 py-1', className)}
        data-testid="library-storage-usage-loading"
      >
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    );
  }

  if (isError || !data?.success || !data.data) {
    return null;
  }

  const { usedBytes, limitBytes, usedPercent } = data.data;
  const clampedPercent = Math.min(100, Math.max(0, usedPercent));

  return (
    <div
      className={cn('space-y-2 px-2 py-1', className)}
      data-testid="library-storage-usage"
      title={`${formatBytes(usedBytes)} of ${formatBytes(limitBytes)} used`}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <HardDrivesIcon className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">Storage</span>
      </div>
      <Progress value={clampedPercent} aria-label={`Storage ${clampedPercent}% full`} />
      <p className="truncate text-xs tabular-nums text-muted-foreground">
        {formatBytes(usedBytes)} of {formatBytes(limitBytes)}
      </p>
    </div>
  );
}
