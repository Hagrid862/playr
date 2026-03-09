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
