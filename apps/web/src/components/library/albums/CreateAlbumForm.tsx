import { DatePickerField, TextAreaField, TextField } from '@/components/form';
import { Button } from '@/components/ui/button';
import { FormData } from '@/hooks/forms/useCreateAlbumForm';
import { CircleNotchIcon, MusicNotesIcon, PlusIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { SyntheticEvent, useRef, useState } from 'react';
import { Separator } from '@/components/ui/separator';

interface CreateAlbumFormProps {
  id?: string;
  formData: FormData;
  isLoading: boolean;
  isValid: boolean;
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
  onSubmit,
  onChange,
  onBlur,
  onFileSelect,
  getFieldError,
}: CreateAlbumFormProps & { onFileSelect?: (file: File | null) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  return (
    <form id={id} className="flex flex-col gap-8" onSubmit={onSubmit}>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
      <div className="pt-6">
        <div className="flex flex-col md:flex-row gap-10">
          <div className="flex flex-col items-center gap-3">
            <div
              className="group relative w-32 h-32 rounded-lg bg-stone-800 border-2 border-dashed border-stone-700 flex items-center justify-center overflow-hidden hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Cover Preview" className="w-full h-full object-cover" />
              ) : (
                <MusicNotesIcon
                  size={40}
                  className="text-muted-foreground group-hover:text-primary transition-colors"
                  weight="duotone"
                />
              )}
              <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] text-white font-medium uppercase tracking-wider text-center px-2">
                {previewUrl ? 'Change Cover' : 'Upload Cover'}
              </div>
            </div>
            {!previewUrl ? (
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest leading-none">
                Artwork
              </span>
            ) : (
              <Button variant="ghost" size="sm" onClick={handleRemoveImage}>
                Remove image
              </Button>
            )}
          </div>

          <div className="flex-1 flex flex-col gap-6">
            <TextField
              label="Album Title"
              placeholder="e.g. Nevermind"
              value={formData.name}
              error={getFieldError('name')}
              onChange={(value) => onChange('name', value)}
              onBlur={() => onBlur('name')}
            />

            <TextAreaField
              label="Description"
              placeholder="Tell something about this album..."
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
          <Link to=".." search={(prev) => prev}>
            Cancel
          </Link>
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
              Create Album
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
