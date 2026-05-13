import type { BulkTrackItem } from '@/lib/types/library';
import type { UpdateLibraryAlbumRequest } from '@repo/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EditAlbumTracksSubmitPayload } from './edit/useEditAlbumTracks';
import {
  applyPendingArtistMapToBulkTracks,
  applyPendingArtistMapToEditPayload,
  buildPendingArtistLocalToServerMap,
  collectPendingArtistIdsForAlbumSubmit,
  collectPendingArtistIdsFromBulkTracks,
  mergePendingArtistDrafts,
} from './resolvePendingArtistsForSubmit';

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
const serverArtistId = 'artist-server-1';

describe('collectPendingArtistIdsFromBulkTracks', () => {
  it('returns empty set when there are no tracks', () => {
    expect(collectPendingArtistIdsFromBulkTracks([])).toEqual(new Set());
  });

  it('ignores tracks without artistIds', () => {
    expect(collectPendingArtistIdsFromBulkTracks([track(), track({ artistIds: [] })])).toEqual(
      new Set(),
    );
  });

  it('ignores only server artist ids', () => {
    const ids = collectPendingArtistIdsFromBulkTracks([
      track({ artistIds: [serverArtistId, 'other-server'] }),
    ]);
    expect(ids.size).toBe(0);
  });

  it('collects local pending ids and dedupes across tracks', () => {
    const ids = collectPendingArtistIdsFromBulkTracks([
      track({ id: 'a', artistIds: [localA, serverArtistId] }),
      track({ id: 'b', artistIds: [localA, localB] }),
    ]);
    expect(ids).toEqual(new Set([localA, localB]));
  });
});

describe('collectPendingArtistIdsForAlbumSubmit', () => {
  const emptyPayload: EditAlbumTracksSubmitPayload = {
    pendingArtistsToCreate: [],
    existingUpdates: [],
    deleteIds: [],
    newTracks: [],
  };

  it('returns empty set when nothing references pending artists', () => {
    expect(collectPendingArtistIdsForAlbumSubmit(undefined, emptyPayload)).toEqual(new Set());
    expect(collectPendingArtistIdsForAlbumSubmit([], emptyPayload)).toEqual(new Set());
  });

  it('collects from album artist ids', () => {
    const s = collectPendingArtistIdsForAlbumSubmit([localA, serverArtistId], emptyPayload);
    expect(s).toEqual(new Set([localA]));
  });

  it('collects from existing track updates, new tracks, and pendingArtistsToCreate', () => {
    const payload: EditAlbumTracksSubmitPayload = {
      pendingArtistsToCreate: [
        { localId: localB, name: 'B' },
        { localId: serverArtistId, name: 'Already server' },
      ],
      existingUpdates: [
        {
          trackId: 't1',
          data: { artistIds: [localA] },
        },
      ],
      deleteIds: ['del-1'],
      newTracks: [track({ artistIds: [localB] })],
    };
    expect(collectPendingArtistIdsForAlbumSubmit([localA], payload)).toEqual(
      new Set([localA, localB]),
    );
  });
});

