import type { ZodTrack } from '@repo/contracts';
import { Visibility } from '@repo/db';
import { describe, expect, it } from 'vitest';
import { compareLibraryTracksForDisplay, sortLibraryTracksForDisplay } from './sortLibraryTracks';

function minimalTrack(overrides: Partial<ZodTrack> & Pick<ZodTrack, 'id'>): ZodTrack {
  const { id, ...rest } = overrides;
  return {
    id,
    title: 'Title',
    trackNumber: 1,
    diskNumber: 1,
    duration: 60,
    listenedCount: 0,
    explicit: false,
    lyrics: null,
    albumId: 'album-1',
    visibility: Visibility.private,
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
    deletedAt: null,
    ...rest,
  } as ZodTrack;
}

describe('sortLibraryTracksForDisplay', () => {
  it('treats whitespace-only album name as unknown label for ordering', () => {
    const whitespaceName = minimalTrack({
      id: 'ws',
      title: 'A',
      album: { id: 'a1', name: '   ' } as ZodTrack['album'],
    });
    const named = minimalTrack({
      id: 'named',
      title: 'Z',
      album: { id: 'a2', name: 'Apple Album' } as ZodTrack['album'],
    });
    const sorted = sortLibraryTracksForDisplay([whitespaceName, named]);
    expect(sorted.map((t) => t.id)).toEqual(['named', 'ws']);
  });

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

  it('orders by disk number when album matches', () => {
    const disk2 = minimalTrack({
      id: 'disk2',
      title: 'A',
      trackNumber: 1,
      diskNumber: 2,
      album: { id: 'a1', name: 'Same Album' } as ZodTrack['album'],
    });
    const disk1 = minimalTrack({
      id: 'disk1',
      title: 'Z',
      trackNumber: 99,
      diskNumber: 1,
      album: { id: 'a1', name: 'Same Album' } as ZodTrack['album'],
    });
    const sorted = sortLibraryTracksForDisplay([disk2, disk1]);
    expect(sorted.map((t) => t.id)).toEqual(['disk1', 'disk2']);
  });

  it('orders by track number when album and disk match', () => {
    const track3 = minimalTrack({
      id: 'tn3',
      title: 'A',
      trackNumber: 3,
      diskNumber: 1,
      album: { id: 'a1', name: 'Same Album' } as ZodTrack['album'],
    });
    const track1 = minimalTrack({
      id: 'tn1',
      title: 'Z',
      trackNumber: 1,
      diskNumber: 1,
      album: { id: 'a1', name: 'Same Album' } as ZodTrack['album'],
    });
    const sorted = sortLibraryTracksForDisplay([track3, track1]);
    expect(sorted.map((t) => t.id)).toEqual(['tn1', 'tn3']);
  });

  it('defaults omitted diskNumber to 1 when comparing to a higher disk', () => {
    const implicitDisk1 = minimalTrack({
      id: 'implicit-d1',
      title: 'Z',
      diskNumber: undefined,
      trackNumber: 1,
      album: { id: 'a1', name: 'Album' } as ZodTrack['album'],
    });
    const disk2 = minimalTrack({
      id: 'disk-2',
      title: 'A',
      diskNumber: 2,
      trackNumber: 1,
      album: { id: 'a1', name: 'Album' } as ZodTrack['album'],
    });
    const sorted = sortLibraryTracksForDisplay([disk2, implicitDisk1]);
    expect(sorted.map((t) => t.id)).toEqual(['implicit-d1', 'disk-2']);
  });

  it('defaults omitted trackNumber to 0 when comparing to a higher track number', () => {
    const implicitTn0 = minimalTrack({
      id: 'implicit-t0',
      title: 'Z',
      trackNumber: undefined,
      diskNumber: 1,
      album: { id: 'a1', name: 'Album' } as ZodTrack['album'],
    });
    const track5 = minimalTrack({
      id: 'track-5',
      title: 'A',
      trackNumber: 5,
      diskNumber: 1,
      album: { id: 'a1', name: 'Album' } as ZodTrack['album'],
    });
    const sorted = sortLibraryTracksForDisplay([track5, implicitTn0]);
    expect(sorted.map((t) => t.id)).toEqual(['implicit-t0', 'track-5']);
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

  it('preserves disk number 0 (not replaced by nullish default)', () => {
    const disk0 = minimalTrack({
      id: 'd0',
      title: 'Z',
      diskNumber: 0,
      trackNumber: 1,
      album: { id: 'a1', name: 'Al' } as ZodTrack['album'],
    });
    const disk1 = minimalTrack({
      id: 'd1',
      title: 'A',
      diskNumber: 1,
      trackNumber: 1,
      album: { id: 'a1', name: 'Al' } as ZodTrack['album'],
    });
    expect(sortLibraryTracksForDisplay([disk1, disk0]).map((t) => t.id)).toEqual(['d0', 'd1']);
  });

  it('preserves track number 0 (not replaced by nullish default)', () => {
    const tn0 = minimalTrack({
      id: 't0',
      title: 'Z',
      diskNumber: 1,
      trackNumber: 0,
      album: { id: 'a1', name: 'Al' } as ZodTrack['album'],
    });
    const tn2 = minimalTrack({
      id: 't2',
      title: 'A',
      diskNumber: 1,
      trackNumber: 2,
      album: { id: 'a1', name: 'Al' } as ZodTrack['album'],
    });
    expect(sortLibraryTracksForDisplay([tn2, tn0]).map((t) => t.id)).toEqual(['t0', 't2']);
  });

  it('ties explicit track 0 and undefined trackNumber before title', () => {
    const explicitZero = minimalTrack({
      id: 'z',
      title: 'B',
      diskNumber: 1,
      trackNumber: 0,
      album: { id: 'a1', name: 'Al' } as ZodTrack['album'],
    });
    const implicitZero = minimalTrack({
      id: 'u',
      title: 'A',
      diskNumber: 1,
      trackNumber: undefined,
      album: { id: 'a1', name: 'Al' } as ZodTrack['album'],
    });
    expect(sortLibraryTracksForDisplay([explicitZero, implicitZero]).map((t) => t.id)).toEqual([
      'u',
      'z',
    ]);
  });

  it('sorts by title when album object has no name (same as unknown label)', () => {
    const albumSansName = minimalTrack({
      id: 'sans',
      title: 'Z',
      album: { id: 'x' } as ZodTrack['album'],
    });
    const named = minimalTrack({
      id: 'named',
      title: 'A',
      album: { id: 'y', name: 'Apple' } as ZodTrack['album'],
    });
    expect(sortLibraryTracksForDisplay([albumSansName, named]).map((t) => t.id)).toEqual([
      'named',
      'sans',
    ]);
  });

  it('sorts by trimmed title with undefined title treated as empty', () => {
    const withTitle = minimalTrack({
      id: 'has',
      title: 'Z',
      trackNumber: 1,
      diskNumber: 1,
      album: { id: 'a1', name: 'Al' } as ZodTrack['album'],
    });
    const missingTitle = {
      ...minimalTrack({
        id: 'miss',
        title: 'placeholder',
        trackNumber: 1,
        diskNumber: 1,
        album: { id: 'a1', name: 'Al' } as ZodTrack['album'],
      }),
      title: undefined,
    } as unknown as ZodTrack;
    expect(sortLibraryTracksForDisplay([withTitle, missingTitle]).map((t) => t.id)).toEqual([
      'miss',
      'has',
    ]);
  });

  it('orders disk 0 before omitted diskNumber (defaults to 1)', () => {
    const disk0 = minimalTrack({
      id: 'zero',
      diskNumber: 0,
      trackNumber: 1,
      title: 'Z',
      album: { id: 'a1', name: 'Al' } as ZodTrack['album'],
    });
    const diskUndef = minimalTrack({
      id: 'undef-disk',
      diskNumber: undefined,
      trackNumber: 1,
      title: 'A',
      album: { id: 'a1', name: 'Al' } as ZodTrack['album'],
    });
    expect(sortLibraryTracksForDisplay([diskUndef, disk0]).map((t) => t.id)).toEqual([
      'zero',
      'undef-disk',
    ]);
  });

  it('treats null trackNumber like 0 when sorting against a larger track number', () => {
    const nullTn = {
      ...minimalTrack({
        id: 'null-tn',
        title: 'Z',
        diskNumber: 1,
        trackNumber: 3,
        album: { id: 'a1', name: 'Al' } as ZodTrack['album'],
      }),
      trackNumber: null,
    } as unknown as ZodTrack;
    const higher = minimalTrack({
      id: 'higher',
      title: 'A',
      diskNumber: 1,
      trackNumber: 4,
      album: { id: 'a1', name: 'Al' } as ZodTrack['album'],
    });
    expect(sortLibraryTracksForDisplay([higher, nullTn]).map((t) => t.id)).toEqual(['null-tn', 'higher']);
  });

  it('trims leading and trailing whitespace in titles when comparing', () => {
    const spaced = minimalTrack({
      id: 'spaced',
      title: '  beta  ',
      trackNumber: 1,
      diskNumber: 1,
      album: { id: 'a1', name: 'Al' } as ZodTrack['album'],
    });
    const plain = minimalTrack({
      id: 'plain',
      title: 'alpha',
      trackNumber: 1,
      diskNumber: 1,
      album: { id: 'a1', name: 'Al' } as ZodTrack['album'],
    });
    expect(sortLibraryTracksForDisplay([spaced, plain]).map((t) => t.id)).toEqual(['plain', 'spaced']);
  });

  it('treats null title like empty string when breaking ties', () => {
    const nullTitle = {
      ...minimalTrack({
        id: 'nullt',
        title: 'X',
        trackNumber: 1,
        diskNumber: 1,
        album: { id: 'a1', name: 'Al' } as ZodTrack['album'],
      }),
      title: null,
    } as unknown as ZodTrack;
    const other = minimalTrack({
      id: 'other',
      title: 'B',
      trackNumber: 1,
      diskNumber: 1,
      album: { id: 'a1', name: 'Al' } as ZodTrack['album'],
    });
    expect(sortLibraryTracksForDisplay([other, nullTitle]).map((t) => t.id)).toEqual(['nullt', 'other']);
  });
});

describe('compareLibraryTracksForDisplay', () => {
  const sharedAlbum = { id: 'al', name: 'Shared' } as ZodTrack['album'];

  it('evaluates b-side diskNumber nullish coalescing when b omits disk', () => {
    const higherDisk = minimalTrack({
      id: 'hi',
      diskNumber: 2,
      trackNumber: 1,
      title: 'A',
      album: sharedAlbum,
    });
    const defaultDisk = minimalTrack({
      id: 'def',
      diskNumber: undefined,
      trackNumber: 1,
      title: 'Z',
      album: sharedAlbum,
    });
    expect(compareLibraryTracksForDisplay(higherDisk, defaultDisk)).toBeGreaterThan(0);
    expect(compareLibraryTracksForDisplay(defaultDisk, higherDisk)).toBeLessThan(0);
  });

  it('evaluates b-side trackNumber nullish coalescing when b omits track number', () => {
    const higherTn = minimalTrack({
      id: 'hi',
      diskNumber: 1,
      trackNumber: 4,
      title: 'A',
      album: sharedAlbum,
    });
    const defaultTn = minimalTrack({
      id: 'def',
      diskNumber: 1,
      trackNumber: undefined,
      title: 'Z',
      album: sharedAlbum,
    });
    expect(compareLibraryTracksForDisplay(higherTn, defaultTn)).toBeGreaterThan(0);
    expect(compareLibraryTracksForDisplay(defaultTn, higherTn)).toBeLessThan(0);
  });

  it('evaluates b-side title optional chaining when b.title is undefined', () => {
    const titled = minimalTrack({
      id: 't',
      diskNumber: 1,
      trackNumber: 1,
      title: 'Zebra',
      album: sharedAlbum,
    });
    const noTitle = {
      ...minimalTrack({
        id: 'n',
        diskNumber: 1,
        trackNumber: 1,
        title: 'X',
        album: sharedAlbum,
      }),
      title: undefined,
    } as unknown as ZodTrack;
    expect(compareLibraryTracksForDisplay(titled, noTitle)).toBeGreaterThan(0);
    expect(compareLibraryTracksForDisplay(noTitle, titled)).toBeLessThan(0);
  });

  it('evaluates b-side title optional chaining when b.title is null', () => {
    const titled = minimalTrack({
      id: 't',
      diskNumber: 1,
      trackNumber: 1,
      title: 'Zebra',
      album: sharedAlbum,
    });
    const nullTitle = {
      ...minimalTrack({
        id: 'n',
        diskNumber: 1,
        trackNumber: 1,
        title: 'X',
        album: sharedAlbum,
      }),
      title: null,
    } as unknown as ZodTrack;
    expect(compareLibraryTracksForDisplay(titled, nullTitle)).toBeGreaterThan(0);
    expect(compareLibraryTracksForDisplay(nullTitle, titled)).toBeLessThan(0);
  });

  it('trims b.title when b is the spaced operand', () => {
    const plain = minimalTrack({
      id: 'p',
      diskNumber: 1,
      trackNumber: 1,
      title: 'beta',
      album: sharedAlbum,
    });
    const spaced = minimalTrack({
      id: 's',
      diskNumber: 1,
      trackNumber: 1,
      title: '  alpha  ',
      album: sharedAlbum,
    });
    expect(compareLibraryTracksForDisplay(plain, spaced)).toBeGreaterThan(0);
    expect(compareLibraryTracksForDisplay(spaced, plain)).toBeLessThan(0);
  });
});
