import { MediaCard } from '@/components/library/MediaCard';
import { AlbumLibraryContextMenu } from '@/components/library/albums/AlbumLibraryContextMenu';
import { Spinner } from '@/components/ui/spinner';
import { useLibraryAlbumsInfinite } from '@/hooks/api/library-albums/useLibraryAlbumsInfinite';
import { useInfiniteScrollFetch } from '@/hooks/useInfiniteScrollFetch';
import { LIBRARY_SCROLL_CLEAR_PLAYER_CLASS } from '@/lib/app-player-layout';
import { UNKNOWN_ALBUM_LABEL, UNKNOWN_ARTIST_LABEL } from '@/lib/display-constants';
import { cn } from '@/lib/utils';
import type { ZodAlbum } from '@repo/contracts';
import { AlbumSystemKind } from '@repo/db';
import { DiscIcon } from '@phosphor-icons/react';
import { useMemo } from 'react';

const LIST_PAGE_SIZE = 50;

export function AlbumsListPage() {
  const albumsQuery = useLibraryAlbumsInfinite({ limit: LIST_PAGE_SIZE });

  const albums = useMemo<ZodAlbum[]>(() => {
    const pages = albumsQuery.data?.pages;
    if (!pages?.length) return [];
    return pages
      .flatMap((page) => page.data?.items ?? [])
      .map((item) => item.album)
      .filter((album): album is ZodAlbum => !!album);
  }, [albumsQuery.data]);

  const sortedAlbums = useMemo(
    () =>
      [...albums].sort(
        (a, b) =>
          (a.systemKind === AlbumSystemKind.unknown_bucket ? 1 : 0) -
          (b.systemKind === AlbumSystemKind.unknown_bucket ? 1 : 0),
      ),
    [albums],
  );

  const sentinelRef = useInfiniteScrollFetch({
    hasNextPage: albumsQuery.hasNextPage === true,
    isFetchingNextPage: albumsQuery.isFetchingNextPage,
    fetchNextPage: albumsQuery.fetchNextPage,
  });

  if (albumsQuery.isPending) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4">
        <Spinner className="size-8 text-primary" />
        <p className="text-muted-foreground animate-pulse">Fetching your albums...</p>
      </div>
    );
  }

  if (albums.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl p-12 text-center backdrop-blur-sm">
        <div className="mb-6 rounded-full bg-stone-800/50 p-6 ring-1 ring-white/5">
          <DiscIcon className="size-12 text-muted-foreground" weight="duotone" />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-white">No albums found</h3>
        <p className="mb-8 max-w-sm text-muted-foreground leading-relaxed">
          Your private library is empty. Add your first album to start building your personal
          collection.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-8', LIBRARY_SCROLL_CLEAR_PLAYER_CLASS)}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        {sortedAlbums.map((album) => (
          <MediaCard
            key={album.id}
            id={album.id}
            title={
              album.systemKind === AlbumSystemKind.unknown_bucket ? UNKNOWN_ALBUM_LABEL : album.name
            }
            subtitle={
              (album.artists?.length
                ? album.artists.map((artist) => artist.name).join(', ')
                : UNKNOWN_ARTIST_LABEL) + ` - ${album.type}`
            }
            coverUrl={album.cover?.url ?? undefined}
            link="/app/library/albums/$id"
            placeholderIcon={<DiscIcon className="size-1/2 text-stone-400" weight="duotone" />}
            contextMenu={<AlbumLibraryContextMenu album={album} />}
          />
        ))}
      </div>
      {albumsQuery.isFetchingNextPage ? (
        <div className="flex justify-center py-4">
          <Spinner className="size-6 text-primary" />
        </div>
      ) : null}
      <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
    </div>
  );
}
