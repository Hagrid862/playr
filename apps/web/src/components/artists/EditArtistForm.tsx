import { TextAreaField, TextField } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CameraIcon, CircleNotchIcon, FloppyDiskIcon, ImageIcon } from '@phosphor-icons/react';
import { UpdateArtistRequest, UpdateArtistRequestSchema, ZodArtist } from '@repo/contracts';
import { useForm } from '@tanstack/react-form';
import { useRef, useState } from 'react';

interface EditArtistFormProps {
  artist: ZodArtist;
  isLoading: boolean;
  serverErrors?: Partial<Record<keyof UpdateArtistRequest, string>>;
  onSubmit: (values: UpdateArtistRequest, avatar?: File) => Promise<void>;
  onCancel: () => void;
}

const validateWithZod = (value: UpdateArtistRequest) => {
  const result = UpdateArtistRequestSchema.safeParse(value);
  if (result.success) return undefined;

  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path[0] as string;
    if (path && !errors[path]) {
      errors[path] = issue.message;
    }
  });
  return errors;
};

export function EditArtistForm({
  artist,
  isLoading,
  serverErrors,
  onSubmit,
  onCancel,
}: EditArtistFormProps) {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);
  const [selectedAvatar, setSelectedAvatar] = useState<File | undefined>(undefined);

  const form = useForm({
    defaultValues: {
      name: artist.name,
      description: artist.description || '',
      avatarId: artist.avatarId,
      bannerId: artist.bannerId,
    } as UpdateArtistRequest,
    validators: {
      onChange: ({ value }) => validateWithZod(value),
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value, selectedAvatar);
    },
  });

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
      form.setFieldValue('avatarId', 'preview'); // Trigger re-render
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-8"
    >
      <input
        type="file"
        ref={avatarInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleAvatarSelect}
      />
      <input
        type="file"
        ref={bannerInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => console.log('Banner selected:', e.target.files?.[0])}
      />

      <div className="grid gap-8">
        {/* Media Section */}
        <Card className="border-border/50 bg-stone-900/10 backdrop-blur-sm overflow-hidden">
          <CardHeader>
            <CardTitle>Artist Media</CardTitle>
            <CardDescription>
              Update your artist{`'s`} profile picture and banner image.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-10">
            <div className="relative">
              {/* Banner Area */}
              <div
                className="relative h-48 w-full rounded-xl bg-stone-900/40 border-4 border-transparent overflow-hidden group transition-all hover:border-primary/50 cursor-pointer"
                onClick={() => bannerInputRef.current?.click()}
              >
                {form.getFieldValue('bannerId') ? (
                  <img
                    src={artist.banner?.url || `/api/images/${form.getFieldValue('bannerId')}`}
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                  />
                ) : (
                  <div className="size-full flex flex-col items-center justify-center bg-stone-950/40 gap-2">
                    <ImageIcon size={32} className="text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <div className="flex flex-col items-center gap-2">
                    <CameraIcon size={24} className="text-white" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                      Change Banner
                    </span>
                  </div>
                </div>
              </div>

              {/* Avatar Overlap */}
              <div className="absolute -bottom-6 left-6 flex items-end gap-4">
                <div
                  className="group relative size-28 rounded-2xl bg-stone-900 border-4 border-stone-800 flex items-center justify-center overflow-hidden hover:border-primary/50 transition-all cursor-pointer shadow-2xl"
                  onClick={(e) => {
                    e.stopPropagation();
                    avatarInputRef.current?.click();
                  }}
                >
                  {avatarPreview || form.getFieldValue('avatarId') ? (
                    <img
                      src={
                        avatarPreview ||
                        artist.avatar?.url ||
                        `/api/images/${form.getFieldValue('avatarId')}`
                      }
                      className="size-full object-cover group-hover:opacity-50 transition-opacity"
                    />
                  ) : (
                    <CameraIcon
                      size={28}
                      className="text-muted-foreground group-hover:text-primary transition-colors"
                    />
                  )}
                  <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[8px] text-white font-bold uppercase tracking-wider text-center px-2">
                    Change Photo
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Identity Section */}
        <Card className="border-border/50 bg-stone-900/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Manage your artist{`'s`} public name and biography.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <form.Field name="name">
              {(field) => (
                <TextField
                  label="Artist Name"
                  placeholder="e.g. Kurt Cobain"
                  value={field.state.value || ''}
                  error={
                    (field.state.meta.isTouched && field.state.meta.errors.length > 0
                      ? String(field.state.meta.errors[0])
                      : undefined) || serverErrors?.name
                  }
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  className="max-w-md"
                />
              )}
            </form.Field>

            <form.Field name="description">
              {(field) => (
                <TextAreaField
                  label="Description"
                  placeholder="Tell something about the artist..."
                  value={field.state.value || ''}
                  error={
                    field.state.meta.isTouched && field.state.meta.errors.length > 0
                      ? String(field.state.meta.errors[0])
                      : undefined
                  }
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  className="min-h-32"
                />
              )}
            </form.Field>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="min-w-32 group rounded-xl">
          {isLoading ? (
            <>
              <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <FloppyDiskIcon size={18} className="mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
