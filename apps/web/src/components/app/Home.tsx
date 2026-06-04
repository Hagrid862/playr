import { useLibraryAlbums } from '@/hooks/api/library-albums/useLibraryAlbums';
import { useLibraryArtists } from '@/hooks/api/library-artists/useLibraryArtists';
import { useLibraryPlaylists } from '@/hooks/api/library-playlists/useLibraryPlaylists';
import { useLibraryTracks } from '@/hooks/api/library-tracks/useLibraryTracks';
import { MediaCard } from '@/components/library/MediaCard';
import { Skeleton } from '@/components/ui/skeleton';
import { DiscIcon, UsersThreeIcon, PlaylistIcon, MusicNotesIcon } from '@phosphor-icons/react';
import { useAuthStore } from '@/stores/auth.store';
import { ReactNode } from 'react';
import { PlaylistSystemRole } from '@repo/db';
import { FavoritesPlaylistCover } from '@/components/playlists/FavoritesPlaylistCover';
import { usePlayerStore } from '@/stores/player-store/player.store';
import { zodTrackToPlaybackTrack } from '@/lib/playback/playback-mappers';
import { Link, useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/utils';

export function Home() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { data: albumsData, isLoading: albumsLoading } = useLibraryAlbums({ limit: 12 });
  const { data: artistsData, isLoading: artistsLoading } = useLibraryArtists(1, 12);
  const { data: playlistsData, isLoading: playlistsLoading } = useLibraryPlaylists();
  const { data: tracksData, isLoading: tracksLoading } = useLibraryTracks({ limit: 12 });

  const playTrack = usePlayerStore((state) => state.playTrack);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const playlists = playlistsData?.data?.items?.slice(0, 12) ?? [];
  const artists = artistsData?.data?.items?.slice(0, 12) ?? [];
  const albums = albumsData?.data?.items?.slice(0, 12) ?? [];
  const tracks = tracksData?.data?.items?.slice(0, 12) ?? [];

  return (
    <div className="flex flex-col gap-8 pb-8">
      <header className="px-4 py-6">
        <h1 className="text-3xl font-bold text-stone-100">
          {getGreeting()}, {user?.firstName ?? 'Guest'}
        </h1>
      </header>

      <HomeSection
        title="Your Playlists"
        isLoading={playlistsLoading}
        isEmpty={playlists.length === 0}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {playlists.map((playlist, i) => {
            const isFavorites = playlist.systemRole === PlaylistSystemRole.favorites;
            return (
              <div
                key={playlist.id}
                className={cn(i >= 4 && 'hidden sm:block', i >= 9 && 'sm:hidden md:block')}
              >
                <MediaCard
                  id={playlist.id}
                  title={playlist.name}
                  subtitle="Playlist"
                  coverUrl={playlist.cover?.url ?? undefined}
                  link="/app/playlists/$playlistId"
                  routeParams={{ playlistId: playlist.id }}
                  coverSlot={isFavorites ? <FavoritesPlaylistCover /> : undefined}
                  placeholderIcon={
                    <PlaylistIcon className="size-1/2 text-stone-400" weight="duotone" />
                  }
                />
              </div>
            );
          })}
        </div>
      </HomeSection>

      <HomeSection title="Recent Songs" isLoading={tracksLoading} isEmpty={tracks.length === 0}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {tracks.map((track, i) => {
            const artists = track.artists ?? [];
            const album = track.album;
            return (
              <div
                key={track.id}
                className={cn(i >= 4 && 'hidden sm:block', i >= 9 && 'sm:hidden md:block')}
              >
                <MediaCard
                  id={track.id}
                  as="div"
                  title={track.title ?? 'Unknown Song'}
                  coverUrl={album?.cover?.url ?? undefined}
                  link="/app/library/albums/$id"
                  routeParams={{ id: track.albumId ?? '' }}
                  onClick={() => playTrack(zodTrackToPlaybackTrack(track))}
                  placeholderIcon={
                    <MusicNotesIcon className="size-1/2 text-stone-400" weight="duotone" />
                  }
                  subtitle={
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      {artists.map((a, idx) => (
                        <span key={a.id} className="flex items-center">
                          <Link
                            to="/app/library/artists/$id"
                            params={{ id: a.id }}
                            className="hover:text-stone-200 relative z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {a.name}
                          </Link>
                          {idx < artists.length - 1 && <span className="mr-1">,</span>}
                        </span>
                      ))}
                      {album && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-white/20 shrink-0" />
                          <Link
                            to="/app/library/albums/$id"
                            params={{ id: album.id }}
                            className="hover:text-stone-200 relative z-10 truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {album.name}
                          </Link>
                        </>
                      )}
                    </div>
                  }
                />
              </div>
            );
          })}
        </div>
      </HomeSection>

      <HomeSection title="Recent Artists" isLoading={artistsLoading} isEmpty={artists.length === 0}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {artists.map((item, i) => (
            <div
              key={item.artistId}
              className={cn(i >= 4 && 'hidden sm:block', i >= 9 && 'sm:hidden md:block')}
            >
              <MediaCard
                id={item.artistId}
                title={item.artist?.name ?? 'Unknown Artist'}
                subtitle="Artist"
                coverUrl={item.artist?.avatar?.url ?? undefined}
                link="/app/library/artists/$id"
                coverStyle="circle"
                placeholderIcon={
                  <UsersThreeIcon className="size-1/2 text-stone-400" weight="duotone" />
                }
              />
            </div>
          ))}
        </div>
      </HomeSection>

      <HomeSection title="Recent Albums" isLoading={albumsLoading} isEmpty={albums.length === 0}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {albums.map((item, i) => {
            const artists = item.album?.artists ?? [];
            return (
              <div
                key={item.albumId}
                className={cn(i >= 4 && 'hidden sm:block', i >= 9 && 'sm:hidden md:block')}
              >
                <MediaCard
                  id={item.albumId}
                  as="div"
                  title={item.album?.name ?? 'Unknown Album'}
                  coverUrl={item.album?.cover?.url ?? undefined}
                  link="/app/library/albums/$id"
                  onClick={() =>
                    navigate({ to: '/app/library/albums/$id', params: { id: item.albumId } })
                  }
                  placeholderIcon={<DiscIcon className="size-1/2 text-stone-400" weight="duotone" />}
                  subtitle={
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      {artists.map((a, idx) => (
                        <span key={a.id} className="flex items-center">
                          <Link
                            to="/app/library/artists/$id"
                            params={{ id: a.id }}
                            className="hover:text-stone-200 relative z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {a.name}
                          </Link>
                          {idx < artists.length - 1 && <span className="mr-1">,</span>}
                        </span>
                      ))}
                    </div>
                  }
                />
              </div>
            );
          })}
        </div>
      </HomeSection>
    </div>
  );
}

function HomeSection({
  title,
  children,
  isLoading,
  isEmpty,
}: {
  title: string;
  children: ReactNode;
  isLoading: boolean;
  isEmpty: boolean;
}) {
  if (isEmpty && !isLoading) return null;

  return (
    <section className="px-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-stone-200">{title}</h2>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-square w-full rounded-lg bg-stone-800" />
              <Skeleton className="h-4 w-3/4 bg-stone-800" />
              <Skeleton className="h-3 w-1/2 bg-stone-800" />
            </div>
          ))}
        </div>
      ) : (
        children
      )}
    </section>
  );
}
