import { cn } from '@/lib/utils';
import { UploadSimpleIcon } from '@phosphor-icons/react';
import { useCallback, useRef, useState } from 'react';

interface AlbumAudioDropCardProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onAddFiles: (files: FileList | null) => void;
  /** When true, show a more compact prompt (tracks already staged). */
  compact?: boolean;
}

export function AlbumAudioDropCard({
  fileInputRef,
  onAddFiles,
  compact = false,
}: AlbumAudioDropCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);
      if (e.dataTransfer?.files?.length) {
        onAddFiles(e.dataTransfer.files);
      }
    },
    [onAddFiles],
  );

  return (
    <div
      className="w-full"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={(e) => {
          onAddFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/5 text-center transition-colors hover:border-muted-foreground/50',
          compact ? 'py-8' : 'py-14',
          isDragging && 'border-primary bg-primary/5',
        )}
      >
        <UploadSimpleIcon
          className={cn('text-muted-foreground', isDragging && 'text-primary')}
          size={compact ? 28 : 36}
          weight="duotone"
        />
        <p className="text-sm font-medium text-foreground">Click here or drop audio files</p>
        <p className="max-w-sm px-4 text-xs text-muted-foreground">
          Add one file or many — metadata and titles are filled in automatically when possible.
        </p>
      </button>
    </div>
  );
}
