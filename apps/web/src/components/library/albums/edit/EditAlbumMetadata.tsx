import { DatePickerField, SelectField } from '@/components/form';
import { AlbumType } from '@repo/db';

const albumTypeOptions = Object.entries(AlbumType).map(([key, value]) => ({
  value,
  label: key.charAt(0).toUpperCase() + key.slice(1),
}));

interface EditAlbumMetadataProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
}

export function EditAlbumMetadata({ form }: EditAlbumMetadataProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-4">
        Metadata
      </h3>
      <div className="grid gap-5 md:grid-cols-2">
        <form.Field name="type">
          {(field: {
            state: { value: string };
            handleChange: (v: string) => void;
            handleBlur: () => void;
          }) => (
            <SelectField
              label="Album Type"
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
              label="Release Date"
              value={field.state.value ? new Date(field.state.value) : undefined}
              onChange={(date) => {
                const isoValue = date?.toISOString() ?? null;
                field.handleChange(isoValue as typeof field.state.value);
              }}
              onBlur={field.handleBlur}
            />
          )}
        </form.Field>
      </div>
    </div>
  );
}
