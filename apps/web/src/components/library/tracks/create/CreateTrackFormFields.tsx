import { FileField, TextField } from '@/components/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CircleNotchIcon } from '@phosphor-icons/react';
import { SingleTrackCoverUpdateBanner } from './SingleTrackCoverUpdateBanner';

interface CreateTrackFormFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  serverErrors?: Record<string, string>;
  isScanningMetadata: boolean;
  trackCoverFile: File | null;
  trackCoverPreviewUrl: string | null;
  useTrackCoverAsAlbumCover: boolean;
  currentAlbumCoverUrl: string | null;
  onSelectTrackCover: (use: boolean) => void;
  onAudioFileChange: (file: File | null) => void;
}

export function CreateTrackFormFields({
  form,
  serverErrors,
  isScanningMetadata,
  trackCoverFile,
  trackCoverPreviewUrl,
  useTrackCoverAsAlbumCover,
  currentAlbumCoverUrl,
  onSelectTrackCover,
  onAudioFileChange,
}: CreateTrackFormFieldsProps) {
  return (
    <div className="flex flex-col gap-6">
      <form.Field name="title">
        {(field: { state: { value: string; meta: { isTouched: boolean; errors: unknown[] } }; name: string; handleChange: (v: string) => void; handleBlur: () => void }) => (
          <TextField
            label="Track Title"
            placeholder="e.g. Smells Like Teen Spirit"
            value={field.state.value}
            error={
              field.state.meta.isTouched
                ? (field.state.meta.errors[0] as string | undefined) ||
                  (form.state.errors[0] as Record<string, string> | undefined)?.[field.name]
                : serverErrors?.title
            }
            onChange={field.handleChange}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      <div className="flex gap-4">
        <form.Field name="diskNumber">
          {(field: { state: { value: number; meta: { isTouched: boolean; errors: unknown[] } }; name: string; handleChange: (v: number) => void; handleBlur: () => void }) => (
            <div className="w-24">
              <TextField
                label="Disk No."
                placeholder="1"
                type="number"
                value={String(field.state.value)}
                error={
                  field.state.meta.isTouched
                    ? (field.state.meta.errors[0] as string | undefined) ||
                      (form.state.errors[0] as Record<string, string> | undefined)?.[field.name]
                    : serverErrors?.diskNumber
                }
                onChange={(e) => field.handleChange(Number(e))}
                onBlur={field.handleBlur}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="trackNumber">
          {(field: { state: { value: number; meta: { isTouched: boolean; errors: unknown[] } }; name: string; handleChange: (v: number) => void; handleBlur: () => void }) => (
            <div className="flex-1">
              <TextField
                label="Track No."
                placeholder="1"
                type="number"
                value={String(field.state.value)}
                error={
                  field.state.meta.isTouched
                    ? (field.state.meta.errors[0] as string | undefined) ||
                      (form.state.errors[0] as Record<string, string> | undefined)?.[field.name]
                    : serverErrors?.trackNumber
                }
                onChange={(e) => field.handleChange(Number(e))}
                onBlur={field.handleBlur}
              />
            </div>
          )}
        </form.Field>
      </div>

      <form.Field name="explicit">
        {(field: { state: { value: boolean }; handleChange: (v: boolean) => void }) => (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="explicit"
              checked={field.state.value}
              onCheckedChange={(checked) => field.handleChange(!!checked)}
            />
            <Label htmlFor="explicit">Explicit Content</Label>
          </div>
        )}
      </form.Field>

      <form.Field name="audioFile">
        {(field: { state: { value: File | null; meta: { errors: unknown[] } }; name: string; handleChange: (v: File | null) => void; handleBlur: () => void }) => (
          <FileField
            label="Audio File"
            accept="audio/*"
            value={field.state.value}
            showClearButton
            error={
              (field.state.meta.errors[0] as string | undefined) ||
              (form.state.errors[0] as Record<string, string> | undefined)?.[field.name]
            }
            onChange={(file) => {
              field.handleChange(file);
              onAudioFileChange(file);
            }}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      {isScanningMetadata && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleNotchIcon className="h-4 w-4 animate-spin" />
          Scanning metadata...
        </div>
      )}

      {trackCoverFile && trackCoverPreviewUrl && !isScanningMetadata && (
        <SingleTrackCoverUpdateBanner
          currentAlbumCoverUrl={currentAlbumCoverUrl}
          trackCoverPreviewUrl={trackCoverPreviewUrl}
          useTrackCover={useTrackCoverAsAlbumCover}
          onSelect={onSelectTrackCover}
        />
      )}
    </div>
  );
}