describe('buildPendingArtistLocalToServerMap', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates server ids and maps local ids, trimming names', async () => {
    const create = vi.fn().mockImplementation(async ({ name }: { name: string }) => ({
      data: { id: `srv-${name}` },
    }));
    const map = await buildPendingArtistLocalToServerMap(
      new Set([localA]),
      [{ id: localA, name: '  Alice  ' }],
      create,
    );
    expect(create).toHaveBeenCalledWith({ name: 'Alice' });
    expect(map.get(localA)).toBe('srv-Alice');
  });

  it('processes multiple pending ids', async () => {
    let n = 0;
    const create = vi.fn().mockImplementation(async () => ({
      data: { id: `a-${++n}` },
    }));
    const map = await buildPendingArtistLocalToServerMap(
      new Set([localA, localB]),
      [
        { id: localA, name: 'A' },
        { id: localB, name: 'B' },
      ],
      create,
    );
    expect(create).toHaveBeenCalledTimes(2);
    expect(map.get(localA)).toBe('a-1');
    expect(map.get(localB)).toBe('a-2');
  });

  it('throws when pending artist has no usable name', async () => {
    await expect(
      buildPendingArtistLocalToServerMap(new Set([localA]), [{ id: localA, name: '' }], vi.fn()),
    ).rejects.toThrow('Artist name is missing');

    await expect(
      buildPendingArtistLocalToServerMap(new Set([localA]), [{ id: localA, name: '   ' }], vi.fn()),
    ).rejects.toThrow('Artist name is missing');
  });

  it('throws when pending id is not listed in pendingArtists', async () => {
    await expect(
      buildPendingArtistLocalToServerMap(new Set([localA]), [], vi.fn()),
    ).rejects.toThrow('Artist name is missing');
  });

  it('throws when create response has no id', async () => {
    const create = vi.fn().mockResolvedValue({});
    await expect(
      buildPendingArtistLocalToServerMap(new Set([localA]), [{ id: localA, name: 'X' }], create),
    ).rejects.toThrow('Failed to create artist');

    const createNoDataId = vi.fn().mockResolvedValue({ data: {} });
    await expect(
      buildPendingArtistLocalToServerMap(
        new Set([localA]),
        [{ id: localA, name: 'X' }],
        createNoDataId,
      ),
    ).rejects.toThrow('Failed to create artist');
  });
});

describe('applyPendingArtistMapToBulkTracks', () => {
  it('returns empty when tracks array is empty', () => {
    expect(applyPendingArtistMapToBulkTracks([], new Map())).toEqual([]);
  });

  it('maps pending ids and leaves unknown ids unchanged', () => {
    const m = new Map([[localA, 'new-server-a']]);
    const out = applyPendingArtistMapToBulkTracks(
      [track({ artistIds: [localA, serverArtistId] }), track({ id: '2' })],
      m,
    );
    expect(out[0].artistIds).toEqual(['new-server-a', serverArtistId]);
    expect(out[1].artistIds).toBeUndefined();
  });
});

describe('applyPendingArtistMapToEditPayload', () => {
  const baseValues = { name: 'Album' } as UpdateLibraryAlbumRequest;

  it('preserves undefined album artistIds', () => {
    const tracks: EditAlbumTracksSubmitPayload = {
      pendingArtistsToCreate: [{ localId: localA, name: 'Draft' }],
      existingUpdates: [],
      deleteIds: ['d1'],
      newTracks: [],
    };
    const { values, tracks: next } = applyPendingArtistMapToEditPayload(
      { ...baseValues, artistIds: undefined },
      tracks,
      new Map(),
    );
    expect(values.artistIds).toBeUndefined();
    expect(next.pendingArtistsToCreate).toEqual([]);
    expect(next.deleteIds).toEqual(['d1']);
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
          data: { artistIds: [localA] },
        },
      ],
      deleteIds: [],
      newTracks: [track({ artistIds: [localB] })],
    };
    const { values, tracks: next } = applyPendingArtistMapToEditPayload(
      { ...baseValues, artistIds: [localA, serverArtistId] },
      tracks,
      m,
    );
    expect(values.artistIds).toEqual(['srv-a', serverArtistId]);
    expect(next.existingUpdates[0].data.artistIds).toEqual(['srv-a']);
    expect(next.newTracks[0].artistIds).toEqual(['srv-b']);
  });
});

describe('mergePendingArtistDrafts', () => {
  it('dedupes by id and prefers the first occurrence (album before tracks)', () => {
    const album = [{ id: '1', name: 'From album' }];
    const trackDrafts = [
      { id: '1', name: 'From track' },
      { id: '2', name: 'Only tracks' },
    ];
    expect(mergePendingArtistDrafts(album, trackDrafts)).toEqual([
      { id: '1', name: 'From album' },
      { id: '2', name: 'Only tracks' },
    ]);
  });

  it('returns track-only drafts when album is empty', () => {
    expect(mergePendingArtistDrafts([], [{ id: 'x', name: 'X' }])).toEqual([
      { id: 'x', name: 'X' },
    ]);
  });
});
