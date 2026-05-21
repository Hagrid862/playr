import { getLibraryAlbumTracks } from '@/hooks/api/library-albums/requests/getLibraryAlbumTracks';
import { useAddPlaylistAlbum, useLibraryPlaylists } from '@/hooks/api/library-playlists';
import { libraryPlaylistPinsQueryKey } from '@/hooks/api/library-playlists/useLibraryPlaylistPins';
import { libraryPlaylistsQueryKey } from '@/hooks/api/library-playlists/useLibraryPlaylists';
import { getLibraryPlaylistDetail } from '@/hooks/api/library-playlists/requests/getLibraryPlaylistDetail';
import { removePlaylistTrack } from '@/hooks/api/library-playlists/requests/removePlaylistTrack';
import { albumPublicUrl, shareOrCopyAppLink } from '@/lib/share-app-link';
import { PlaylistSystemRole } from '@repo/db';
import type { QueryClient } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';

function toastPlaylistAddResult(addedCount: number, trackCount: number, successLabel: string) {
  if (addedCount === 0) {
    toast.success('All tracks from this album were already in the playlist');
  } else if (addedCount === trackCount) {
    toast.success(successLabel);
  } else {
    toast.success(`Added ${trackCount} songs (${addedCount} new)`);
  }
}

function invalidateAlbumFavoritesQueries(
  qc: QueryClient,
  favPlaylistId: string | undefined,
  albumId: string,
) {
  if (favPlaylistId) {
    void qc.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === 'library' &&
        q.queryKey[1] === 'playlists' &&
        q.queryKey[2] === favPlaylistId,
    });
  }
  void qc.invalidateQueries({ queryKey: ['library', 'albums', albumId, 'tracks-for-fav'] });
  void qc.invalidateQueries({ queryKey: ['library', 'albums', albumId] });
  void qc.invalidateQueries({ queryKey: libraryPlaylistsQueryKey });
  void qc.invalidateQueries({ queryKey: libraryPlaylistPinsQueryKey });
}

const albumTracksForFavoritesKey = (albumId: string) =>
  ['library', 'albums', albumId, 'tracks-for-fav'] as const;

const favoritesPlaylistTrackSetKey = (favPlaylistId: string) =>
  ['library', 'playlists', favPlaylistId, 'all-tracks'] as const;

export function useAlbumLibraryActions(options: { albumId: string; albumName: string }) {
  const { albumId, albumName } = options;
  const queryClient = useQueryClient();
  const { data: playlistsRes } = useLibraryPlaylists();
  const { mutateAsync: addAlbum, isPending: isAddAlbumPending } = useAddPlaylistAlbum();

  const favPlaylist = useMemo(
    () => playlistsRes?.data?.items.find((p) => p.systemRole === PlaylistSystemRole.favorites),
    [playlistsRes?.data?.items],
  );
  const favPlaylistId = favPlaylist?.id;

  const albumTracksQuery = useQuery({
    queryKey: albumTracksForFavoritesKey(albumId),
    queryFn: () => getLibraryAlbumTracks(albumId),
    enabled: !!albumId && !!favPlaylistId,
  });

  const favTracksQuery = useQuery({
    queryKey: favPlaylistId
      ? favoritesPlaylistTrackSetKey(favPlaylistId)
      : ['library', 'playlists', 'none'],
    queryFn: () => getLibraryPlaylistDetail({ playlistId: favPlaylistId! }),
    enabled: !!favPlaylistId,
    staleTime: 30_000,
  });

  const albumTracks = useMemo(
    () => albumTracksQuery.data?.data ?? [],
    [albumTracksQuery.data?.data],
  );

  const favTrackIdSet = useMemo(() => {
    const rows = favTracksQuery.data?.data.tracks ?? [];
    return new Set(rows.map((r) => r.track.id));
  }, [favTracksQuery.data?.data.tracks]);

  const allInFavorites = useMemo(() => {
    if (!albumTracks.length) return false;
    return albumTracks.every((t) => favTrackIdSet.has(t.id));
  }, [albumTracks, favTrackIdSet]);

  const favoritesMembershipPending =
    (!!favPlaylistId && (albumTracksQuery.isPending || favTracksQuery.isPending)) ||
    (!!favPlaylistId && (albumTracksQuery.isFetching || favTracksQuery.isFetching));

  const noLibraryTracks =
    albumTracksQuery.isSuccess &&
    Array.isArray(albumTracksQuery.data?.data) &&
    albumTracks.length === 0;

  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!favPlaylistId) {
        throw new Error('Favorites playlist not found');
      }
      const tracks = albumTracksQuery.data?.data ?? [];
      if (!tracks.length) {
        throw new Error('No tracks');
      }
      await Promise.all(
        tracks.map((t) => removePlaylistTrack({ playlistId: favPlaylistId, trackId: t.id })),
      );
    },
    onSuccess: () => {
      invalidateAlbumFavoritesQueries(queryClient, favPlaylistId, albumId);
      toast.success('Removed album from favorites');
    },
    onError: (e) => {
      console.error(e);
      toast.error('Could not remove album from favorites');
    },
  });

  const addAlbumToFavorites = useCallback(async () => {
    if (!favPlaylist) {
      toast.error('Favorites playlist not found');
      return;
    }
    try {
      const res = await addAlbum({ playlistId: favPlaylist.id, body: { albumId } });
      const { addedCount, trackCount } = res.data;
      toastPlaylistAddResult(addedCount, trackCount, 'Added album to favorites');
      invalidateAlbumFavoritesQueries(queryClient, favPlaylist.id, albumId);
    } catch (e) {
      console.error(e);
      toast.error('Could not add album to favorites');
    }
  }, [addAlbum, albumId, favPlaylist, queryClient]);

  const removeAlbumFromFavorites = useCallback(async () => {
    await removeMutation.mutateAsync();
  }, [removeMutation]);

  const toggleAlbumFavorites = useCallback(async () => {
    if (allInFavorites) {
      await removeAlbumFromFavorites();
    } else {
      await addAlbumToFavorites();
    }
  }, [addAlbumToFavorites, allInFavorites, removeAlbumFromFavorites]);

  const shareAlbum = useCallback(async () => {
    await shareOrCopyAppLink({
      title: albumName,
      url: albumPublicUrl(albumId),
    });
  }, [albumId, albumName]);

  const isFavoritesMutating = isAddAlbumPending || removeMutation.isPending;

  const favoritesActionDisabled =
    !favPlaylistId || noLibraryTracks || favoritesMembershipPending || isFavoritesMutating;

  return {
    allInFavorites,
    favoritesMembershipPending,
    noLibraryTracks,
    favoritesActionDisabled,
    addAlbumToFavorites,
    removeAlbumFromFavorites,
    toggleAlbumFavorites,
    shareAlbum,
    isAddAlbumPending,
    isFavoritesMutating,
  };
}
