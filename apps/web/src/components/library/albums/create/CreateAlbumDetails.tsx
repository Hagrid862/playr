import { DatePickerField, TextAreaField, TextField } from '@/components/form';
import { Button } from '@/components/ui/button';
import type { FormData } from './useCreateAlbumForm';
import { CameraIcon, MusicNotesIcon, TrashIcon } from '@phosphor-icons/react';

interface CreateAlbumDetailsProps {
  formData: FormData;
  type: string;
  typeLabel: string;
  previewUrl: string | null;
  getFieldError: (field: keyof FormData) => string | undefined;
  onChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onBlur: (field: keyof FormData) => void;
  onCoverClick: () => void;
  onRemoveImage: () => void;
}

export function CreateAlbumDetails({
  formData,
  type,
  typeLabel,
  previewUrl,
  getFieldError,
  onChange,
  onBlur,
  onCoverClick,
  onRemoveImage,
}: CreateAlbumDetailsProps) {
  return (
    <div className="flex flex-col md:flex-row gap-8 md:gap-10">
      <div className="flex flex-col items-center gap-3 shrink-0">
        <div className="relative">
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
            onClick={onCoverClick}
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
            onClick={onRemoveImage}
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
  );
}
