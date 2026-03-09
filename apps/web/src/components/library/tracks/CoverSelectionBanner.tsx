import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { ImageIcon } from '@phosphor-icons/react';
import type { CoverSelectionBannerProps } from './BulkTrackUploadForm.types';

export function CoverSelectionBanner({
  albumHasCover,
  tracksWithCovers,
  selectedCoverTrackId,
  onSelectCover,
}: CoverSelectionBannerProps) {
  const message = albumHasCover
    ? `Cover art found in ${tracksWithCovers.length} track${tracksWithCovers.length !== 1 ? 's' : ''}. Would you like to replace the current album cover?`
    : `Cover art found in ${tracksWithCovers.length} track${tracksWithCovers.length !== 1 ? 's' : ''}. Would you like to use it as the album cover?`;

  return (
    <Alert className="border-primary/20 bg-primary/5">
      <ImageIcon size={20} className="text-primary" />
      <AlertTitle className="text-primary">Cover art detected</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-muted-foreground">{message}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSelectCover(null)}
            className={cn(
              'flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-sm transition-colors',
              selectedCoverTrackId === null
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50',
            )}
          >
            <span className="font-medium">Don&apos;t use</span>
          </button>
          {tracksWithCovers.map(({ trackId, trackName, previewUrl }) => (
            <button
              key={trackId}
              type="button"
              onClick={() => onSelectCover(trackId)}
              className={cn(
                'flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-sm transition-colors',
                selectedCoverTrackId === trackId
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50',
              )}
            >
              <img src={previewUrl} alt="" className="size-10 shrink-0 rounded object-cover" />
              <span className="max-w-32 truncate font-medium" title={trackName}>
                {trackName}
              </span>
            </button>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}
