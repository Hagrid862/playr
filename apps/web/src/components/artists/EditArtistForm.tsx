import { TextAreaField, TextField } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CameraIcon, CircleNotchIcon, FloppyDiskIcon, ImageIcon } from '@phosphor-icons/react';
import {
  UpdateLibraryArtistRequest,
  UpdateLibraryArtistRequestSchema,
  ZodArtist,
} from '@repo/contracts';
import { useForm } from '@tanstack/react-form';
import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

interface EditArtistFormProps {
  artist: ZodArtist;
  isLoading: boolean;
  serverErrors?: Partial<Record<keyof UpdateLibraryArtistRequest, string>>;
  onSubmit: (values: UpdateLibraryArtistRequest, avatar?: File, banner?: File) => Promise<void>;
  onCancel: () => void;
  /** @internal When true, avatar input is not rendered. Used by tests to cover ref-null branch. */
  _testHideAvatarInput?: boolean;
}

const validateWithZod = (value: UpdateLibraryArtistRequest) => {
  const result = UpdateLibraryArtistRequestSchema.safeParse(value);
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
  _testHideAvatarInput = false,
}: EditArtistFormProps) {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);
  const [selectedAvatar, setSelectedAvatar] = useState<File | undefined>(undefined);

  const [bannerPreview, setBannerPreview] = useState<string | undefined>(undefined);
  const [selectedBanner, setSelectedBanner] = useState<File | undefined>(undefined);

  const [isDragging, setIsDragging] = useState(false);
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
  const [isMultipleFilesModalOpen, setIsMultipleFilesModalOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      name: artist.name,
      description: artist.description || '',
    } as UpdateLibraryArtistRequest,
    validators: {
      onChange: ({ value }) => validateWithZod(value),
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value, selectedAvatar, selectedBanner);
    },
  });

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    } else {
      setSelectedAvatar(undefined);
      setAvatarPreview(undefined);
    }
  };

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedBanner(file);
      setBannerPreview(URL.createObjectURL(file));
    } else {
      setSelectedBanner(undefined);
      setBannerPreview(undefined);
    }
  };

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  useEffect(() => {
    return () => {
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    };
  }, [bannerPreview]);

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
          setSelectedAvatar(file);
          const objectUrl = URL.createObjectURL(file);
          setAvatarPreview(objectUrl);

          if (avatarInputRef.current) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            avatarInputRef.current.files = dataTransfer.files;
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
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-8"
    >
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="rounded-xl border-2 border-dashed border-primary bg-primary/10 p-12 text-center shadow-lg">
            <h2 className="text-2xl font-bold text-primary">Drop image to update Avatar</h2>
            <p className="mt-2 text-muted-foreground">Release to set the profile picture</p>
          </div>
        </div>
      )}

      <Dialog open={isMultipleFilesModalOpen} onOpenChange={setIsMultipleFilesModalOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Too Many Files</DialogTitle>
            <DialogDescription>
              You can only upload one an avatar picture at a time. Please drop exactly one image
              file.
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
      {!_testHideAvatarInput && (
        <input
          type="file"
          ref={avatarInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleAvatarSelect}
        />
      )}
      <input
        type="file"
        ref={bannerInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleBannerSelect}
      />

      <div className="grid gap-8">
        {/* Media Section */}
        <Card className="border-border/50 bg-stone-900/10 backdrop-blur-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-2xl">Artist Media</CardTitle>
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
                {bannerPreview || artist.bannerId ? (
                  <img
                    src={bannerPreview || artist.banner?.url || `/api/images/${artist.bannerId}`}
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
                  className="group relative size-28 rounded-full bg-stone-900 border-4 border-stone-800 flex items-center justify-center overflow-hidden hover:border-primary/50 transition-all cursor-pointer shadow-2xl"
                  onClick={(e) => {
                    e.stopPropagation();
                    avatarInputRef.current?.click();
                  }}
                >
                  {avatarPreview || artist.avatarId ? (
                    <img
                      src={avatarPreview || artist.avatar?.url || `/api/images/${artist.avatarId}`}
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
            <CardTitle className="text-2xl">Basic Information</CardTitle>
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
                      : undefined) ||
                    (field.state.meta.isTouched && form.state.errors.length > 0
                      ? (form.state.errors[0] as Record<string, string>)?.[field.name]
                      : undefined) ||
                    serverErrors?.name
                  }
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  className="max-w-md"
                />
              )}
            </form.Field>

            <form.Field
              name="description"
              validators={{
                onChange: ({ value }) => {
                  if (value && value.length > 2048) {
                    return 'Description must be 2048 characters or less';
                  }
                  return undefined;
                },
              }}
            >
              {(field) => (
                <TextAreaField
                  label="Description"
                  placeholder="Tell something about the artist..."
                  value={field.state.value || ''}
                  error={
                    field.state.meta.isTouched
                      ? (field.state.meta.errors[0] as unknown as string) ||
                        (form.state.errors[0] as Record<string, string>)?.[field.name]
                      : serverErrors?.description
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
        <Button type="submit" disabled={isLoading} className="min-w-32 group">
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
