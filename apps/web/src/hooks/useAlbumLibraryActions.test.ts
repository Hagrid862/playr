import { customRenderHook } from '@repo/testing/web';
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAlbumLibraryActions } from './useAlbumLibraryActions';
import { PlaylistSystemRole } from '@repo/db';
import { toast } from 'sonner';
import { getLibraryAlbumTracks } from '@/hooks/api/library-albums/requests/getLibraryAlbumTracks';
import { getLibraryPlaylistDetail } from '@/hooks/api/library-playlists/requests/getLibraryPlaylistDetail';
import { removePlaylistTrack } from '@/hooks/api/library-playlists/requests/removePlaylistTrack';
import { shareOrCopyAppLink } from '@/lib/share-app-link';
import type { RemovePlaylistTrackResponse } from '@repo/contracts';

const addAlbumMock = vi.fn();
const useLibraryPlaylistsMockFn = vi.fn(() => ({
  data: {
    data: {
      items: [
        { id: 'fav-123', systemRole: PlaylistSystemRole.favorites, name: 'Favorites' },
        { id: 'playlist-chill', systemRole: null, name: 'Chill' },
      ],
    },
  },
}));

vi.mock('@/hooks/api/library-playlists', () => ({
  useLibraryPlaylists: () => useLibraryPlaylistsMockFn(),
  useAddPlaylistAlbum: () => ({
    mutateAsync: addAlbumMock,
    isPending: false,
  }),
}));

vi.mock('@/hooks/api/library-albums/requests/getLibraryAlbumTracks', () => ({
  getLibraryAlbumTracks: vi.fn(),
}));

vi.mock('@/hooks/api/library-playlists/requests/getLibraryPlaylistDetail', () => ({
  getLibraryPlaylistDetail: vi.fn(),
}));

vi.mock('@/hooks/api/library-playlists/requests/removePlaylistTrack', () => ({
  removePlaylistTrack: vi.fn(),
}));

