import type { BulkTrackItem, TrackWithCover } from '@/lib/types/library';
import type { ZodAlbumInfer } from '@repo/contracts';

export interface BulkTrackUploadFormProps {
  album: ZodAlbumInfer;
  onSubmit: (tracks: BulkTrackItem[], selectedCover: File | null) => void | Promise<void>;
  isLoading?: boolean;
}

export interface CoverSelectionBannerProps {
  albumHasCover: boolean;
  tracksWithCovers: TrackWithCover[];
  selectedCoverTrackId: string | null;
  onSelectCover: (trackId: string | null) => void;
}

export interface BulkTrackCardProps {
  track: BulkTrackItem;
  onUpdate: (updates: Partial<Omit<BulkTrackItem, 'id' | 'file'>>) => void;
  onRemove: () => void;
}

