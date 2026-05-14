import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { ImageBrokenIcon, ImageIcon } from '@phosphor-icons/react';
import type { CoverSelectionBannerProps } from './BulkTrackUploadForm.types';

/** Shared dimensions for prominent horizontal cover tiles (embedded + “skip embedded” affordance). */
const prominentTileClass =
  'relative h-[min(6.5rem,17vh)] w-[min(6.5rem,17vh)] max-h-28 max-w-28 shrink-0 overflow-hidden rounded-xl border-2 transition-colors sm:h-28 sm:w-28';

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
  const noneEmbeddedSelected = selectedCoverTrackId === null;

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/15 p-4 sm:p-5">
      <div className="mb-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          From your files
        </p>
        <p className="text-[11px] leading-snug text-muted-foreground/90">
          {albumHasCover
            ? 'Your custom image stays until you tap an embedded image below (that replaces it), or keep this tile selected.'
            : 'Tap an image for the album cover, or keep the first option to skip embedded art.'}
        </p>
      </div>

      <div className="max-h-[min(8rem,22vh)] sm:max-h-[7.5rem]">
        <div className="-mx-1 flex h-[min(7rem,18vh)] max-h-[min(7rem,18vh)] flex-row flex-nowrap items-center gap-3 overflow-x-auto overflow-y-hidden px-1 sm:h-28 sm:max-h-28">
          <button
            type="button"
            aria-label={
              albumHasCover
                ? "Don't use embedded — keeps your custom image"
                : "Don't use embedded cover from audio files"
            }
            onClick={() => onSelectCover(null)}
            className={cn(
              prominentTileClass,
              'inline-flex flex-col items-center justify-center gap-1 bg-background/40 px-1 py-1',
              noneEmbeddedSelected
                ? 'border-primary ring-2 ring-primary/25'
                : 'border-transparent hover:border-muted-foreground/30',
            )}
          >
            <ImageBrokenIcon
              className="size-7 shrink-0 text-muted-foreground sm:size-8"
              weight="duotone"
            />
            <span className="line-clamp-2 w-full px-0.5 text-center text-[9px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">
              {albumHasCover ? 'Custom image' : 'Skip embedded'}
            </span>
          </button>

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
                      prominentTileClass,
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
                      prominentTileClass,
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
    ? ' Replace the current album cover with one of these, or keep your custom image and leave the first option selected.'
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
            aria-label={
              albumHasCover
                ? "Don't use embedded — keeps your custom image"
                : "Don't use embedded cover from audio files"
            }
            onClick={() => onSelectCover(null)}
            className={cn(
              'flex max-w-[220px] items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-sm transition-colors',
              selectedCoverTrackId === null
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50',
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded bg-muted/50">
              <ImageBrokenIcon className="size-6 text-muted-foreground" weight="duotone" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">
                {albumHasCover ? 'Custom image' : "Don't use embedded"}
              </span>
              {albumHasCover ? (
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  Custom image — not from these tracks
                </span>
              ) : null}
            </span>
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
