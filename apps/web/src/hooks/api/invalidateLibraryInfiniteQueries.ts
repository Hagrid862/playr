import type { QueryClient } from '@tanstack/react-query';

export function invalidateLibraryArtistsInfinite(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: ['library', 'artists', 'infinite'] });
}

export function invalidateLibraryAlbumsInfinite(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: ['library', 'albums', 'infinite'] });
}

export function invalidateLibraryArtistAlbumsInfinite(
  queryClient: QueryClient,
  artistId?: string,
) {
  if (artistId) {
    return queryClient.invalidateQueries({
      queryKey: ['library', 'artists', artistId, 'albums', 'infinite'],
    });
  }
  return queryClient.invalidateQueries({
    predicate: (query) =>
      query.queryKey[0] === 'library' &&
      query.queryKey[1] === 'artists' &&
      query.queryKey[3] === 'albums' &&
      query.queryKey[4] === 'infinite',
  });
}
