import { MediaCard } from '@/components/library/MediaCard';
import { Spinner } from '@/components/ui/spinner';
import { useLibraryArtistsInfinite } from '@/hooks/api/library-artists/useLibraryArtistsInfinite';
import { useInfiniteScrollFetch } from '@/hooks/useInfiniteScrollFetch';
import { LIBRARY_SCROLL_CLEAR_PLAYER_CLASS } from '@/lib/app-player-layout';
import { cn } from '@/lib/utils';
import type { ZodArtist } from '@repo/contracts';
import { UserIcon } from '@phosphor-icons/react';
import { useMemo } from 'react';

const LIST_PAGE_SIZE = 50;

export function ArtistsListPage() {
  const artistsQuery = useLibraryArtistsInfinite({ limit: LIST_PAGE_SIZE });

  const artists = useMemo<ZodArtist[]>(() => {
    const pages = artistsQuery.data?.pages;
    if (!pages?.length) return [];
    return pages
      .flatMap((page) => page.data?.items ?? [])
      .map((item) => item.artist)
      .filter((artist): artist is ZodArtist => !!artist);
  }, [artistsQuery.data]);

  const sentinelRef = useInfiniteScrollFetch({
    hasNextPage: artistsQuery.hasNextPage === true,
    isFetchingNextPage: artistsQuery.isFetchingNextPage,
    fetchNextPage: artistsQuery.fetchNextPage,
  });

  if (artistsQuery.isPending) {
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
    <div className={cn('flex flex-col gap-8', LIBRARY_SCROLL_CLEAR_PLAYER_CLASS)}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        {artists.map((artist) => (
          <MediaCard
            key={artist.id}
            id={artist.id}
            title={artist.name}
            subtitle={artist.isCommunity ? 'Community Artist' : 'Private Artist'}
            coverUrl={artist.avatar?.url ?? undefined}
            link={`/app/library/artists/${artist.id}`}
            coverStyle="circle"
            placeholderIcon={<UserIcon className="size-1/2 text-stone-400" weight="duotone" />}
          />
        ))}
      </div>
      {artistsQuery.isFetchingNextPage ? (
        <div className="flex justify-center py-4">
          <Spinner className="size-6 text-primary" />
        </div>
      ) : null}
      <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
    </div>
  );
}
