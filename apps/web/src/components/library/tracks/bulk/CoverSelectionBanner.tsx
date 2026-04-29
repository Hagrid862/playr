import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { ImageIcon } from '@phosphor-icons/react';
import type { CoverSelectionBannerProps } from './BulkTrackUploadForm.types';

function isGroupSelected(
  group: { trackIds: string[]; representativeTrackId: string },
  selectedCoverTrackId: string | null,
) {
  if (selectedCoverTrackId == null) return false;
  return (
    group.trackIds.includes(selectedCoverTrackId) ||
    group.representativeTrackId === selectedCoverTrackId
  );
}

function ProminentCoverPicker({
  albumHasCover,
  tracksWithCovers,
  coverGroups,
  selectedCoverTrackId,
  onSelectCover,
}: CoverSelectionBannerProps) {
  const hasGroups = coverGroups && coverGroups.length > 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/15 p-4 sm:p-5">
      <div className="mb-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          From your files
        </p>
        <p className="text-[11px] leading-snug text-muted-foreground/90">
          {albumHasCover
            ? 'Tap an image to use it instead of your manual cover, or skip.'
            : 'Tap an image for the album cover, or skip.'}
        </p>
      </div>

      <div className="max-h-[min(8rem,22vh)] sm:max-h-[7.5rem]">
        <div className="-mx-1 flex h-[min(7rem,18vh)] max-h-[min(7rem,18vh)] flex-row flex-nowrap items-center gap-3 overflow-x-auto overflow-y-hidden px-1 sm:h-28 sm:max-h-28">
          {hasGroups
            ? coverGroups!.map((group) => {
                const selected = isGroupSelected(group, selectedCoverTrackId);
                const count = group.trackIds.length;
                return (
                  <button
                    key={group.digest}
                    type="button"
                    aria-label={
                      count > 1
                        ? `Use embedded cover shared by ${count} files`
                        : `Use embedded cover from ${group.trackFileNames[0] ?? 'track'}`
                    }
                    onClick={() => onSelectCover(group.representativeTrackId)}
                    title={group.trackFileNames.join(', ')}
                    className={cn(
                      'relative h-[min(6.5rem,17vh)] w-[min(6.5rem,17vh)] max-h-28 max-w-28 shrink-0 overflow-hidden rounded-xl border-2 transition-colors sm:h-28 sm:w-28',
                      selected
                        ? 'border-primary ring-2 ring-primary/25'
                        : 'border-transparent bg-background/40 hover:border-muted-foreground/30',
                    )}
                  >
                    <img src={group.previewUrl} alt="" className="size-full object-cover" />
                    {count > 1 && (
                      <span className="absolute bottom-1 right-1 rounded bg-black/65 px-1 py-px text-[9px] font-medium tabular-nums text-white">
                        {count}×
                      </span>
                    )}
                  </button>
                );
              })
            : tracksWithCovers.map(({ trackId, trackName, previewUrl }) => {
                const selected = selectedCoverTrackId === trackId;
                return (
                  <button
                    key={trackId}
                    type="button"
                    aria-label={`Use embedded cover from ${trackName}`}
                    onClick={() => onSelectCover(trackId)}
                    title={trackName}
                    className={cn(
                      'relative h-[min(6.5rem,17vh)] w-[min(6.5rem,17vh)] max-h-28 max-w-28 shrink-0 overflow-hidden rounded-xl border-2 transition-colors sm:h-28 sm:w-28',
                      selected
                        ? 'border-primary ring-2 ring-primary/25'
                        : 'border-transparent bg-background/40 hover:border-muted-foreground/30',
                    )}
                  >
                    <img src={previewUrl} alt="" className="size-full object-cover" />
                  </button>
                );
              })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelectCover(null)}
        className={cn(
          'mt-4 w-full rounded-lg border py-2.5 text-center text-xs font-medium transition-colors',
          selectedCoverTrackId === null
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground',
        )}
      >
        None from tracks
      </button>
    </div>
  );
}

export function CoverSelectionBanner({
  albumHasCover,
  tracksWithCovers,
  coverGroups,
  selectedCoverTrackId,
  onSelectCover,
  variant = 'default',
}: CoverSelectionBannerProps) {
  if (variant === 'prominent') {
    return (
      <ProminentCoverPicker
        albumHasCover={albumHasCover}
        tracksWithCovers={tracksWithCovers}
        coverGroups={coverGroups}
        selectedCoverTrackId={selectedCoverTrackId}
        onSelectCover={onSelectCover}
      />
    );
  }

  const trackCount = tracksWithCovers.length;
  const uniqueImages = coverGroups && coverGroups.length > 0 ? coverGroups.length : trackCount;

  const baseMessage =
    uniqueImages === trackCount
      ? `Cover art found in ${trackCount} track${trackCount !== 1 ? 's' : ''}.`
      : `Cover art found in ${trackCount} track${trackCount !== 1 ? 's' : ''} (${uniqueImages} unique image${uniqueImages !== 1 ? 's' : ''}).`;

  const question = albumHasCover
    ? ' Replace the current album cover with one of these, or keep your uploaded cover and pick an embedded image below.'
    : ' Use one of these as the album cover?';

  return (
    <Alert className="border-primary/20 bg-primary/5">
      <ImageIcon size={20} className="text-primary" />
      <AlertTitle className="text-primary">Cover art detected</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-muted-foreground">
          {baseMessage}
          {question}
        </p>
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
            <span className="font-medium">Don&apos;t use embedded</span>
          </button>
          {coverGroups && coverGroups.length > 0
            ? coverGroups.map((group) => {
                const selected = isGroupSelected(group, selectedCoverTrackId);
                const label =
                  group.trackIds.length > 1
                    ? `${group.trackIds.length} tracks`
                    : (group.trackFileNames[0] ?? 'Track');
                return (
                  <button
                    key={group.digest}
                    type="button"
                    onClick={() => onSelectCover(group.representativeTrackId)}
                    className={cn(
                      'flex max-w-[220px] items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-sm transition-colors',
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50',
                    )}
                    title={group.trackFileNames.join(', ')}
                  >
                    <img
                      src={group.previewUrl}
                      alt=""
                      className="size-10 shrink-0 rounded object-cover"
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
                  </button>
                );
              })
            : tracksWithCovers.map(({ trackId, trackName, previewUrl }) => (
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
