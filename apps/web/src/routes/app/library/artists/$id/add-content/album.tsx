import { CreateAlbumForm } from '@/components/library/albums/CreateAlbumForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCreateLibraryAlbum } from '@/hooks/api/library-albums/useCreateLibraryAlbum';
import { useCreateAlbumForm } from '@/hooks/forms/useCreateAlbumForm';
import { InfoIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/artists/$id/add-content/album')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const {
    mutateAsync: createAlbum,
    isPending: isCreatingAlbum,
    error: apiError,
  } = useCreateLibraryAlbum();

  const { formData, isFormValid, handleChange, handleBlur, handleSubmit, getFieldError } =
    useCreateAlbumForm(id);

  const handleFormSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const data = handleSubmit();
    if (!data) return;

    try {
      const response = await createAlbum(data);
      if (response.data) {
        await navigate({
          to: '/app/library/artists/$id',
          params: { id },
        });
      }
    } catch (error) {
      console.error('Failed to create album:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <Alert className="bg-primary/5 border-primary/20">
        <InfoIcon size={20} className="text-primary" />
        <AlertTitle className="text-primary">Local Album</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          You will be able to add songs and upload a cover after creating the album.
        </AlertDescription>
      </Alert>

      {apiError && apiError.status !== 409 && (
        <Alert variant="destructive">
          <WarningCircleIcon size={20} />
          <AlertTitle>Error Creating Album</AlertTitle>
          <AlertDescription>{apiError.message}</AlertDescription>
        </Alert>
      )}

      <CreateAlbumForm
        formData={formData}
        isLoading={isCreatingAlbum}
        isValid={isFormValid}
        onSubmit={handleFormSubmit}
        onChange={handleChange}
        onBlur={handleBlur}
        getFieldError={getFieldError}
      />
    </div>
  );
}
