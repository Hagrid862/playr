import { CreateArtistForm } from '@/components/artists/CreateArtistForm';
import { MediaCard } from '@/components/library/MediaCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCreateLibraryArtist } from '@/hooks/api/library-artists/useCreateLibraryArtist';
import { useLibraryArtists } from '@/hooks/api/library-artists/useLibraryArtists';
import { useUploadLibraryArtistAvatar } from '@/hooks/api/library-artists/useUploadLibraryArtistAvatar';
import { useLibraryStore } from '@/stores/library.store';
import {
  InfoIcon,
  PlusIcon,
  UploadSimpleIcon,
  UserIcon,
  UsersIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import { CreateLibraryArtistRequest } from '@repo/contracts';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/app/library/albums/create')({
  component: RouteComponent,
});

type View = 'selection' | 'pick' | 'create';

function RouteComponent() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('selection');
  const { libraryId } = useLibraryStore();

  const { isLoading: isLoadingArtists } = useLibraryArtists();
  const artists = useLibraryStore((state) => state.privateArtists);

  const {
    mutateAsync: createArtist,
    isPending: isCreatingArtist,
    error: apiError,
  } = useCreateLibraryArtist();

  const { mutateAsync: uploadArtistAvatar, isPending: isUploadingAvatar } =
    useUploadLibraryArtistAvatar();

  const onArtistCreated = async (data: CreateLibraryArtistRequest, avatarFile?: File) => {
    try {
      const response = await createArtist(data);
      if (response.data) {
        if (avatarFile) {
          await uploadArtistAvatar({ id: response.data.id, file: avatarFile });
        }
        await navigate({
          to: '/app/library/artists/$id/add-content/album',
          params: { id: response.data.id },
        });
      }
    } catch (err) {
      console.error('Failed to create artist or upload avatar', err);
    }
  };

  if (view === 'selection') {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-8">
        <div className="flex flex-col items-center text-center gap-2 max-w-md">
          <h2 className="text-2xl font-bold text-white">Who is the author?</h2>
          <p className="text-muted-foreground text-sm">
            To create an album, you first need to specify the artist. You can pick an existing one
            from your library or create a brand new one.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
          <button
            onClick={() => setView('pick')}
            className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-stone-900/40 border border-white/5 hover:border-primary/50 hover:bg-stone-800/40 transition-all group text-left"
          >
            <div className="p-4 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
              <UsersIcon size={32} weight="duotone" />
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <h3 className="text-lg font-semibold text-white">Pick existing artist</h3>
              <p className="text-sm text-muted-foreground">
                Choose an artist from your private collection to add a new album to.
              </p>
            </div>
          </button>

          <button
            onClick={() => setView('create')}
            className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-stone-900/40 border border-white/5 hover:border-primary/50 hover:bg-stone-800/40 transition-all group text-left"
          >
            <div className="p-4 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
              <PlusIcon size={32} weight="duotone" />
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <h3 className="text-lg font-semibold text-white">Create new artist</h3>
              <p className="text-sm text-muted-foreground">
                Add a new artist to your library first, then proceed to album creation.
              </p>
            </div>
          </button>

          <Link
            to="/app/library/albums/bulk-create"
            className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-stone-900/40 border border-white/5 hover:border-primary/50 hover:bg-stone-800/40 transition-all group text-left"
          >
            <div className="p-4 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
              <UploadSimpleIcon size={32} weight="duotone" />
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <h3 className="text-lg font-semibold text-white">Bulk upload</h3>
              <p className="text-sm text-muted-foreground">
                Upload multiple MP3 files and create an album with extracted metadata in one go.
              </p>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  if (view === 'pick') {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Select Artist</h2>
            <p className="text-muted-foreground text-sm">
              Click on an artist to start adding an album.
            </p>
          </div>
          <button
            onClick={() => setView('selection')}
            className="text-sm text-muted-foreground hover:text-white transition-colors"
          >
            Go back
          </button>
        </div>

        {isLoadingArtists ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-stone-900 animate-pulse" />
            ))}
          </div>
        ) : artists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-stone-900/20 rounded-2xl border border-dashed border-white/5">
            <UserIcon size={48} className="text-muted-foreground mb-4" weight="duotone" />
            <p className="text-muted-foreground">No private artists found.</p>
            <button
              onClick={() => setView('create')}
              className="mt-4 text-primary hover:underline text-sm font-medium"
            >
              Create your first artist
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {artists.map((artist) => (
              <MediaCard
                key={artist.id}
                id={artist.id}
                title={artist.name}
                subtitle={artist.isCommunity ? 'Community' : 'Private'}
                coverUrl={artist.avatar?.url ?? undefined}
                link="/app/library/artists/$id/add-content/album"
                coverStyle="circle"
                placeholderIcon={<UserIcon className="size-1/2 text-stone-400" weight="duotone" />}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-10">
      <div className="flex flex-col gap-6 w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Create Artist</h2>
            <p className="text-muted-foreground text-sm">
              Fill in the details to add a new artist to your library.
            </p>
          </div>
          <button
            onClick={() => setView('selection')}
            className="text-sm text-muted-foreground hover:text-white transition-colors"
          >
            Go back
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <Alert className="bg-primary/5 border-primary/20">
            <InfoIcon size={20} className="text-primary" />
            <AlertTitle className="text-primary">Note on Local Artists</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              Local artists are strictly tied to your private library. Once created, you&apos;ll go
              straight to adding an album.
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
          isLoading={isCreatingArtist || isUploadingAvatar}
          serverErrors={apiError?.status === 409 ? { name: apiError.message } : undefined}
          onSubmit={onArtistCreated}
        />
      </div>
    </div>
  );
}
