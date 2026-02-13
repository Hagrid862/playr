import { CreateArtistForm } from '@/components/artists/CreateArtistForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCreateLibraryArtist } from '@/hooks/api/library-artists/useCreateLibraryArtist';
import { useUploadLibraryArtistAvatar } from '@/hooks/api/library-artists/useUploadLibraryArtistAvatar';
import { useLibraryStore } from '@/stores/library.store';
import { InfoIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { CreateLibraryArtistRequest } from '@repo/contracts';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/artists/create')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { libraryId } = useLibraryStore();
  const {
    mutateAsync: createArtist,
    isPending: isCreatingArtist,
    error: apiError,
  } = useCreateLibraryArtist();

  const { mutateAsync: uploadArtistAvatar, isPending: isUploadingAvatar } =
    useUploadLibraryArtistAvatar();

  const onSubmit = async (data: CreateLibraryArtistRequest, avatarFile?: File) => {
    try {
      const response = await createArtist(data);
      if (avatarFile && response.data) {
        await uploadArtistAvatar({ id: response.data.id, file: avatarFile });
      }
      await navigate({ to: '/app/library/artists' });
    } catch (err) {
      console.error('Failed to create artist or upload avatar', err);
    }
  };

  const isLoading = isCreatingArtist || isUploadingAvatar;

  return (
    <div className="flex items-center justify-center py-10">
      <div className="flex flex-col gap-6 w-full max-w-2xl">
        <div className="flex flex-col gap-2">
          <Alert className="bg-primary/5 border-primary/20">
            <InfoIcon size={20} className="text-primary" />
            <AlertTitle className="text-primary">Note on Local Artists</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              Local artists are only visible to you and are strictly tied to your private library.
              Use them for your custom media collection (CDs, vinyls, etc.).
            </AlertDescription>
          </Alert>

          {!libraryId && (
            <Alert variant="destructive">
              <WarningCircleIcon size={20} />
              <AlertTitle>Library unavailable</AlertTitle>
              <AlertDescription>
                Your library is not ready yet. Please try again later.
              </AlertDescription>
            </Alert>
          )}

          {apiError && apiError.status !== 409 && (
            <Alert variant="destructive">
              <WarningCircleIcon size={20} />
              <AlertTitle>Error Creating Artist</AlertTitle>
              <AlertDescription>{apiError.message}</AlertDescription>
            </Alert>
          )}
        </div>

        <CreateArtistForm
          isLoading={isLoading}
          serverErrors={apiError?.status === 409 ? { name: apiError.message } : undefined}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}
