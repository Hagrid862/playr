import type { BulkTrackItem, CoverArtGroup, TrackWithCover } from '@/lib/types/library';
import type { ZodAlbumInfer, ZodGenreInfer } from '@repo/contracts';

export interface BulkTrackUploadFormProps {
  album: ZodAlbumInfer;
  onSubmit: (tracks: BulkTrackItem[], selectedCover: File | null) => void | Promise<void>;
  isLoading?: boolean;
  genres: ZodGenreInfer[];
  pendingGenres: { id: string; name: string }[];
  isLoadingGenres: boolean;
  onRequestCreateGenre: (onCreated: (genreId: string) => void) => void;
}

export type CoverSelectionBannerVariant = 'default' | 'prominent';

export interface CoverSelectionBannerProps {
  albumHasCover: boolean;
  tracksWithCovers: TrackWithCover[];
  /** When set, one tile per distinct embedded image (deduplicated by byte hash). */
  coverGroups?: CoverArtGroup[];
  selectedCoverTrackId: string | null;
  onSelectCover: (trackId: string | null) => void;
  /** Large vertical image-first layout for the album create flow. */
  variant?: CoverSelectionBannerVariant;
}

export interface BulkTrackCardProps {
  track: BulkTrackItem;
  genres: ZodGenreInfer[];
  pendingGenres: { id: string; name: string }[];
  isLoadingGenres: boolean;
  onUpdate: (updates: Partial<Omit<BulkTrackItem, 'id' | 'file'>>) => void;
  onRemove: () => void;
  onRequestCreateGenre: (onCreated: (genreId: string) => void) => void;
}
