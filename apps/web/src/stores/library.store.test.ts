import { ZodAlbum, ZodArtist } from '@repo/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { useLibraryStore } from './library.store';

const mockArtist: ZodArtist = {
  id: 'artist-1',
  name: 'Test Artist',
  description: 'A test artist',
  isCommunity: false,
  visibility: 'public',
  verified: true,
  avatarId: null,
  bannerId: null,
  avatar: null,
  banner: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockAlbum: ZodAlbum = {
  id: 'album-1',
  name: 'Test Album',
  description: 'A test album',
  type: 'album',
  totalTracks: 10,
  totalDuration: 3600,
  releaseDate: new Date(),
  visibility: 'public',
  coverId: null,
  cover: null,
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
    expect(state.privateAlbums).toEqual([]);
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

  it('sets privateAlbums via setPrivateAlbums', () => {
    const albums = [mockAlbum];
    useLibraryStore.getState().setPrivateAlbums(albums);
    expect(useLibraryStore.getState().privateAlbums).toEqual(albums);
  });

  describe('updatePrivateArtist', () => {
    it('adds a new artist if it does not exist', () => {
      useLibraryStore.getState().updatePrivateArtist(mockArtist);
      expect(useLibraryStore.getState().privateArtists).toEqual([mockArtist]);
    });

    it('updates an existing artist', () => {
      useLibraryStore.getState().setPrivateArtists([mockArtist]);
      const updatedArtist = { ...mockArtist, name: 'Updated Artist' };
      useLibraryStore.getState().updatePrivateArtist(updatedArtist);
      expect(useLibraryStore.getState().privateArtists).toEqual([updatedArtist]);
    });
  });

  describe('updatePrivateAlbum', () => {
    it('adds a new album if it does not exist', () => {
      useLibraryStore.getState().updatePrivateAlbum(mockAlbum);
      expect(useLibraryStore.getState().privateAlbums).toEqual([mockAlbum]);
    });

    it('updates an existing album', () => {
      useLibraryStore.getState().setPrivateAlbums([mockAlbum]);
      const updatedAlbum = { ...mockAlbum, title: 'Updated Album' };
      useLibraryStore.getState().updatePrivateAlbum(updatedAlbum);
      expect(useLibraryStore.getState().privateAlbums).toEqual([updatedAlbum]);
    });
  });

  it('removes a private artist via removePrivateArtist', () => {
    useLibraryStore.getState().setPrivateArtists([mockArtist]);
    useLibraryStore.getState().removePrivateArtist(mockArtist.id);
    expect(useLibraryStore.getState().privateArtists).toEqual([]);
  });

  it('removes a private album via removePrivateAlbum', () => {
    useLibraryStore.getState().setPrivateAlbums([mockAlbum]);
    useLibraryStore.getState().removePrivateAlbum(mockAlbum.id);
    expect(useLibraryStore.getState().privateAlbums).toEqual([]);
  });

  it('clears state via clearLibrary', () => {
    const store = useLibraryStore.getState();
    store.setLibraryId('lib-1');
    store.setPrivateAccountId('acc-1');
    store.setPrivateArtists([mockArtist]);
    store.setPrivateAlbums([mockAlbum]);

    store.clearLibrary();

    const state = useLibraryStore.getState();
    expect(state.libraryId).toBeNull();
    expect(state.privateAccountId).toBeNull();
    expect(state.privateArtists).toEqual([]);
    expect(state.privateAlbums).toEqual([]);
  });
});
