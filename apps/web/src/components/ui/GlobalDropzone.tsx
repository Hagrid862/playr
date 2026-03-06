import { useGlobalDragStore } from '@/hooks/use-global-drag';
import { cn } from '@/lib/utils';
import { UploadSimpleIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useRef } from 'react';

interface GlobalDropzoneProps {
  onDrop: (files: FileList) => void;
  children?: React.ReactNode;
  className?: string;
  overlayTitle?: string;
  overlayDescription?: string;
}

export function GlobalDropzone({
  onDrop,
  children,
  className,
  overlayTitle = 'Drop files to upload',
  overlayDescription = 'Your files will be processed automatically',
}: GlobalDropzoneProps) {
  const { isDragging, setIsDragging } = useGlobalDragStore();
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, [setIsDragging]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, [setIsDragging]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      onDrop(e.dataTransfer.files);
    }
  }, [onDrop, setIsDragging]);

  useEffect(() => {
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return (
    <div className={cn('relative w-full h-full', className)}>
      {children}
      
      {isDragging && (
        <div 
          className="fixed inset-0 z-[40] flex items-center justify-center bg-background/60 backdrop-blur-md transition-all duration-300 animate-in fade-in"
          style={{ 
            // Ensure it's below the player which we'll set to z-50 or similar
            // and above the rest of the content.
          }}
        >
          <div className="flex flex-col items-center gap-4 p-12 rounded-3xl border-2 border-dashed border-primary/50 bg-primary/5 scale-110 shadow-2xl">
            <div className="p-4 bg-primary/10 rounded-full">
              <UploadSimpleIcon size={48} weight="duotone" className="text-primary animate-bounce" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{overlayTitle}</h2>
              <p className="text-muted-foreground mt-1">{overlayDescription}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
