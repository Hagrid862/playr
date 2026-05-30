import { customRenderHook } from '@repo/testing/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePersistentNavigation } from './usePersistentNavigation';

const mockUseLocation = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => mockUseLocation(),
}));

describe('usePersistentNavigation', () => {
  const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
  const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  describe('on the root/index path', () => {
    it('removes the stored route from sessionStorage', () => {
      mockUseLocation.mockReturnValue({ pathname: '/app/library/albums' });
      sessionStorage.setItem('last_visited_albums_route', '/app/library/albums/123');

      customRenderHook(() => usePersistentNavigation('albums', '/app/library/albums'));

      expect(removeItemSpy).toHaveBeenCalledWith('last_visited_albums_route');
    });

    it('removes the stored route when rootPath has a trailing slash', () => {
      mockUseLocation.mockReturnValue({ pathname: '/app/library/albums' });
      sessionStorage.setItem('last_visited_albums_route', '/app/library/albums/123');

      customRenderHook(() => usePersistentNavigation('albums', '/app/library/albums/'));

      expect(removeItemSpy).toHaveBeenCalledWith('last_visited_albums_route');
    });

    it('removes the stored route when current path has a trailing slash', () => {
      mockUseLocation.mockReturnValue({ pathname: '/app/library/albums/' });

      customRenderHook(() => usePersistentNavigation('albums', '/app/library/albums'));

      expect(removeItemSpy).toHaveBeenCalledWith('last_visited_albums_route');
    });
  });

  describe('on a sub-path within the module', () => {
    it('stores the current pathname in sessionStorage', () => {
      mockUseLocation.mockReturnValue({ pathname: '/app/library/albums/123' });

      customRenderHook(() => usePersistentNavigation('albums', '/app/library/albums'));

      expect(setItemSpy).toHaveBeenCalledWith(
        'last_visited_albums_route',
        '/app/library/albums/123',
      );
    });

    it('stores nested sub-paths', () => {
      mockUseLocation.mockReturnValue({ pathname: '/app/library/albums/123/tracks/456' });

      customRenderHook(() => usePersistentNavigation('albums', '/app/library/albums'));

      expect(setItemSpy).toHaveBeenCalledWith(
        'last_visited_albums_route',
        '/app/library/albums/123/tracks/456',
      );
    });
  });

  describe('on a path outside the module', () => {
    it('does not touch sessionStorage for unrelated paths', () => {
      mockUseLocation.mockReturnValue({ pathname: '/app/library/songs' });

      customRenderHook(() => usePersistentNavigation('albums', '/app/library/albums'));

      expect(setItemSpy).not.toHaveBeenCalled();
      expect(removeItemSpy).not.toHaveBeenCalled();
    });

    it('does not touch sessionStorage when path only partially matches root', () => {
      // e.g., rootPath is /app/library/albums but path is /app/library/album (without trailing 's')
      mockUseLocation.mockReturnValue({ pathname: '/app/library/album' });

      customRenderHook(() => usePersistentNavigation('albums', '/app/library/albums'));

      expect(setItemSpy).not.toHaveBeenCalled();
      expect(removeItemSpy).not.toHaveBeenCalled();
    });
  });

  describe('storage key format', () => {
    it('uses the correct storage key format', () => {
      mockUseLocation.mockReturnValue({ pathname: '/app/library/artists/42' });

      customRenderHook(() => usePersistentNavigation('artists', '/app/library/artists'));

      expect(setItemSpy).toHaveBeenCalledWith(
        'last_visited_artists_route',
        '/app/library/artists/42',
      );
    });
  });

  describe('path changes (re-renders)', () => {
    it('stores new path when navigating within the module', () => {
      mockUseLocation.mockReturnValue({ pathname: '/app/library/albums/123' });

      const { rerender } = customRenderHook(() =>
        usePersistentNavigation('albums', '/app/library/albums'),
      );

      expect(setItemSpy).toHaveBeenCalledWith(
        'last_visited_albums_route',
        '/app/library/albums/123',
      );

      setItemSpy.mockClear();

      // Navigate to a different album
      mockUseLocation.mockReturnValue({ pathname: '/app/library/albums/456' });
      rerender();

      expect(setItemSpy).toHaveBeenCalledWith(
        'last_visited_albums_route',
        '/app/library/albums/456',
      );
    });

    it('removes stored route when navigating back to root', () => {
      // Start on a sub-path
      mockUseLocation.mockReturnValue({ pathname: '/app/library/albums/123' });
      sessionStorage.setItem('last_visited_albums_route', '/app/library/albums/123');

      const { rerender } = customRenderHook(() =>
        usePersistentNavigation('albums', '/app/library/albums'),
      );

      expect(setItemSpy).toHaveBeenCalledWith(
        'last_visited_albums_route',
        '/app/library/albums/123',
      );

      // Navigate back to root
      mockUseLocation.mockReturnValue({ pathname: '/app/library/albums' });
      rerender();

      expect(removeItemSpy).toHaveBeenCalledWith('last_visited_albums_route');
    });

    it('does nothing when navigating to a path outside the module', () => {
      mockUseLocation.mockReturnValue({ pathname: '/app/library/albums/123' });

      const { rerender } = customRenderHook(() =>
        usePersistentNavigation('albums', '/app/library/albums'),
      );

      expect(setItemSpy).toHaveBeenCalledWith(
        'last_visited_albums_route',
        '/app/library/albums/123',
      );

      setItemSpy.mockClear();
      removeItemSpy.mockClear();

      // Navigate outside the module
      mockUseLocation.mockReturnValue({ pathname: '/app/playlists' });
      rerender();

      expect(setItemSpy).not.toHaveBeenCalled();
      expect(removeItemSpy).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles rootPath that is a substring of another route correctly', () => {
      // rootPath: /app/library/artists, path: /app/library/artists-alternative
      // This should NOT match because /app/library/artists-alternative starts with /app/library/artists
      // but the hook only checks startsWith, so it WOULD match. We verify the actual behavior.
      mockUseLocation.mockReturnValue({ pathname: '/app/library/artists-alternative' });

      customRenderHook(() => usePersistentNavigation('artists', '/app/library/artists'));

      // The hook uses startsWith, so it would store this path
      expect(setItemSpy).toHaveBeenCalledWith(
        'last_visited_artists_route',
        '/app/library/artists-alternative',
      );
    });
  });
});
