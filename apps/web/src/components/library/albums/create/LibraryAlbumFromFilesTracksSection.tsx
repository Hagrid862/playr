import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { BulkTrackItem } from '@/lib/types/library';
import { CircleNotchIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { BulkTrackCard } from '../../tracks/bulk/BulkTrackCard';

interface LibraryAlbumFromFilesTracksSectionProps {
  tracks: BulkTrackItem[];
  submitError: string | null;
  isFormValid: boolean;
  isSubmitting: boolean;
  isLoadingArtists: boolean;
  progressStep: string | null;
  cancelTo: string;
  /** When false, only the track list is rendered (actions live in the parent form footer). */
  showActions?: boolean;
  onUpdateTrack: (id: string, updates: Partial<Omit<BulkTrackItem, 'id' | 'file'>>) => void;
  onRemoveTrack: (id: string) => void;
  onClearTracks: () => void;
}

export function LibraryAlbumFromFilesTracksSection({
  tracks,
  submitError,
  isFormValid,
  isSubmitting,
  isLoadingArtists,
  progressStep,
  cancelTo,
  showActions = true,
  onUpdateTrack,
  onRemoveTrack,
  onClearTracks,
}: LibraryAlbumFromFilesTracksSectionProps) {
  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            {tracks.length} track{tracks.length !== 1 ? 's' : ''} ready
          </h3>
          <Button type="button" variant="ghost" size="sm" onClick={onClearTracks}>
            Clear tracks
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          {tracks.map((track) => (
            <BulkTrackCard
              key={track.id}
              track={track}
              onUpdate={(updates) => onUpdateTrack(track.id, updates)}
              onRemove={() => onRemoveTrack(track.id)}
            />
          ))}
        </div>
      </div>

      {submitError && <p className="text-sm text-destructive">{submitError}</p>}

      {showActions && (
        <>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <Button asChild variant="secondary" type="button" className="min-w-32">
              <Link to={cancelTo}>Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || isSubmitting || isLoadingArtists}
              className="min-w-32"
            >
              {isSubmitting ? (
                <>
                  <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
                  {progressStep ?? 'Creating...'}
                </>
              ) : (
                <>
                  <UploadSimpleIcon className="mr-2 h-4 w-4" />
                  Create album & upload {tracks.length} track{tracks.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </>
  );
}
