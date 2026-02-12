import { CreateArtistForm } from '@/components/artists/CreateArtistForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCreateArtist } from '@/hooks/api/artists/useCreateArtist';
import { useLibraryStore } from '@/stores/library.store';
import { InfoIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { CreateArtistRequest } from '@repo/contracts';
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
  } = useCreateArtist();

  const onSubmit = async (data: CreateArtistRequest) => {
    try {
      await createArtist(data);
      await navigate({ to: '/app/library/artists' });
    } catch (err) {
      console.error('Failed to create artist', err);
    }
  };

  return (
    <div className="flex items-center justify-center py-10">
      <Card className="flex flex-col gap-6 w-full max-w-2xl">
        <CardHeader className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-white">New Local Artist</h2>
          <p className="text-muted-foreground text-sm">
            Add a new artist to your private library collection.
          </p>
        </CardHeader>

        <Separator />

        <CardContent className="flex flex-col gap-2">
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
        </CardContent>

        <CreateArtistForm
          isLoading={isCreatingArtist}
          serverErrors={apiError?.status === 409 ? { name: apiError.message } : undefined}
          onSubmit={onSubmit}
        />
      </Card>
    </div>
  );
}
