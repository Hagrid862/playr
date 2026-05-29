import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import {
  invalidateLibraryAlbumsInfinite,
  invalidateLibraryArtistAlbumsInfinite,
  invalidateLibraryArtistsInfinite,
} from './invalidateLibraryInfiniteQueries';

describe('invalidateLibraryInfiniteQueries', () => {
  it('invalidates artists infinite queries', async () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    await invalidateLibraryArtistsInfinite(queryClient);

    expect(spy).toHaveBeenCalledWith({ queryKey: ['library', 'artists', 'infinite'] });
  });

  it('invalidates albums infinite queries', async () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    await invalidateLibraryAlbumsInfinite(queryClient);

    expect(spy).toHaveBeenCalledWith({ queryKey: ['library', 'albums', 'infinite'] });
  });

  it('invalidates artist albums infinite for a specific artist', async () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    await invalidateLibraryArtistAlbumsInfinite(queryClient, 'artist-1');

    expect(spy).toHaveBeenCalledWith({
      queryKey: ['library', 'artists', 'artist-1', 'albums', 'infinite'],
    });
  });
});
