import { MediaCard } from '@/components/library/MediaCard';
import { SongCard } from '@/components/library/SongCard';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeleteLibraryTrack } from '@/hooks/api/library-tracks/useDeleteLibraryTrack';
import { useLibraryAlbumsInfinite } from '@/hooks/api/library-albums/useLibraryAlbumsInfinite';
import { useLibraryGenre } from '@/hooks/api/library-genres/useLibraryGenre';
import { useLibraryTracksInfinite } from '@/hooks/api/library-tracks/useLibraryTracksInfinite';
import { UNKNOWN_ARTIST_LABEL } from '@/lib/display-constants';
import { zodTrackToPlaybackTrack } from '@/lib/playback/playback-mappers';
import { usePlayerStore } from '@/stores/player-store/player.store';
import type { ZodLibraryAlbumInfer, ZodTrack } from '@repo/contracts';
import { DiscIcon } from '@phosphor-icons/react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/app/library/genres/$genreId')({
  component: GenreDetail,
});

const GENRE_PAGE_SIZE = 50;

function formatLoadedOfTotal(loaded: number, total: number | undefined, pluralNoun: string) {
  if (total == null) return `${loaded} ${pluralNoun}`;
  if (loaded >= total) return `${total} ${pluralNoun}`;
  return `${loaded} of ${total} ${pluralNoun}`;
}

