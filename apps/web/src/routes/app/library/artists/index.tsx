import { Spinner } from '@/components/ui/spinner';
import { useLibraryArtists } from '@/hooks/api/library/useLibraryArtists';
import { useLibraryStore } from '@/stores/library.store';
import { UserIcon } from '@phosphor-icons/react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

export const Route = createFileRoute('/app/library/artists/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { isLoading } = useLibraryArtists();
  const artists = useLibraryStore((state) => state.privateArtists);

  useEffect(() => {
    console.log('artists', artists);
  }, [artists]);

  if (isLoading) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4">
        <Spinner className="size-8 text-primary" />
        <p className="text-muted-foreground animate-pulse">Fetching your artists...</p>
      </div>
    );
  }

  if (artists.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl p-12 text-center backdrop-blur-sm">
        <div className="mb-6 rounded-full bg-stone-800/50 p-6 ring-1 ring-white/5">
          <UserIcon className="size-12 text-muted-foreground" weight="duotone" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-white">No artists found</h3>
        <p className="mb-8 max-w-sm text-muted-foreground leading-relaxed">
          Your private library is empty. Add your first artist to start building your personal
          collection.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        {artists.map((artist) => (
          <Link
            key={artist.id}
            to="/app/library/artists/$id"
            params={{ id: artist.id }}
            className="group/artist relative p-2 rounded-lg overflow-hidden transition-all transition-150 transform hover:scale-[1.02] active:scale-[1.00] hover:bg-stone-800/30 active:bg-stone-800/45 cursor-pointer"
          >
            <div className="aspect-square w-full overflow-hidden bg-stone-800 rounded-md">
              {artist.avatar?.url ? (
                <img
                  src={artist.avatar?.url}
                  alt={artist.name}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <UserIcon className="size-1/2 text-stone-400" weight="duotone" />
                </div>
              )}
            </div>
            <div className="pt-4">
              <h3 className="line-clamp-1 text-sm font-semibold">{artist.name}</h3>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {artist.isCommunity ? 'Community Artist' : 'Private Artist'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
