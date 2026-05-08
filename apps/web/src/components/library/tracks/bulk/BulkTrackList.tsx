import type { BulkTrackItem } from '@/lib/types/library';
import type { ZodGenreInfer } from '@repo/contracts';
import { BulkTrackCard } from './BulkTrackCard';

interface BulkTrackListProps {
  tracks: BulkTrackItem[];
  onUpdateTrack: (id: string, updates: Partial<Omit<BulkTrackItem, 'id' | 'file'>>) => void;
  onRemoveTrack: (id: string) => void;
  onClearAll: () => void;
  genres: ZodGenreInfer[];
  pendingGenres: { id: string; name: string }[];
  isLoadingGenres: boolean;
  onRequestCreateGenre: (onCreated: (genreId: string) => void) => void;
}

export function BulkTrackList({
  tracks,
  onUpdateTrack,
  onRemoveTrack,
  onClearAll,
  genres,
  pendingGenres,
  isLoadingGenres,
  onRequestCreateGenre,
}: BulkTrackListProps) {
  if (tracks.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          {tracks.length} track{tracks.length !== 1 ? 's' : ''} ready
        </h3>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear all
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {tracks.map((track) => (
          <BulkTrackCard
            key={track.id}
            track={track}
            genres={genres}
            pendingGenres={pendingGenres}
            isLoadingGenres={isLoadingGenres}
            onRequestCreateGenre={onRequestCreateGenre}
            onUpdate={(updates) => onUpdateTrack(track.id, updates)}
            onRemove={() => onRemoveTrack(track.id)}
          />
        ))}
      </div>
    </div>
  );
}
