import { CircleNotchIcon } from '@phosphor-icons/react';

interface LibraryAlbumFromFilesProcessingOverlayProps {
  message: string;
}

/** Full-screen overlay for processing state. Leaves playback controls visible at bottom. */
export function LibraryAlbumFromFilesProcessingOverlay({
  message,
}: LibraryAlbumFromFilesProcessingOverlayProps) {
  return (
    <div
      className="fixed inset-x-0 top-0 bottom-20 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-4">
        <CircleNotchIcon className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium text-foreground">{message}</p>
        <p className="text-sm text-muted-foreground">
          Extracting metadata and cover art from your files...
        </p>
      </div>
    </div>
  );
}
