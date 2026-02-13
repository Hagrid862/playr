import { CreateAlbumForm } from '@/components/library/albums/CreateAlbumForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCreateLibraryAlbum } from '@/hooks/api/library-albums/useCreateLibraryAlbum';
import { useUploadLibraryAlbumCover } from '@/hooks/api/library-albums/useUploadLibraryAlbumCover';
import { useCreateAlbumForm } from '@/hooks/forms/useCreateAlbumForm';
import { InfoIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/app/library/artists/$id/add-content/album')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [coverImage, setCoverImage] = useState<File | null>(null);

  const {
    mutateAsync: createAlbum,
    isPending: isCreatingAlbum,
    error: apiError,
  } = useCreateLibraryAlbum();

  const {
    mutateAsync: uploadCover,
    isPending: isUploadingCover,
    error: uploadError,
  } = useUploadLibraryAlbumCover();

  const { formData, isFormValid, handleChange, handleBlur, handleSubmit, getFieldError } =
    useCreateAlbumForm(id);

  const handleFormSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const data = handleSubmit();
    if (!data) return;

    try {
      const response = await createAlbum(data);
      if (response.data) {
        if (coverImage) {
          await uploadCover({ id: response.data.id, file: coverImage });
        }

        await navigate({
          to: '/app/library/artists/$id',
          params: { id },
        });
      }
    } catch (error) {
      console.error('Failed to create album or upload cover:', error);
    }
  };

  const error = apiError || uploadError;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <Alert className="bg-primary/5 border-primary/20">
        <InfoIcon size={20} className="text-primary" />
        <AlertTitle className="text-primary">Local Album</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          You will be able to add songs after creating the album.
        </AlertDescription>
      </Alert>

      {error && error.status !== 409 && (
        <Alert variant="destructive">
          <WarningCircleIcon size={20} />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <CreateAlbumForm
        formData={formData}
        isLoading={isCreatingAlbum || isUploadingCover}
        isValid={isFormValid}
        onSubmit={handleFormSubmit}
        onChange={handleChange}
        onBlur={handleBlur}
        onFileSelect={setCoverImage}
        getFieldError={getFieldError}
      />
    </div>
  );
}
