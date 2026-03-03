import { UploadSimpleIcon } from '@phosphor-icons/react';
import { useCallback, useState } from 'react';

interface BulkAlbumFileDropzoneProps {
  tracksCount: number;
  onFilesAdded: (files: FileList | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function BulkAlbumFileDropzone({
  tracksCount,
  onFilesAdded,
  fileInputRef,
}: BulkAlbumFileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      onFilesAdded(e.dataTransfer?.files ?? null);
    },
    [onFilesAdded],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFilesAdded(e.target.files);
      e.target.value = '';
    },
    [onFilesAdded],
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center
        rounded-xl border-2 border-dashed transition-colors
        ${isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-muted-foreground/50'}
      `}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="sr-only"
        onChange={handleFileInputChange}
      />
      {tracksCount === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 text-center">
          <UploadSimpleIcon size={32} className="text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            Drop audio files here or click to select
          </p>
          <p className="text-xs text-muted-foreground">
            Supports MP3, WAV, FLAC, AAC, and other audio formats
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 px-4 text-center">
          <UploadSimpleIcon size={24} className="text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Drop more files or click to add</p>
        </div>
      )}
    </div>
  );
}
