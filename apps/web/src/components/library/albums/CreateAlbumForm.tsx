import { DatePickerField, TextAreaField, TextField } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FormData } from '@/hooks/forms/useCreateAlbumForm';
import {
  CameraIcon,
  CircleNotchIcon,
  MusicNotesIcon,
  PlusIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { SyntheticEvent, useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

interface CreateAlbumFormProps {
  id?: string;
  formData: FormData;
  isLoading: boolean;
  isValid: boolean;
  type?: FormData['type'];
  onSubmit: (e: SyntheticEvent<HTMLFormElement>) => void | Promise<void>;
  onChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onBlur: (field: keyof FormData) => void;
  getFieldError: (field: keyof FormData) => string | undefined;
}

export function CreateAlbumForm({
  id,
  formData,
  isLoading,
  isValid,
  type = 'album',
  onSubmit,
  onChange,
  onBlur,
  onFileSelect,
  getFieldError,
}: CreateAlbumFormProps & { onFileSelect?: (file: File | null) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
  const [isMultipleFilesModalOpen, setIsMultipleFilesModalOpen] = useState(false);

  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      onFileSelect?.(file);
    } else {
      setPreviewUrl(null);
      onFileSelect?.(null);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onFileSelect?.(null);
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsDragging(false);

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        if (e.dataTransfer.files.length > 1) {
          setIsMultipleFilesModalOpen(true);
          return;
        }

        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          setPreviewUrl(URL.createObjectURL(file));
          onFileSelect?.(file);

          if (fileInputRef.current) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInputRef.current.files = dataTransfer.files;
          }
        } else {
          setIsFormatModalOpen(true);
        }
      }
    };

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
  }, [onFileSelect]);

  return (
    <>
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="rounded-xl border-2 border-dashed border-primary bg-primary/10 p-12 text-center shadow-lg">
            <h2 className="text-2xl font-bold text-primary">Drop cover image here</h2>
            <p className="mt-2 text-muted-foreground">Release to upload the artwork</p>
          </div>
        </div>
      )}

      <Dialog open={isMultipleFilesModalOpen} onOpenChange={setIsMultipleFilesModalOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Too Many Files</DialogTitle>
            <DialogDescription>
              You can only upload one cover image at a time. Please drop exactly one image file.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button onClick={() => setIsMultipleFilesModalOpen(false)}>OK</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFormatModalOpen} onOpenChange={setIsFormatModalOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Invalid File Format</DialogTitle>
            <DialogDescription>
              The file you dropped is not a supported image format. Please upload an image file.
              Supported formats typically include JPG, PNG, WEBP, etc.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button onClick={() => setIsFormatModalOpen(false)}>OK</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <form id={id} className="flex flex-col gap-8" onSubmit={onSubmit}>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
        <div className="pt-6">
          <div className="flex flex-col md:flex-row gap-8 md:gap-10">
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="relative">
                {/* Glow behind the cover */}
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 size-40 rounded-2xl object-cover blur-xl opacity-40 scale-105 translate-y-2 saturate-150 pointer-events-none"
                  />
                )}
                <div
                  className="group relative size-40 rounded-2xl bg-stone-900 border-2 border-stone-700/60 flex items-center justify-center overflow-hidden hover:border-primary/50 transition-all cursor-pointer shadow-xl"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={formData.name || 'Cover Preview'}
                      className="size-full object-cover group-hover:opacity-60 transition-opacity"
                    />
                  ) : (
                    <MusicNotesIcon
                      size={44}
                      className="text-muted-foreground group-hover:text-primary transition-colors"
                      weight="duotone"
                    />
                  )}
                  <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="flex flex-col items-center gap-1.5">
                      <CameraIcon size={22} className="text-white" />
                      <span className="text-[9px] font-bold text-white uppercase tracking-widest">
                        {previewUrl ? 'Change Cover' : 'Upload Cover'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {previewUrl ? (
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={handleRemoveImage}
                  className="text-xs text-muted-foreground hover:text-red-400 gap-1"
                >
                  <TrashIcon size={12} />
                  Remove
                </Button>
              ) : (
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                  Artwork
                </span>
              )}
            </div>

            <div className="flex-1 flex flex-col gap-6">
              <TextField
                label={`${typeLabel} Title`}
                placeholder="e.g. Nevermind"
                value={formData.name}
                error={getFieldError('name')}
                onChange={(value) => onChange('name', value)}
                onBlur={() => onBlur('name')}
              />

              <TextAreaField
                label="Description"
                placeholder={`Tell something about this ${type}...`}
                value={formData.description || ''}
                error={getFieldError('description')}
                onChange={(value) => onChange('description', value)}
                onBlur={() => onBlur('description')}
                className="min-h-32"
              />

              <DatePickerField
                label="Release Date"
                value={formData.releaseDate ? new Date(formData.releaseDate) : undefined}
                error={getFieldError('releaseDate')}
                onChange={(date) => onChange('releaseDate', date || null)}
                onBlur={() => onBlur('releaseDate')}
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-4">
          <Button asChild variant="secondary" type="button" className="min-w-32">
            <Link to="..">Cancel</Link>
          </Button>
          <Button type="submit" disabled={!isValid || isLoading} className="min-w-32 group">
            {isLoading ? (
              <>
                <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <PlusIcon className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
                Create {typeLabel}
              </>
            )}
          </Button>
        </div>
      </form>
    </>
  );
}
