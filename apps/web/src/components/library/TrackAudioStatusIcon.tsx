import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  TRACK_AUDIO_FAILED_TOOLTIP,
  TRACK_AUDIO_PROCESSING_TOOLTIP,
} from '@/lib/display-constants';
import { cn } from '@/lib/utils';
import { WarningIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

type TrackAudioStatusIconProps = {
  isProcessing?: boolean;
  isFailed?: boolean;
  className?: string;
  iconClassName?: string;
};

function StatusTooltip({
  label,
  message,
  children,
}: {
  label: string;
  message: string;
  children: ReactNode;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            tabIndex={0}
            aria-label={label}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6} className="max-w-xs">
          {message}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function TrackAudioStatusIcon({
  isProcessing,
  isFailed,
  className,
  iconClassName,
}: TrackAudioStatusIconProps) {
  if (isProcessing) {
    return (
      <span className={cn('inline-flex', className)}>
        <StatusTooltip label="Processing" message={TRACK_AUDIO_PROCESSING_TOOLTIP}>
          <Spinner className={cn('size-4', iconClassName)} aria-hidden />
        </StatusTooltip>
      </span>
    );
  }

  if (isFailed) {
    return (
      <span className={cn('inline-flex', className)}>
        <StatusTooltip label="Processing failed" message={TRACK_AUDIO_FAILED_TOOLTIP}>
          <WarningIcon
            className={cn('text-amber-500', iconClassName)}
            size={16}
            weight="fill"
            aria-hidden
          />
        </StatusTooltip>
      </span>
    );
  }

  return null;
}
