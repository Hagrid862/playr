import type { BulkTrackItem } from '@/lib/types/library';
import type { UpdateLibraryAlbumRequest } from '@repo/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyPendingGenreMapToBulkTracks,
  applyPendingGenreMapToEditPayload,
  buildPendingGenreLocalToServerMap,
  collectPendingGenreIdsForAlbumSubmit,
  collectPendingGenreIdsFromBulkTracks,
} from './resolvePendingGenresForSubmit';
import type { EditAlbumTracksSubmitPayload } from './edit/useEditAlbumTracks';

function track(overrides: Partial<BulkTrackItem> = {}): BulkTrackItem {
  return {
    id: 'track-1',
    file: new File([], 'x.mp3'),
    title: 'T',
    trackNumber: 1,
    diskNumber: 1,
    explicit: false,
    ...overrides,
  };
}

const localA = 'local:pending:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const localB = 'local:pending:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const serverId = 'genre-server-1';

describe('collectPendingGenreIdsFromBulkTracks', () => {
  it('returns empty set when there are no tracks', () => {
    expect(collectPendingGenreIdsFromBulkTracks([])).toEqual(new Set());
  });

  it('ignores tracks without genreIds', () => {
    expect(collectPendingGenreIdsFromBulkTracks([track(), track({ genreIds: [] })])).toEqual(
      new Set(),
    );
  });

  it('ignores only server genre ids', () => {
    const ids = collectPendingGenreIdsFromBulkTracks([
      track({ genreIds: [serverId, 'other-server'] }),
    ]);
    expect(ids.size).toBe(0);
  });

  it('collects local pending ids and dedupes across tracks', () => {
    const ids = collectPendingGenreIdsFromBulkTracks([
      track({ id: 'a', genreIds: [localA, serverId] }),
      track({ id: 'b', genreIds: [localA, localB] }),
    ]);
    expect(ids).toEqual(new Set([localA, localB]));
  });
});

describe('collectPendingGenreIdsForAlbumSubmit', () => {
  const emptyPayload: EditAlbumTracksSubmitPayload = {
    pendingArtistsToCreate: [],
    existingUpdates: [],
    deleteIds: [],
    newTracks: [],
  };

  it('returns empty set when nothing references pending genres', () => {
    expect(collectPendingGenreIdsForAlbumSubmit(undefined, emptyPayload)).toEqual(new Set());
    expect(collectPendingGenreIdsForAlbumSubmit([], emptyPayload)).toEqual(new Set());
  });

  it('collects from album genre ids', () => {
    const s = collectPendingGenreIdsForAlbumSubmit([localA, serverId], emptyPayload);
    expect(s).toEqual(new Set([localA]));
  });

  it('collects from existing track updates and new tracks', () => {
    const payload: EditAlbumTracksSubmitPayload = {
      pendingArtistsToCreate: [],
      existingUpdates: [
        {
          trackId: 't1',
          data: { genreIds: [localA] },
        },
      ],
      deleteIds: [],
      newTracks: [track({ genreIds: [localB] })],
    };
    expect(collectPendingGenreIdsForAlbumSubmit([localB], payload)).toEqual(
      new Set([localB, localA]),
    );
  });
});

describe('buildPendingGenreLocalToServerMap', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates server ids and maps local ids, trimming names', async () => {
    const create = vi.fn().mockImplementation(async ({ name }: { name: string }) => ({
      data: { id: `srv-${name}` },
    }));
    const map = await buildPendingGenreLocalToServerMap(
      new Set([localA]),
      [{ id: localA, name: '  Indie  ' }],
      create,
    );
    expect(create).toHaveBeenCalledWith({ name: 'Indie' });
    expect(map.get(localA)).toBe('srv-Indie');
  });

  it('processes multiple pending ids', async () => {
    let n = 0;
    const create = vi.fn().mockImplementation(async () => ({
      data: { id: `g-${++n}` },
    }));
    const map = await buildPendingGenreLocalToServerMap(
      new Set([localA, localB]),
      [
        { id: localA, name: 'A' },
        { id: localB, name: 'B' },
      ],
      create,
    );
    expect(create).toHaveBeenCalledTimes(2);
    expect(map.get(localA)).toBe('g-1');
    expect(map.get(localB)).toBe('g-2');
  });

  it('throws when pending genre has no usable name', async () => {
    await expect(
      buildPendingGenreLocalToServerMap(new Set([localA]), [{ id: localA, name: '' }], vi.fn()),
    ).rejects.toThrow('Genre name is missing');

    await expect(
      buildPendingGenreLocalToServerMap(new Set([localA]), [{ id: localA, name: '   ' }], vi.fn()),
    ).rejects.toThrow('Genre name is missing');
  });

  it('throws when pending id is not listed in pendingGenres', async () => {
    await expect(buildPendingGenreLocalToServerMap(new Set([localA]), [], vi.fn())).rejects.toThrow(
      'Genre name is missing',
    );
  });

  it('throws when create response has no id', async () => {
    const create = vi.fn().mockResolvedValue({});
    await expect(
      buildPendingGenreLocalToServerMap(new Set([localA]), [{ id: localA, name: 'X' }], create),
    ).rejects.toThrow('Failed to create genre');

    const createNoDataId = vi.fn().mockResolvedValue({ data: {} });
    await expect(
      buildPendingGenreLocalToServerMap(
        new Set([localA]),
        [{ id: localA, name: 'X' }],
        createNoDataId,
      ),
    ).rejects.toThrow('Failed to create genre');
  });
});

describe('applyPendingGenreMapToBulkTracks', () => {
  it('returns empty when tracks array is empty', () => {
    expect(applyPendingGenreMapToBulkTracks([], new Map())).toEqual([]);
  });

  it('maps pending ids and leaves unknown ids unchanged', () => {
    const m = new Map([[localA, 'new-server-a']]);
    const out = applyPendingGenreMapToBulkTracks(
      [track({ genreIds: [localA, serverId] }), track({ id: '2' })],
      m,
    );
    expect(out[0].genreIds).toEqual(['new-server-a', serverId]);
    expect(out[1].genreIds).toBeUndefined();
  });
});

describe('applyPendingGenreMapToEditPayload', () => {
  const baseValues = { name: 'Album' } as UpdateLibraryAlbumRequest;

  it('preserves undefined album genreIds', () => {
    const tracks: EditAlbumTracksSubmitPayload = {
      pendingArtistsToCreate: [],
      existingUpdates: [],
      deleteIds: [],
      newTracks: [],
    };
    const { values } = applyPendingGenreMapToEditPayload(
      { ...baseValues, genreIds: undefined },
      tracks,
      new Map(),
    );
    expect(values.genreIds).toBeUndefined();
  });

  it('maps album, existing updates, and new tracks', () => {
    const m = new Map([
      [localA, 'srv-a'],
      [localB, 'srv-b'],
    ]);
    const tracks: EditAlbumTracksSubmitPayload = {
      pendingArtistsToCreate: [],
      existingUpdates: [
        {
          trackId: 't1',
          data: { genreIds: [localA] },
        },
      ],
      deleteIds: [],
      newTracks: [track({ genreIds: [localB] })],
    };
    const { values, tracks: next } = applyPendingGenreMapToEditPayload(
      { ...baseValues, genreIds: [localA, serverId] },
      tracks,
      m,
    );
    expect(values.genreIds).toEqual(['srv-a', serverId]);
    expect(next.existingUpdates[0].data.genreIds).toEqual(['srv-a']);
    expect(next.newTracks[0].genreIds).toEqual(['srv-b']);
  });
});
