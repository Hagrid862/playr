import { describe, it, expect } from 'vitest';
import {
  buildUser,
  buildZodUser,
  buildZodArtist,
  buildZodAlbum,
  buildLibrary,
  buildLibraryTrack,
  buildLibraryAlbum,
  buildLibraryArtist,
  buildAlbum,
  buildArtist,
  buildTrack,
} from './builders';
import { RegisterRequestSchema } from '@repo/contracts';
import { CreateLibraryAlbumRequestSchema } from '@repo/contracts';

describe('api builders', () => {
  it('buildUser allows overrides and preserves shape', () => {
    const user = buildUser({ username: 'custom' });
    expect(user.username).toBe('custom');
    expect(user.id).toBeTruthy();
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it('buildZodUser returns a user-like object', () => {
    const user = buildZodUser({ username: 'custom' });
    expect(user.username).toBe('custom');
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it('buildZodArtist returns artist with visibility', () => {
    const artist = buildZodArtist();
    expect(artist.visibility).toBeDefined();
  });

  it('buildZodAlbum returns album with totals', () => {
    const album = buildZodAlbum();
    expect(album.totalTracks).toBeGreaterThanOrEqual(0);
  });

  it('library builders create consistent links', () => {
    const library = buildLibrary({ id: 'lib-1', userId: 'user-1' });
    const libTrack = buildLibraryTrack({ libraryId: library.id });
    const libAlbum = buildLibraryAlbum({ libraryId: library.id });
    const libArtist = buildLibraryArtist({ libraryId: library.id });

    expect(libTrack.libraryId).toBe(library.id);
    expect(libAlbum.libraryId).toBe(library.id);
    expect(libArtist.libraryId).toBe(library.id);
  });

  it('domain builders return coherent album/artist/track', () => {
    const album = buildAlbum({ id: 'album-1' });
    const artist = buildArtist({ id: 'artist-1' });
    const track = buildTrack({ albumId: album.id });

    expect(album.id).toBe('album-1');
    expect(artist.id).toBe('artist-1');
    expect(track.albumId).toBe(album.id);
  });
});

