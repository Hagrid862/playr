import { DatePickerField, SelectField, TextAreaField, TextField } from '@/components/form';
import { AlbumType } from '@repo/db';
import { Link } from '@tanstack/react-router';
import type { BulkAlbumFormData } from '@/hooks/forms/useBulkAlbumUploadForm';

const albumTypeOptions = Object.entries(AlbumType).map(([key, value]) => ({
  value,
  label: key.charAt(0).toUpperCase() + key.slice(1),
}));

interface BulkAlbumDetailsSectionProps {
  formData: BulkAlbumFormData;
  artists: { id: string; name: string }[];
  isLoadingArtists: boolean;
  onUpdate: <K extends keyof BulkAlbumFormData>(field: K, value: BulkAlbumFormData[K]) => void;
}

export function BulkAlbumDetailsSection({
  formData,
  artists,
  isLoadingArtists,
  onUpdate,
}: BulkAlbumDetailsSectionProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-medium">Album details</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Album name"
          placeholder="e.g. Nevermind"
          value={formData.name}
          onChange={(value) => onUpdate('name', value)}
          onBlur={() => {}}
        />
        <div className="space-y-1">
          <SelectField
            label="Artist"
            placeholder={
              isLoadingArtists
                ? 'Loading...'
                : artists.length === 0
                  ? 'No artists yet'
                  : 'Select artist'
            }
            value={formData.artistId}
            options={artists.map((a) => ({ value: a.id, label: a.name }))}
            onChange={(value) => onUpdate('artistId', value)}
            onBlur={() => {}}
          />
          {!isLoadingArtists && artists.length === 0 && (
            <p className="text-xs text-muted-foreground">
              <Link to="/app/library/albums/create" className="text-primary hover:underline">
                Create an artist
              </Link>{' '}
              first to add albums.
            </p>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Album type"
          placeholder="Select type"
          value={formData.type}
          options={albumTypeOptions}
          onChange={(value) => onUpdate('type', value as typeof formData.type)}
          onBlur={() => {}}
        />
        <DatePickerField
          label="Release date"
          value={formData.releaseDate ?? undefined}
          onChange={(date) => onUpdate('releaseDate', date ?? null)}
          onBlur={() => {}}
        />
      </div>
      <TextAreaField
        label="Description"
        placeholder="Tell something about this album..."
        value={formData.description || ''}
        onChange={(value) => onUpdate('description', value)}
        onBlur={() => {}}
        className="min-h-24"
      />
    </div>
  );
}
