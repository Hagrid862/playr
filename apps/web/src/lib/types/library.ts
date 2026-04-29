export interface BulkTrackItem {
  id: string;
  file: File;
  title: string;
  trackNumber: number;
  diskNumber: number;
  explicit: boolean;
}

export interface TrackWithCover {
  trackId: string;
  trackName: string;
  coverFile: File;
  previewUrl: string;
}

/** One unique embedded cover image shared by one or more tracks (same SHA-256 bytes). */
export interface CoverArtGroup {
  digest: string;
  representativeTrackId: string;
  trackIds: string[];
  previewUrl: string;
  trackFileNames: string[];
}
