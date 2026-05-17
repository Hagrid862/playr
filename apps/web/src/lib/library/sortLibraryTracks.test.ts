import type { ZodTrack } from '@repo/contracts';
import { Visibility } from '@repo/db';
import { describe, expect, it } from 'vitest';
import { sortLibraryTracksForDisplay } from './sortLibraryTracks';

function minimalTrack(overrides: Partial<ZodTrack> & Pick<ZodTrack, 'id'>): ZodTrack {
  return {
    id: overrides.id,
    title: overrides.title ?? 'Title',
    trackNumber: overrides.trackNumber ?? 1,
    diskNumber: overrides.diskNumber ?? 1,
    duration: overrides.duration ?? 60,
    listenedCount: 0,
    explicit: false,
    lyrics: null,
    albumId: overrides.albumId ?? 'album-1',
    visibility: overrides.visibility ?? Visibility.private,
    createdAt: overrides.createdAt ?? '2020-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2020-01-01T00:00:00.000Z',
    deletedAt: null,
    album: overrides.album,
    artists: overrides.artists,
    audioFiles: overrides.audioFiles,
    credits: overrides.credits,
    genres: overrides.genres,
    playlistTracks: overrides.playlistTracks,
  } as ZodTrack;
}

describe('sortLibraryTracksForDisplay', () => {
  it('orders by album name, then disk, track number, then title', () => {
    const tracks = [
      minimalTrack({
        id: 't2',
        title: 'B',
        trackNumber: 2,
        albumId: 'a1',
        album: { id: 'a1', name: 'Beta Album' } as ZodTrack['album'],
      }),
      minimalTrack({
        id: 't1',
        title: 'A',
        trackNumber: 1,
        albumId: 'a2',
        album: { id: 'a2', name: 'Alpha Album' } as ZodTrack['album'],
      }),
    ];
    const sorted = sortLibraryTracksForDisplay(tracks);
    expect(sorted.map((t) => t.id)).toEqual(['t1', 't2']);
  });

  it('treats missing album name as UNKNOWN_ALBUM_LABEL for ordering', () => {
    const named = minimalTrack({
      id: 'named',
      title: 'Z',
      album: { id: 'x', name: 'A Named Album' } as ZodTrack['album'],
    });
    const noAlbumMeta = minimalTrack({
      id: 'unknown',
      title: 'A',
      album: undefined,
    });
    const sorted = sortLibraryTracksForDisplay([noAlbumMeta, named]);
    expect(sorted.map((t) => t.id)).toEqual(['named', 'unknown']);
    expect(sortLibraryTracksForDisplay([named, noAlbumMeta]).map((t) => t.id)).toEqual([
      'named',
      'unknown',
    ]);
  });

  it('ties disk and track number before title', () => {
    const tB = minimalTrack({
      id: 'b',
      title: 'B',
      trackNumber: 1,
      diskNumber: 1,
      album: { id: 'a1', name: 'Same' } as ZodTrack['album'],
    });
    const tA = minimalTrack({
      id: 'a',
      title: 'A',
      trackNumber: 1,
      diskNumber: 1,
      album: { id: 'a1', name: 'Same' } as ZodTrack['album'],
    });
    const sorted = sortLibraryTracksForDisplay([tB, tA]);
    expect(sorted.map((t) => t.id)).toEqual(['a', 'b']);
  });
});
