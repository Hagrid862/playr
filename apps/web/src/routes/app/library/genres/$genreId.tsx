import { PageHeader } from '@/components/app/PageHeader';
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
import { useDeleteLibraryTrack } from '@/hooks/api/library-tracks/useDeleteLibraryTrack';
import { useLibraryGenre } from '@/hooks/api/library-genres/useLibraryGenre';
import { useLibraryAlbums } from '@/hooks/api/library-albums/useLibraryAlbums';
import { useLibraryTracks } from '@/hooks/api/library-tracks/useLibraryTracks';
import { useIsMobile } from '@/hooks/use-mobile';
import { zodTrackToPlaybackTrack } from '@/lib/playback/playback-mappers';
import { usePlayerStore } from '@/stores/player-store/player.store';
import type { ZodTrack } from '@repo/contracts';
import { DiscIcon } from '@phosphor-icons/react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/app/library/genres/$genreId')({
  component: GenreDetail,
});

function GenreDetail() {
  const { genreId } = Route.useParams();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [trackToDelete, setTrackToDelete] = useState<{ id: string; title: string } | null>(null);

  const { data: genreData } = useLibraryGenre(genreId);
  const genre = genreData?.data;

  const { data: albumsData, isLoading: isAlbumsLoading } = useLibraryAlbums({ genreId, limit: 50 });
  const albums = (albumsData?.data?.items ?? []) as any[];

  const { data: tracksData, isLoading: isTracksLoading } = useLibraryTracks({
    genreId,
    limit: 100,
  });
  const rawTracks = (tracksData?.data?.items ?? []) as ZodTrack[];

  const albumTrackGroups = useMemo(() => {
    const coverByAlbumId = new Map<string, string | undefined>();
    for (const item of albums as {
      album?: { id?: string; cover?: { url?: string } };
      albumId?: string;
    }[]) {
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
    albums.forEach((item: { album?: { id?: string }; albumId?: string }, idx: number) => {
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

  return (
    <div className="flex min-h-0 flex-col gap-8 px-4 pb-32 md:px-6 md:pb-0 md:pt-8">
      {isMobile ? (
        <PageHeader title={genre?.name ?? 'Genre'} showBackButton />
      ) : (
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-black tracking-tight">{genre?.name}</h2>
          <p className="text-muted-foreground">
            {albums.length} albums • {rawTracks.length} songs
          </p>
        </div>
      )}

      {/* Albums Section */}
      <section className="flex flex-col gap-4">
        <h3 className="px-2 text-xl font-bold tracking-tight">Albums</h3>
        {isAlbumsLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-lg bg-accent/50" />
            ))}
          </div>
        ) : albums.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {albums.map((item: any) => (
              <MediaCard
                key={item.id}
                id={item.album?.id ?? item.albumId}
                title={item.album.name}
                subtitle={(item.album.artists as any[])?.map((a) => a.name).join(', ')}
                coverUrl={item.album.cover?.url}
                link="/app/library/albums/$id"
              />
            ))}
          </div>
        ) : (
          <p className="px-2 text-sm text-muted-foreground">No albums in this genre.</p>
        )}
      </section>

      <Separator className="opacity-50" />

      {/* Songs — same structure as album detail track list */}
      <div className="flex flex-col gap-6 px-0 md:px-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white/90">Songs</h3>
        </div>

        {isTracksLoading ? (
          <div className="flex flex-col gap-2 px-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-14 w-full animate-pulse rounded-lg bg-accent/50" />
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