vi.mock('@/lib/share-app-link', () => ({
  shareOrCopyAppLink: vi.fn(),
  albumPublicUrl: vi.fn((id: string) => `https://example.com/album/${id}`),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const removePlaylistTrackSuccess: RemovePlaylistTrackResponse = {
  success: true,
  data: { ok: true },
  error: null,
  meta: {
    timestamp: '2020-01-01T00:00:00.000Z',
    requestId: 'test-req',
    path: '/library/playlists/test/tracks/t',
  },
};

describe('useAlbumLibraryActions Hook Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('determines allInFavorites is true when all tracks are in favorites playlist', async () => {
    vi.mocked(getLibraryAlbumTracks).mockResolvedValue({
      data: [
        { id: 'track-1', title: 'Song 1' },
        { id: 'track-2', title: 'Song 2' },
      ],
    } as any);

    vi.mocked(getLibraryPlaylistDetail).mockResolvedValue({
      data: {
        tracks: [
          { track: { id: 'track-1' } },
          { track: { id: 'track-2' } },
          { track: { id: 'track-3' } },
        ],
      },
    } as any);

    const { result } = customRenderHook(() =>
      useAlbumLibraryActions({ albumId: 'album-123', albumName: 'Super Album' }),
    );

    await waitFor(() => {
      expect(result.current.allInFavorites).toBe(true);
      expect(result.current.favoritesActionDisabled).toBe(false);
      expect(result.current.noLibraryTracks).toBe(false);
    });
  });

  it('determines allInFavorites is false when some tracks are missing from favorites playlist', async () => {
    vi.mocked(getLibraryAlbumTracks).mockResolvedValue({
      data: [
        { id: 'track-1', title: 'Song 1' },
        { id: 'track-2', title: 'Song 2' },
      ],
    } as any);

    vi.mocked(getLibraryPlaylistDetail).mockResolvedValue({
      data: {
        tracks: [{ track: { id: 'track-1' } }],
      },
    } as any);

    const { result } = customRenderHook(() =>
      useAlbumLibraryActions({ albumId: 'album-123', albumName: 'Super Album' }),
    );

    await waitFor(() => {
      expect(result.current.allInFavorites).toBe(false);
    });
  });

  it('determines noLibraryTracks is true when the album has zero tracks', async () => {
    vi.mocked(getLibraryAlbumTracks).mockResolvedValue({
      data: [],
    } as any);

    vi.mocked(getLibraryPlaylistDetail).mockResolvedValue({
      data: { tracks: [] },
    } as any);

    const { result } = customRenderHook(() =>
      useAlbumLibraryActions({ albumId: 'album-123', albumName: 'Super Album' }),
    );

    await waitFor(() => {
      expect(result.current.noLibraryTracks).toBe(true);
      expect(result.current.favoritesActionDisabled).toBe(true);
    });
  });

  it('adds album to favorites successfully (all tracks added)', async () => {
    addAlbumMock.mockResolvedValueOnce({
      data: { addedCount: 3, trackCount: 3 },
    });

    const { result } = customRenderHook(() =>
      useAlbumLibraryActions({ albumId: 'album-123', albumName: 'Super Album' }),
    );

    await act(async () => {
      await result.current.addAlbumToFavorites();
    });

    expect(addAlbumMock).toHaveBeenCalledWith({
      playlistId: 'fav-123',
      body: { albumId: 'album-123' },
    });
    expect(toast.success).toHaveBeenCalledWith('Added album to favorites');
  });

  it('adds album to favorites successfully (all tracks already in)', async () => {
    addAlbumMock.mockResolvedValueOnce({
      data: { addedCount: 0, trackCount: 3 },
    });

    const { result } = customRenderHook(() =>
      useAlbumLibraryActions({ albumId: 'album-123', albumName: 'Super Album' }),
    );

    await act(async () => {
      await result.current.addAlbumToFavorites();
    });

    expect(toast.success).toHaveBeenCalledWith(
      'All tracks from this album were already in the playlist',
    );
  });

  it('adds album to favorites successfully (some tracks added)', async () => {
    addAlbumMock.mockResolvedValueOnce({
      data: { addedCount: 2, trackCount: 3 },
    });

    const { result } = customRenderHook(() =>
      useAlbumLibraryActions({ albumId: 'album-123', albumName: 'Super Album' }),
    );

    await act(async () => {
      await result.current.addAlbumToFavorites();
    });

    expect(toast.success).toHaveBeenCalledWith('Added 3 songs (2 new)');
  });

  it('handles addAlbumToFavorites failure correctly', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    addAlbumMock.mockRejectedValueOnce(new Error('Network Error'));

    const { result } = customRenderHook(() =>
      useAlbumLibraryActions({ albumId: 'album-123', albumName: 'Super Album' }),
    );

    await act(async () => {
      await result.current.addAlbumToFavorites();
    });

    expect(toast.error).toHaveBeenCalledWith('Could not add album to favorites');
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('removes album from favorites successfully', async () => {
    vi.mocked(getLibraryAlbumTracks).mockResolvedValue({
      data: [{ id: 'track-1' }, { id: 'track-2' }],
    } as any);

    vi.mocked(removePlaylistTrack).mockResolvedValue(removePlaylistTrackSuccess);

    const { result } = customRenderHook(() =>
      useAlbumLibraryActions({ albumId: 'album-123', albumName: 'Super Album' }),
    );

    // Wait for query resolution
    await waitFor(() => {
      expect(result.current.favoritesActionDisabled).toBe(false);
    });

    await act(async () => {
      await result.current.removeAlbumFromFavorites();
    });

    expect(removePlaylistTrack).toHaveBeenCalledWith({ playlistId: 'fav-123', trackId: 'track-1' });
    expect(removePlaylistTrack).toHaveBeenCalledWith({ playlistId: 'fav-123', trackId: 'track-2' });
    expect(toast.success).toHaveBeenCalledWith('Removed album from favorites');
  });

  it('handles removeAlbumFromFavorites failure correctly', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getLibraryAlbumTracks).mockResolvedValue({
      data: [{ id: 'track-1' }],
    } as any);
    vi.mocked(removePlaylistTrack).mockRejectedValueOnce(new Error('Delete Error'));

    const { result } = customRenderHook(() =>
      useAlbumLibraryActions({ albumId: 'album-123', albumName: 'Super Album' }),
    );

    await waitFor(() => {
      expect(result.current.favoritesActionDisabled).toBe(false);
    });

    await act(async () => {
      await expect(result.current.removeAlbumFromFavorites()).rejects.toThrow();
    });

    expect(toast.error).toHaveBeenCalledWith('Could not remove album from favorites');
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('toggles favorites successfully: removes if allInFavorites is true', async () => {
    vi.mocked(getLibraryAlbumTracks).mockResolvedValue({
      data: [{ id: 'track-1' }],
    } as any);

    vi.mocked(getLibraryPlaylistDetail).mockResolvedValue({
      data: { tracks: [{ track: { id: 'track-1' } }] },
    } as any);

    vi.mocked(removePlaylistTrack).mockResolvedValue(removePlaylistTrackSuccess);

    const { result } = customRenderHook(() =>
      useAlbumLibraryActions({ albumId: 'album-123', albumName: 'Super Album' }),
    );

    await waitFor(() => {
      expect(result.current.allInFavorites).toBe(true);
    });

    await act(async () => {
      await result.current.toggleAlbumFavorites();
    });

    expect(removePlaylistTrack).toHaveBeenCalled();
  });

  it('toggles favorites successfully: adds if allInFavorites is false', async () => {
    vi.mocked(getLibraryAlbumTracks).mockResolvedValue({
      data: [{ id: 'track-1' }],
    } as any);

    vi.mocked(getLibraryPlaylistDetail).mockResolvedValue({
      data: { tracks: [] },
    } as any);

    addAlbumMock.mockResolvedValueOnce({
      data: { addedCount: 1, trackCount: 1 },
    });

    const { result } = customRenderHook(() =>
      useAlbumLibraryActions({ albumId: 'album-123', albumName: 'Super Album' }),
    );

    await waitFor(() => {
      expect(result.current.allInFavorites).toBe(false);
    });

    await act(async () => {
      await result.current.toggleAlbumFavorites();
    });

    expect(addAlbumMock).toHaveBeenCalled();
  });

  it('shares album correctly calling shareOrCopyAppLink utility', async () => {
    const { result } = customRenderHook(() =>
      useAlbumLibraryActions({ albumId: 'album-123', albumName: 'Super Album' }),
    );

    await act(async () => {
      await result.current.shareAlbum();
    });

    expect(shareOrCopyAppLink).toHaveBeenCalledWith({
      title: 'Super Album',
      url: 'https://example.com/album/album-123',
    });
  });

  describe('Additional coverage edge-cases', () => {
    it('throws error and shows toast when removeAlbumFromFavorites is called but favorites playlist does not exist', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      useLibraryPlaylistsMockFn.mockReturnValueOnce({
        data: {
          data: {
            items: [{ id: 'playlist-chill', systemRole: null, name: 'Chill' }],
          },
        },
      } as any);

      vi.mocked(getLibraryAlbumTracks).mockResolvedValue({
        data: [{ id: 'track-1' }],
      } as any);

      const { result } = customRenderHook(() =>
        useAlbumLibraryActions({ albumId: 'album-123', albumName: 'Super Album' }),
      );

      await waitFor(() => {
        expect(result.current.favoritesActionDisabled).toBe(true);
      });

      await act(async () => {
        await expect(result.current.removeAlbumFromFavorites()).rejects.toThrow(
          'Favorites playlist not found',
        );
      });

      expect(toast.error).toHaveBeenCalledWith('Could not remove album from favorites');
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('throws error and shows toast when removeAlbumFromFavorites is called but album tracks list is empty', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(getLibraryAlbumTracks).mockResolvedValue({
        data: [],
      } as any);

      const { result } = customRenderHook(() =>
        useAlbumLibraryActions({ albumId: 'album-123', albumName: 'Super Album' }),
      );

      await waitFor(() => {
        expect(result.current.noLibraryTracks).toBe(true);
      });

      await act(async () => {
        await expect(result.current.removeAlbumFromFavorites()).rejects.toThrow('No tracks');
      });

      expect(toast.error).toHaveBeenCalledWith('Could not remove album from favorites');
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('shows error toast when addAlbumToFavorites is called but favorites playlist does not exist', async () => {
      useLibraryPlaylistsMockFn.mockReturnValueOnce({
        data: {
          data: {
            items: [{ id: 'playlist-chill', systemRole: null, name: 'Chill' }],
          },
        },
      } as any);

      const { result } = customRenderHook(() =>
        useAlbumLibraryActions({ albumId: 'album-123', albumName: 'Super Album' }),
      );

      await act(async () => {
        await result.current.addAlbumToFavorites();
      });

      expect(toast.error).toHaveBeenCalledWith('Favorites playlist not found');
      expect(addAlbumMock).not.toHaveBeenCalled();
    });

    it('handles undefined tracks query data when calling removeAlbumFromFavorites', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(getLibraryAlbumTracks).mockResolvedValue(undefined as any);

      const { result } = customRenderHook(() =>
        useAlbumLibraryActions({ albumId: 'album-123', albumName: 'Super Album' }),
      );

      await act(async () => {
        await expect(result.current.removeAlbumFromFavorites()).rejects.toThrow('No tracks');
      });

      expect(toast.error).toHaveBeenCalledWith('Could not remove album from favorites');
      consoleErrorSpy.mockRestore();
    });

    it('handles falsy favPlaylistId when invalidating queries in onSuccess', async () => {
      useLibraryPlaylistsMockFn.mockReturnValueOnce({
        data: {
          data: {
            items: [{ id: 'fav-123', systemRole: PlaylistSystemRole.favorites, name: 'Favorites' }],
          },
        },
      } as any);

      vi.mocked(getLibraryAlbumTracks).mockResolvedValue({
        data: [{ id: 'track-1' }],
      } as any);

      let resolveRemove: (value: RemovePlaylistTrackResponse) => void = () => {};
      const removePromise = new Promise<RemovePlaylistTrackResponse>((resolve) => {
        resolveRemove = resolve;
      });

      vi.mocked(removePlaylistTrack).mockImplementation(async () => {
        useLibraryPlaylistsMockFn.mockReturnValue({
          data: {
            data: {
              items: [],
            },
          },
        } as any);
        return removePromise;
      });

      const { result, rerender } = customRenderHook(() =>
        useAlbumLibraryActions({ albumId: 'album-123', albumName: 'Super Album' }),
      );

      await waitFor(() => {
        expect(result.current.favoritesActionDisabled).toBe(false);
      });

      let promise: Promise<void>;
      act(() => {
        promise = result.current.removeAlbumFromFavorites();
      });

      act(() => {
        rerender();
      });

      await act(async () => {
        resolveRemove(removePlaylistTrackSuccess);
        await promise;
      });

      expect(toast.success).toHaveBeenCalledWith('Removed album from favorites');
    });
  });
});
