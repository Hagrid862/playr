import { PageHeader } from '@/components/app/PageHeader';
import { MediaCard } from '@/components/library/MediaCard';
import { SongCard } from '@/components/library/SongCard';
import { useLibraryGenre } from '@/hooks/api/library-genres/useLibraryGenre';
import { useLibraryAlbums } from '@/hooks/api/library-albums/useLibraryAlbums';
import { useLibraryTracks } from '@/hooks/api/library-tracks/useLibraryTracks';
import { useIsMobile } from '@/hooks/use-mobile';
import { createFileRoute } from '@tanstack/react-router';
import { usePlayerStore } from '@/stores/player-store/player.store';
import { zodTrackToPlaybackTrack } from '@/lib/playback/playback-mappers';
import type { ZodTrack } from '@repo/contracts';

export const Route = createFileRoute('/app/library/genres/$genreId')({
  component: GenreDetail,
});

function GenreDetail() {
  const { genreId } = Route.useParams();
  const isMobile = useIsMobile();
  
  const { data: genreData } = useLibraryGenre(genreId);
  const genre = genreData?.data;

  const { data: albumsData, isLoading: isAlbumsLoading } = useLibraryAlbums({ genreId, limit: 50 });
  const albums = (albumsData?.data?.items ?? []) as any[];

  const { data: tracksData, isLoading: isTracksLoading } = useLibraryTracks({ genreId, limit: 100 });
  const rawTracks = (tracksData?.data?.items ?? []) as ZodTrack[];
  const tracks = rawTracks.map(zodTrackToPlaybackTrack);

  const { currentTrack, isPlaying, playTrack } = usePlayerStore();
  const currentTrackId = currentTrack?.id;

  const handlePlayTrack = (track: any) => {
    const trackIndex = tracks.findIndex(t => t.id === track.id);
    const remainder = tracks.slice(trackIndex + 1);
    playTrack(track, remainder);
  };

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 pb-32">
      {isMobile ? (
        <PageHeader title={genre?.name ?? 'Genre'} showBackButton />
      ) : (
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-black tracking-tight">{genre?.name}</h2>
          <p className="text-muted-foreground">{albums.length} albums • {tracks.length} songs</p>
        </div>
      )}

      {/* Albums Section */}
      <section className="flex flex-col gap-4">
        <h3 className="text-xl font-bold tracking-tight px-2">Albums</h3>
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
                id={item.id}
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

      {/* Songs Section */}
      <section className="flex flex-col gap-4">
        <h3 className="text-xl font-bold tracking-tight px-2">Songs</h3>
        <div className="flex flex-col gap-1">
          {isTracksLoading ? (
            <div className="flex flex-col gap-2 px-2">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-14 w-full animate-pulse rounded-lg bg-accent/50" />
              ))}
            </div>
          ) : rawTracks.length > 0 ? (
            rawTracks.map((track, index) => (
              <SongCard
                key={track.id}
                id={track.id}
                trackNumber={index + 1}
                title={track.title}
                artists={track.artists}
                duration={track.duration}
                isActive={currentTrackId === track.id}
                isPlaying={isPlaying && currentTrackId === track.id}
                onClick={() => handlePlayTrack(zodTrackToPlaybackTrack(track))}
              />
            ))
          ) : (
            <p className="px-2 text-sm text-muted-foreground">No songs in this genre.</p>
          )}
        </div>
      </section>
    </div>
  );
}
