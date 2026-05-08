import { DatePickerField, SelectField } from '@/components/form';
import { AlbumType } from '@repo/db';

const albumTypeOptions = Object.entries(AlbumType).map(([key, value]) => ({
  value,
  label: key.charAt(0).toUpperCase() + key.slice(1),
}));

import { LibraryAlbumGenrePicker } from '../create/LibraryAlbumGenrePicker';
import type { ZodGenreInfer } from '@repo/contracts';

interface EditAlbumMetadataProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  genres: ZodGenreInfer[];
  pendingGenres: { id: string; name: string }[];
  isLoadingGenres: boolean;
  onGenreSelect: (value: string) => void;
}

export function EditAlbumMetadata({
  form,
  genres,
  pendingGenres,
  isLoadingGenres,
  onGenreSelect,
}: EditAlbumMetadataProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <form.Field name="type">
        {(field: {
          state: { value: string };
          handleChange: (v: string) => void;
          handleBlur: () => void;
        }) => (
          <SelectField
            label="Album type"
            placeholder="Select type"
            value={field.state.value}
            options={albumTypeOptions}
            onChange={(value) => {
              if (value in AlbumType) {
                field.handleChange(value as AlbumType);
              }
            }}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      <form.Field name="releaseDate">
        {(field: {
          state: { value: string | null };
          handleChange: (v: unknown) => void;
          handleBlur: () => void;
        }) => (
          <DatePickerField
            label="Release date"
            value={field.state.value ? new Date(field.state.value) : undefined}
            onChange={(date) => {
              const isoValue = date?.toISOString() ?? null;
              field.handleChange(isoValue as typeof field.state.value);
            }}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      <div className="sm:col-span-2">
        <form.Field name="genreIds">
          {(field: { state: { value: string[] } }) => (
            <LibraryAlbumGenrePicker
              selectedGenreIds={field.state.value}
              genres={genres}
              pendingGenres={pendingGenres}
              isLoading={isLoadingGenres}
              onSelect={onGenreSelect}
            />
          )}
        </form.Field>
      </div>
    </div>
  );
}
