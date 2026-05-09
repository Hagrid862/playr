import type { ZodArtist, ZodTrack } from '@repo/contracts';
import { Visibility } from '@repo/db';
import { artistBuilder, trackBuilder } from '@repo/testing/builders';
import { describe, expect, it } from 'vitest';
import {
  buildDraftsFromServerTracks,
  draftsEqualForTrack,
  trackToDraft,
  type EditAlbumTrackDraft,
} from './editAlbumTracksDraft';

function baseTrack(): ZodTrack {
  const mainArtist = artistBuilder({ id: 'a1', name: 'Main' }) as ZodArtist;
  return {
    ...trackBuilder({
      id: 't1',
      albumId: 'alb',
      title: 'Title',
      trackNumber: 1,
      diskNumber: 1,
      explicit: false,
    }),
    visibility: Visibility.private,
    artists: [mainArtist],
    updatedAt: new Date('2024-01-01'),
  } as ZodTrack;
}

describe('trackToDraft', () => {
  it('maps artists to ids', () => {
    const a = artistBuilder({ id: 'x', name: 'X' }) as ZodArtist;
    const b = artistBuilder({ id: 'y', name: 'Y' }) as ZodArtist;
    const track = { ...baseTrack(), artists: [a, b] } as ZodTrack;
    expect(trackToDraft(track).artistIds).toEqual(['x', 'y']);
  });

  it('uses empty artist ids when artists is missing', () => {
    const track = { ...baseTrack(), artists: undefined } as ZodTrack;
    expect(trackToDraft(track).artistIds).toEqual([]);
  });

  it('uses empty artist ids when artists is empty', () => {
    const track = { ...baseTrack(), artists: [] } as ZodTrack;
    expect(trackToDraft(track).artistIds).toEqual([]);
  });

  it('maps genres to genre ids', () => {
    const track = {
      ...baseTrack(),
      genres: [
        {
          id: 'tg1',
          trackId: 't1',
          genreId: 'genre-rock',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ],
    } as ZodTrack;
    expect(trackToDraft(track).genreIds).toEqual(['genre-rock']);
  });

  it('uses empty genre ids when genres is missing', () => {
    const track = { ...baseTrack(), genres: undefined } as ZodTrack;
    expect(trackToDraft(track).genreIds).toEqual([]);
  });

  it('maps an empty genres array to empty genre ids', () => {
    const track = { ...baseTrack(), genres: [] } as ZodTrack;
    expect(trackToDraft(track).genreIds).toEqual([]);
  });
});

describe('draftsEqualForTrack', () => {
  const draftBase = (): EditAlbumTrackDraft => ({
    title: 'Title',
    trackNumber: 1,
    diskNumber: 1,
    explicit: false,
    artistIds: ['a1'],
    genreIds: [],
  });

  it('returns true when server track matches draft on all fields', () => {
    const track = baseTrack();
    expect(draftsEqualForTrack(track, draftBase())).toBe(true);
  });

  it('returns true when artist order differs but id sets match', () => {
    const a = artistBuilder({ id: 'x', name: 'X' }) as ZodArtist;
    const b = artistBuilder({ id: 'y', name: 'Y' }) as ZodArtist;
    const track = { ...baseTrack(), artists: [a, b] } as ZodTrack;
    expect(
      draftsEqualForTrack(track, {
        ...draftBase(),
        artistIds: ['y', 'x'],
      }),
    ).toBe(true);
  });

  it('returns false when title differs', () => {
    expect(draftsEqualForTrack(baseTrack(), { ...draftBase(), title: 'Other' })).toBe(false);
  });

  it('returns false when trackNumber differs', () => {
    expect(draftsEqualForTrack(baseTrack(), { ...draftBase(), trackNumber: 2 })).toBe(false);
  });

  it('returns false when diskNumber differs', () => {
    expect(draftsEqualForTrack(baseTrack(), { ...draftBase(), diskNumber: 2 })).toBe(false);
  });

  it('returns false when explicit differs', () => {
    expect(draftsEqualForTrack(baseTrack(), { ...draftBase(), explicit: true })).toBe(false);
  });

  it('returns false when artist id set differs', () => {
    expect(draftsEqualForTrack(baseTrack(), { ...draftBase(), artistIds: ['other'] })).toBe(false);
  });

  it('treats missing server genres as empty when comparing to empty draft genre ids', () => {
    const track = { ...baseTrack(), genres: undefined } as ZodTrack;
    expect(draftsEqualForTrack(track, draftBase())).toBe(true);
  });

  it('treats null artists on the server track like an empty artist list', () => {
    const track = { ...baseTrack(), artists: null as unknown as [] } as ZodTrack;
    expect(draftsEqualForTrack(track, { ...draftBase(), artistIds: [] })).toBe(true);
  });

  it('treats null genres on the server track like an empty genre list', () => {
    const track = { ...baseTrack(), genres: null as unknown as [] } as ZodTrack;
    expect(draftsEqualForTrack(track, draftBase())).toBe(true);
  });

  it('compares genre ids when the server track includes genre rows', () => {
    const track = {
      ...baseTrack(),
      genres: [
        {
          id: 'tg',
          trackId: 't1',
          genreId: 'g-x',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    } as ZodTrack;
    expect(draftsEqualForTrack(track, { ...draftBase(), genreIds: ['g-x'] })).toBe(true);
  });
});

describe('buildDraftsFromServerTracks', () => {
  it('returns empty object for empty input', () => {
    expect(buildDraftsFromServerTracks([])).toEqual({});
  });

  it('maps each track by id', () => {
    const t1 = { ...baseTrack(), id: 't1' } as ZodTrack;
    const t2 = {
      ...baseTrack(),
      id: 't2',
      title: 'Second',
      trackNumber: 2,
    } as ZodTrack;
    const out = buildDraftsFromServerTracks([t1, t2]);
    expect(Object.keys(out).sort()).toEqual(['t1', 't2']);
    expect(out['t1']?.title).toBe('Title');
    expect(out['t2']?.title).toBe('Second');
  });
});