function GenreDetail() {
  const { genreId } = Route.useParams();
  const navigate = useNavigate();
  const [trackToDelete, setTrackToDelete] = useState<{ id: string; title: string } | null>(null);

  const { data: genreData } = useLibraryGenre(genreId);
  const genre = genreData?.data;

  const albumsQuery = useLibraryAlbumsInfinite({ genreId, limit: GENRE_PAGE_SIZE });
  const tracksQuery = useLibraryTracksInfinite({ genreId, limit: GENRE_PAGE_SIZE });

  const albums = useMemo<ZodLibraryAlbumInfer[]>(() => {
    const pages = albumsQuery.data?.pages;
    if (!pages?.length) return [];
    return pages.flatMap((page) => page.data?.items ?? []);
  }, [albumsQuery.data]);

  const rawTracks = useMemo<ZodTrack[]>(() => {
    const pages = tracksQuery.data?.pages;
    if (!pages?.length) return [];
    return pages.flatMap((page) => page.data?.items ?? []);
  }, [tracksQuery.data]);

  const albumsTotal = albumsQuery.data?.pages[0]?.data?.total;
  const tracksTotal = tracksQuery.data?.pages[0]?.data?.total;

  const countsSubtitle = useMemo(
    () =>
      `${formatLoadedOfTotal(albums.length, albumsTotal, 'albums')} • ${formatLoadedOfTotal(rawTracks.length, tracksTotal, 'songs')}`,
    [albums.length, albumsTotal, rawTracks.length, tracksTotal],
  );

  const isAlbumsLoading = albumsQuery.isPending;
  const isTracksLoading = tracksQuery.isPending;

  const albumTrackGroups = useMemo(() => {
    const coverByAlbumId = new Map<string, string | undefined>();
    for (const item of albums) {
      const aid = item.album?.id ?? item.albumId;
      const url = item.album?.cover?.url;
      if (aid && url) coverByAlbumId.set(aid, url);
    }

    const byAlbum = new Map<string, ZodTrack[]>();
    for (const t of rawTracks) {
      const aid = t.albumId;
      if (!byAlbum.has(aid)) byAlbum.set(aid, []);
      byAlbum.get(aid)!.push(t);
    }
    for (const list of byAlbum.values()) {
      list.sort((a, b) => {
        const da = a.diskNumber ?? 1;
        const db = b.diskNumber ?? 1;
        if (da !== db) return da - db;
        return (a.trackNumber ?? 0) - (b.trackNumber ?? 0);
      });
    }

    const albumOrder = new Map<string, number>();
    albums.forEach((item, idx) => {
      const aid = item.album?.id ?? item.albumId;
      if (aid) albumOrder.set(aid, idx);
    });

    const entries = [...byAlbum.entries()].sort(([aId], [bId]) => {
      const oa = albumOrder.has(aId) ? albumOrder.get(aId)! : Number.MAX_SAFE_INTEGER;
      const ob = albumOrder.has(bId) ? albumOrder.get(bId)! : Number.MAX_SAFE_INTEGER;
      if (oa !== ob) return oa - ob;
      const nameA = byAlbum.get(aId)?.[0]?.album?.name ?? '';
      const nameB = byAlbum.get(bId)?.[0]?.album?.name ?? '';
      return nameA.localeCompare(nameB);
    });

    return entries.map(([albumId, tracks]) => ({
      albumId,
      title: tracks[0]?.album?.name?.trim() || 'Unknown album',
      coverUrl: tracks[0]?.album?.cover?.url ?? coverByAlbumId.get(albumId),
      tracks,
    }));
  }, [rawTracks, albums]);

  const { playTrack, addToQueue, playNext } = usePlayerStore();
  const { mutateAsync: deleteTrack, isPending: isDeletingTrack } = useDeleteLibraryTrack();

  const handleDeleteTrack = async () => {
    if (!trackToDelete) return;
    try {
      await deleteTrack(trackToDelete.id);
      setTrackToDelete(null);
      toast.success('Track deleted successfully');
    } catch (error) {
      console.error('Failed to delete track:', error);
      toast.error('Failed to delete track');
    }
  };

  const tracksHasMore = tracksQuery.hasNextPage === true;

  return (
    <div className="flex min-h-0 flex-col gap-8 px-4 pb-40 max-md:pb-[max(10rem,calc(6.5rem+env(safe-area-inset-bottom,0px)))] md:px-6 md:pb-40 md:pt-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-black tracking-tight">{genre?.name}</h2>
        <p className="text-muted-foreground">{countsSubtitle}</p>
      </div>

      {/* Albums Section */}
      <section className="flex flex-col gap-4">
        <h3 className="px-2 text-xl font-bold tracking-tight">Albums</h3>
        {isAlbumsLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg bg-accent/50" />
            ))}
          </div>
        ) : albums.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {albums.map((item) => (
              <MediaCard
                key={item.id}
                id={item.album?.id ?? item.albumId}
                title={item.album?.name ?? ''}
                subtitle={
                  item.album?.artists?.length
                    ? item.album.artists.map((a) => a.name).join(', ')
                    : UNKNOWN_ARTIST_LABEL
                }
                coverUrl={item.album?.cover?.url ?? undefined}
                link="/app/library/albums/$id"
              />
            ))}
          </div>
        ) : (
          <p className="px-2 text-sm text-muted-foreground">No albums in this genre.</p>
        )}
        {albums.length > 0 && albumsQuery.hasNextPage ? (
          <div className="flex justify-center py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => albumsQuery.fetchNextPage()}
              disabled={albumsQuery.isFetchingNextPage}
              className="text-xs"
            >
              {albumsQuery.isFetchingNextPage ? 'Loading...' : 'Load more'}
            </Button>
          </div>
        ) : null}
      </section>

      <Separator className="opacity-50" />

      {/* Songs — same structure as album detail track list */}
      <div className="flex flex-col gap-6 px-0 pb-4 md:px-2 md:pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 md:px-0">
          <h3 className="text-xl font-bold text-white/90">Songs</h3>
          {tracksHasMore ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => tracksQuery.fetchNextPage()}
              disabled={tracksQuery.isFetchingNextPage}
              className="shrink-0 text-xs"
            >
              {tracksQuery.isFetchingNextPage ? 'Loading…' : 'Load more songs'}
            </Button>
          ) : null}
        </div>

        {isTracksLoading ? (
          <div className="flex flex-col gap-2 px-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg bg-accent/50" />
            ))}
          </div>
        ) : rawTracks.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center border border-dashed border-border/40 rounded-2xl bg-stone-900/10">
            <p className="text-muted-foreground text-sm font-medium">No songs in this genre.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {albumTrackGroups.map((group) => {
              const albumPlaybackTracks = group.tracks.map(zodTrackToPlaybackTrack);

              return (
                <div key={group.albumId} className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 px-4 py-2 first:mt-0">
                    {group.coverUrl ? (
                      <div className="relative size-10 shrink-0 overflow-hidden rounded ring-1 ring-white/10">
                        <img src={group.coverUrl} alt="" className="size-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex size-10 shrink-0 items-center justify-center rounded bg-stone-800 ring-1 ring-white/10">
                        <DiscIcon className="size-5 text-stone-400" weight="duotone" />
                      </div>
                    )}
                    <Link
                      to="/app/library/albums/$id"
                      params={{ id: group.albumId }}
                      className="min-w-0 text-sm font-bold uppercase tracking-widest text-white/70 transition-colors hover:text-primary"
                    >
                      <span className="line-clamp-2">{group.title}</span>
                    </Link>
                  </div>

                  <div className="mb-2 grid grid-cols-[3rem_1fr_auto] gap-4 border-b border-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <div className="text-center">#</div>
                    <div>Title</div>
                    <div className="pr-2">Time</div>
                  </div>

                  <div className="flex flex-col">
                    {group.tracks.map((track, i) => {
                      const isProcessing =
                        track.audioFiles?.some(
                          (f) => f.status === 'pending' || f.status === 'processing',
                        ) ?? false;
                      const isFailed =
                        (track.audioFiles?.length ?? 0) > 0 &&
                        track.audioFiles?.every((f) => f.status === 'failed') === true;

                      return (
                        <SongCard
                          key={track.id}
                          id={track.id}
                          trackNumber={track.trackNumber || i + 1}
                          title={track.title}
                          artists={track.artists}
                          duration={track.duration}
                          explicit={track.explicit}
                          isProcessing={isProcessing}
                          isFailed={isFailed}
                          onClick={() =>
                            playTrack(zodTrackToPlaybackTrack(track), albumPlaybackTracks)
                          }
                          onEdit={(songId) =>
                            navigate({
                              to: '/app/library/albums/$id/songs/$songId/edit',
                              params: { id: track.albumId, songId },
                            })
                          }
                          onDelete={(trackInfo) => setTrackToDelete(trackInfo)}
                          onAddToQueue={() => addToQueue(zodTrackToPlaybackTrack(track))}
                          onPlayNext={() => playNext(zodTrackToPlaybackTrack(track))}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {tracksHasMore ? (
              <div className="flex justify-center border-t border-white/5 pt-6 pb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => tracksQuery.fetchNextPage()}
                  disabled={tracksQuery.isFetchingNextPage}
                  className="text-xs text-muted-foreground"
                >
                  {tracksQuery.isFetchingNextPage ? 'Loading…' : 'Load more songs'}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <Dialog open={!!trackToDelete} onOpenChange={(open) => !open && setTrackToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Track</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">{trackToDelete?.title}</span>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTrackToDelete(null)}
              disabled={isDeletingTrack}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTrack} disabled={isDeletingTrack}>
              {isDeletingTrack ? 'Deleting...' : 'Delete Track'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
