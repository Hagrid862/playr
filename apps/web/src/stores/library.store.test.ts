import { ZodArtist } from '@repo/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { useLibraryStore } from './library.store';

const mockArtist: ZodArtist = {
  id: 'artist-1',
  name: 'Test Artist',
  description: 'A test artist',
  isCommunity: false,
  visibility: 'PUBLIC',
  verified: true,
  avatarId: null,
  bannerId: null,
  avatar: null,
  banner: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('library.store', () => {
  beforeEach(() => {
    useLibraryStore.getState().clearLibrary();
  });

  it('initializes with null/empty state', () => {
    const state = useLibraryStore.getState();
    expect(state.libraryId).toBeNull();
    expect(state.privateAccountId).toBeNull();
    expect(state.privateArtists).toEqual([]);
  });

  it('sets libraryId via setLibraryId', () => {
    useLibraryStore.getState().setLibraryId('lib-123');
    expect(useLibraryStore.getState().libraryId).toBe('lib-123');
  });

  it('sets privateAccountId via setPrivateAccountId', () => {
    useLibraryStore.getState().setPrivateAccountId('acc-123');
    expect(useLibraryStore.getState().privateAccountId).toBe('acc-123');
  });

  it('sets privateArtists via setPrivateArtists', () => {
    const artists = [mockArtist];
    useLibraryStore.getState().setPrivateArtists(artists);
    expect(useLibraryStore.getState().privateArtists).toEqual(artists);
  });

  it('clears state via clearLibrary', () => {
    const store = useLibraryStore.getState();
    store.setLibraryId('lib-1');
    store.setPrivateAccountId('acc-1');
    store.setPrivateArtists([mockArtist]);

    store.clearLibrary();

    const state = useLibraryStore.getState();
    expect(state.libraryId).toBeNull();
    expect(state.privateAccountId).toBeNull();
    expect(state.privateArtists).toEqual([]);
  });
});
