import { extractMetadataFromAudioFile } from '@/lib/audio/audio-metadata';
import { cleanFilenameToTitle } from '@/lib/audio/clean-audio-filename';
import type { ZodAlbum, ZodArtist, ZodTrack } from '@repo/contracts';
import { Visibility } from '@repo/db';
import { albumBuilder, artistBuilder, trackBuilder } from '@repo/testing/builders';
import { customRenderHook } from '@repo/testing/web';
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditAlbumTracks } from './useEditAlbumTracks';

vi.mock('@/lib/audio/audio-metadata', () => ({
  extractMetadataFromAudioFile: vi.fn(),
}));

vi.mock('@/lib/audio/clean-audio-filename', () => ({
  cleanFilenameToTitle: vi.fn((name: string) => name.replace(/\.mp3$/i, '')),
}));

function buildAlbumWithTrack(overrides?: Partial<ZodAlbum>): ZodAlbum {
  const albumId = 'album-z';
  const mainArtist: ZodArtist = {
    ...artistBuilder({ id: 'artist-main', name: 'Main Artist' }),
  } as ZodArtist;

  const serverTrack: ZodTrack = {
    ...trackBuilder({
      id: 'track-1',
      albumId,
      title: 'Original',
      trackNumber: 1,
      diskNumber: 1,
      explicit: false,
    }),
    visibility: Visibility.private,
    artists: [mainArtist],
    updatedAt: new Date('2024-06-01T00:00:00.000Z'),
  } as ZodTrack;

  return {
    ...albumBuilder({
      id: albumId,
      name: 'My Album',
    }),
    artists: [mainArtist],
    tracks: [serverTrack],
    ...overrides,
  } as ZodAlbum;
}

/** Two server tracks: disk 2 first in array — hook should sort by disk then track number. */
function buildAlbumWithTwoTracksOnDifferentDisks(): ZodAlbum {
  const albumId = 'album-z';
  const mainArtist: ZodArtist = {
    ...artistBuilder({ id: 'artist-main', name: 'Main Artist' }),
  } as ZodArtist;

  const trackDisk1: ZodTrack = {
    ...trackBuilder({
      id: 'track-a',
      albumId,
      title: 'Disk One',
      trackNumber: 1,
      diskNumber: 1,
    }),
    visibility: Visibility.private,
    artists: [mainArtist],
    updatedAt: new Date('2024-06-01T00:00:00.000Z'),
  } as ZodTrack;

  const trackDisk2: ZodTrack = {
    ...trackBuilder({
      id: 'track-b',
      albumId,
      title: 'Disk Two',
      trackNumber: 1,
      diskNumber: 2,
    }),
    visibility: Visibility.private,
    artists: [mainArtist],
    updatedAt: new Date('2024-06-02T00:00:00.000Z'),
  } as ZodTrack;

  return {
    ...albumBuilder({
      id: albumId,
      name: 'My Album',
    }),
    artists: [mainArtist],
    tracks: [trackDisk2, trackDisk1],
  } as ZodAlbum;
}

type HookProps = { album: ZodAlbum };

/** Server track with no `artists` — exercises `track.artists?.map ?? []` in draft helpers. */
function buildAlbumWithTrackNoArtists(): ZodAlbum {
  const albumId = 'album-z';
  const serverTrack = {
    ...trackBuilder({
      id: 'track-1',
      albumId,
      title: 'No Artists',
      trackNumber: 1,
      diskNumber: 1,
      explicit: false,
    }),
    visibility: Visibility.private,
    artists: [],
    updatedAt: new Date('2024-06-01T00:00:00.000Z'),
  } as ZodTrack;

  return {
    ...albumBuilder({
      id: albumId,
      name: 'My Album',
    }),
    artists: [],
    tracks: [serverTrack],
  } as ZodAlbum;
}

function buildAlbumWithTwoArtistsOnTrack(): ZodAlbum {
  const albumId = 'album-z';
  const mainArtist = artistBuilder({ id: 'artist-main', name: 'Main' }) as ZodArtist;
  const guestArtist = artistBuilder({ id: 'artist-guest', name: 'Guest' }) as ZodArtist;
  const serverTrack = {
    ...trackBuilder({
      id: 'track-1',
      albumId,
      title: 'Original',
      trackNumber: 1,
      diskNumber: 1,
      explicit: false,
    }),
    visibility: Visibility.private,
    artists: [mainArtist, guestArtist],
    updatedAt: new Date('2024-06-01T00:00:00.000Z'),
  } as ZodTrack;

  return {
    ...albumBuilder({
      id: albumId,
      name: 'My Album',
    }),
    artists: [mainArtist, guestArtist],
    tracks: [serverTrack],
  } as ZodAlbum;
}

describe('useEditAlbumTracks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(extractMetadataFromAudioFile).mockResolvedValue(null);
  });

  it('addAudioFiles returns early when files is null or empty', () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    act(() => {
      result.current.addAudioFiles(null);
    });
    expect(result.current.stagedTracks).toHaveLength(0);

    const emptyList = new DataTransfer().files;
    act(() => {
      result.current.addAudioFiles(emptyList);
    });
    expect(result.current.stagedTracks).toHaveLength(0);
  });

  it('addAudioFiles ignores non-audio files', async () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    const list = new DataTransfer();
    list.items.add(new File(['x'], 'pic.png', { type: 'image/png' }));

    await act(async () => {
      result.current.addAudioFiles(list.files);
    });

    expect(result.current.stagedTracks).toHaveLength(0);
  });

  it('prepareTracksSubmit succeeds with no edits', () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    const prep = result.current.prepareTracksSubmit();
    expect(prep.ok).toBe(true);
    if (prep.ok) {
      expect(prep.payload.existingUpdates).toHaveLength(0);
      expect(prep.payload.newTracks).toHaveLength(0);
    }
  });

  it('prepareTracksSubmit fails when a staged track is missing a title', async () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    const audio = new File(['x'], 'a.mp3', { type: 'audio/mp3' });
    const list = new DataTransfer();
    list.items.add(audio);

    await act(async () => {
      result.current.addAudioFiles(list.files);
    });

    await waitFor(() => {
      expect(result.current.stagedTracks.length).toBe(1);
    });

    const stagedId = result.current.stagedTracks[0]?.id;
    expect(stagedId).toBeDefined();

    act(() => {
      result.current.updateStagedTrack(stagedId!, { title: '   ' });
    });

    const prep = result.current.prepareTracksSubmit();
    expect(prep.ok).toBe(false);
    if (!prep.ok) {
      expect(prep.error).toMatch(/title/i);
    }
  });

  it('prepareTracksSubmit fails when a staged track has invalid track number', async () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    const audio = new File(['x'], 'a.mp3', { type: 'audio/mp3' });
    const list = new DataTransfer();
    list.items.add(audio);

    await act(async () => {
      result.current.addAudioFiles(list.files);
    });

    await waitFor(() => {
      expect(result.current.stagedTracks.length).toBe(1);
    });

    const stagedId = result.current.stagedTracks[0]?.id;
    act(() => {
      result.current.updateStagedTrack(stagedId!, { trackNumber: 0 });
    });

    const prep = result.current.prepareTracksSubmit();
    expect(prep.ok).toBe(false);
  });

  it('prepareTracksSubmit fails when a staged track has invalid disk number', async () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    const audio = new File(['x'], 'a.mp3', { type: 'audio/mp3' });
    const list = new DataTransfer();
    list.items.add(audio);

    await act(async () => {
      result.current.addAudioFiles(list.files);
    });

    await waitFor(() => {
      expect(result.current.stagedTracks.length).toBe(1);
    });

    const stagedId = result.current.stagedTracks[0]?.id;
    act(() => {
      result.current.updateStagedTrack(stagedId!, { diskNumber: 0 });
    });

    const prep = result.current.prepareTracksSubmit();
    expect(prep.ok).toBe(false);
  });

  it('prepareTracksSubmit fails when a staged track has no artists', async () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    const audio = new File(['x'], 'a.mp3', { type: 'audio/mp3' });
    const list = new DataTransfer();
    list.items.add(audio);

    await act(async () => {
      result.current.addAudioFiles(list.files);
    });

    await waitFor(() => {
      expect(result.current.stagedTracks.length).toBe(1);
    });

    const stagedId = result.current.stagedTracks[0]?.id;
    act(() => {
      result.current.updateStagedTrack(stagedId!, { artistIds: [] });
    });

    const prep = result.current.prepareTracksSubmit();
    expect(prep.ok).toBe(false);
  });

  it('cancels in-flight metadata scan on unmount', async () => {
    vi.mocked(extractMetadataFromAudioFile).mockImplementation(() => new Promise(() => {}));

    const album = buildAlbumWithTrack();
    const { result, unmount } = customRenderHook(() => useEditAlbumTracks(album));

    const list = new DataTransfer();
    list.items.add(new File(['x'], 'slow.mp3', { type: 'audio/mp3' }));

    await act(async () => {
      result.current.addAudioFiles(list.files);
    });

    unmount();

    vi.mocked(extractMetadataFromAudioFile).mockResolvedValue(null);
  });

  it('addAudioFiles seeds staged tracks with empty artist ids when the album has no artists', async () => {
    const album = buildAlbumWithTrack({ artists: [], tracks: [] });
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    const list = new DataTransfer();
    list.items.add(new File(['x'], 'only.mp3', { type: 'audio/mp3' }));

    await act(async () => {
      result.current.addAudioFiles(list.files);
    });

    await waitFor(() => {
      expect(result.current.stagedTracks.length).toBe(1);
    });

    expect(result.current.stagedTracks[0]?.artistIds).toEqual([]);
  });

  it('passes empty album label to title helper when album name is missing', async () => {
    const album = buildAlbumWithTrack({ name: undefined as unknown as string });
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    const list = new DataTransfer();
    list.items.add(new File(['x'], 'named.mp3', { type: 'audio/mp3' }));

    await act(async () => {
      result.current.addAudioFiles(list.files);
    });

    await waitFor(() => {
      expect(result.current.stagedTracks.length).toBe(1);
    });

    expect(vi.mocked(cleanFilenameToTitle)).toHaveBeenCalledWith(
      'named.mp3',
      expect.objectContaining({ artists: [], album: '' }),
    );
  });

  it('prepareTracksSubmit fails when an existing draft has no artists', () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    act(() => {
      result.current.updateDraft('track-1', { artistIds: [] });
    });

    const prep = result.current.prepareTracksSubmit();
    expect(prep.ok).toBe(false);
    if (!prep.ok) {
      expect(prep.error).toMatch(/artist/i);
    }
  });

  it('prepareTracksSubmit fails when existing draft title is blank', () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    act(() => {
      result.current.updateDraft('track-1', { title: '   ' });
    });

    const prep = result.current.prepareTracksSubmit();
    expect(prep.ok).toBe(false);
  });

  it('includes existingUpdates when a draft differs from the server', () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    act(() => {
      result.current.updateDraft('track-1', { title: 'Renamed' });
    });

    const prep = result.current.prepareTracksSubmit();
    expect(prep.ok).toBe(true);
    if (prep.ok) {
      expect(prep.payload.existingUpdates).toHaveLength(1);
      expect(prep.payload.existingUpdates[0]?.data.title).toBe('Renamed');
    }
  });

  it('schedules and undoes track deletion', () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    act(() => {
      result.current.scheduleTrackDelete('track-1');
    });

    expect(result.current.sortedExistingActive).toHaveLength(0);
    expect(result.current.tracksMarkedForDeletion).toHaveLength(1);

    act(() => {
      result.current.undoTrackDelete('track-1');
    });

    expect(result.current.sortedExistingActive).toHaveLength(1);
  });

  it('isDirty is false when the draft matches the server and true after edits', () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    expect(result.current.isDirty('track-1')).toBe(false);

    act(() => {
      result.current.updateDraft('track-1', { title: 'Renamed for dirty check' });
    });

    expect(result.current.isDirty('track-1')).toBe(true);
  });

  it('puts scheduled deletes into the submit payload', () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    act(() => {
      result.current.scheduleTrackDelete('track-1');
    });

    const prep = result.current.prepareTracksSubmit();
    expect(prep.ok).toBe(true);
    if (prep.ok) {
      expect(prep.payload.deleteIds).toContain('track-1');
      expect(prep.payload.existingUpdates).toHaveLength(0);
    }
  });

  it('removePendingArtist strips the local id from drafts and staged tracks', () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    let localId = '';
    act(() => {
      localId = result.current.registerPendingArtist('New One');
      result.current.updateDraft('track-1', {
        artistIds: [...(result.current.draftById['track-1']?.artistIds ?? []), localId],
      });
    });

    expect(result.current.draftById['track-1']?.artistIds).toContain(localId);

    act(() => {
      result.current.removePendingArtist(localId);
    });

    expect(result.current.pendingArtists.some((p) => p.id === localId)).toBe(false);
    expect(result.current.draftById['track-1']?.artistIds).not.toContain(localId);
  });

  it('reports hasTrackDraftChanges when drafts diverge', () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    expect(result.current.hasTrackDraftChanges).toBe(false);

    act(() => {
      result.current.updateDraft('track-1', { title: 'Edited' });
    });

    expect(result.current.hasTrackDraftChanges).toBe(true);
  });

  it('hasTrackDraftChanges stays false when multiple server tracks match drafts', () => {
    const album = buildAlbumWithTwoTracksOnDifferentDisks();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    expect(result.current.hasTrackDraftChanges).toBe(false);
  });

  it('clears staged tracks', async () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    const audio = new File(['x'], 'z.mp3', { type: 'audio/mp3' });
    const list = new DataTransfer();
    list.items.add(audio);

    await act(async () => {
      result.current.addAudioFiles(list.files);
    });

    await waitFor(() => {
      expect(result.current.stagedTracks.length).toBe(1);
    });

    act(() => {
      result.current.clearStagedTracks();
    });

    expect(result.current.stagedTracks).toHaveLength(0);
  });

  it('resets drafts when album server tracks sync key changes', () => {
    const albumV1 = buildAlbumWithTrack();
    const { result, rerender } = customRenderHook(
      ({ album }: HookProps) => useEditAlbumTracks(album),
      {
        initialProps: { album: albumV1 },
      },
    );

    act(() => {
      result.current.updateDraft('track-1', { title: 'Local edit' });
    });
    expect(result.current.draftById['track-1']?.title).toBe('Local edit');

    const albumV2 = buildAlbumWithTrack({
      tracks: [
        {
          ...(albumV1.tracks?.[0] as ZodTrack),
          title: 'Server title',
          updatedAt: new Date('2025-01-15T12:00:00.000Z'),
        },
      ],
    });

    rerender({ album: albumV2 });

    expect(result.current.draftById['track-1']?.title).toBe('Server title');
  });

  it('prunes pending delete ids when server tracks no longer include that id', () => {
    const albumV1 = buildAlbumWithTrack();
    const { result, rerender } = customRenderHook(
      ({ album }: HookProps) => useEditAlbumTracks(album),
      {
        initialProps: { album: albumV1 },
      },
    );

    act(() => {
      result.current.scheduleTrackDelete('track-1');
    });
    expect(result.current.pendingDeleteIds.has('track-1')).toBe(true);

    const mainArtist = (albumV1.artists ?? [])[0] as ZodArtist;
    const replacementTrack: ZodTrack = {
      ...trackBuilder({
        id: 'track-2',
        albumId: albumV1.id,
        title: 'Replacement',
        trackNumber: 1,
        diskNumber: 1,
      }),
      visibility: Visibility.private,
      artists: [mainArtist],
      updatedAt: new Date('2025-03-01T00:00:00.000Z'),
    } as ZodTrack;

    rerender({
      album: buildAlbumWithTrack({
        tracks: [replacementTrack],
      }),
    });

    expect(result.current.pendingDeleteIds.has('track-1')).toBe(false);
  });

  it('sorts new audio files by numeric filename before assigning track numbers', async () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    const list = new DataTransfer();
    list.items.add(new File(['x'], '10.mp3', { type: 'audio/mp3' }));
    list.items.add(new File(['y'], '2.mp3', { type: 'audio/mp3' }));

    await act(async () => {
      result.current.addAudioFiles(list.files);
    });

    await waitFor(() => {
      expect(result.current.stagedTracks.length).toBe(2);
    });

    expect(result.current.stagedTracks.map((t) => t.file.name)).toEqual(['2.mp3', '10.mp3']);
  });

  it('removeStagedTrack drops one file and leaves one staged row (positions re-derived after metadata scan)', async () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    const list = new DataTransfer();
    list.items.add(new File(['x'], 'a.mp3', { type: 'audio/mp3' }));
    list.items.add(new File(['y'], 'b.mp3', { type: 'audio/mp3' }));

    await act(async () => {
      result.current.addAudioFiles(list.files);
    });

    await waitFor(() => {
      expect(result.current.stagedTracks.length).toBe(2);
      expect(result.current.isScanningMetadata).toBe(false);
    });

    const ordered = [...result.current.stagedTracks].sort((x, y) =>
      x.file.name.localeCompare(y.file.name, undefined, { numeric: true }),
    );
    const removeId = ordered[0]!.id;

    await act(async () => {
      result.current.removeStagedTrack(removeId);
    });

    await waitFor(() => {
      expect(result.current.stagedTracks).toHaveLength(1);
      expect(result.current.isScanningMetadata).toBe(false);
    });

    // After removal, async metadata scan runs again and assigns trackNumber as meta?.trackNo ?? i + 1 (single row → 1).
    expect(result.current.stagedTracks[0]?.trackNumber).toBe(1);
  });

  it('removePendingArtist strips pending id from staged artistIds list', async () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    const list = new DataTransfer();
    list.items.add(new File(['x'], 'solo.mp3', { type: 'audio/mp3' }));

    await act(async () => {
      result.current.addAudioFiles(list.files);
    });

    await waitFor(() => {
      expect(result.current.stagedTracks.length).toBe(1);
    });

    const stagedId = result.current.stagedTracks[0]!.id;
    let localId = '';

    act(() => {
      localId = result.current.registerPendingArtist('Pending');
      result.current.updateStagedTrack(stagedId, { artistIds: [localId] });
    });

    act(() => {
      result.current.removePendingArtist(localId);
    });

    expect(result.current.stagedTracks[0]?.artistIds).toEqual([]);
    expect(result.current.pendingArtists.some((p) => p.id === localId)).toBe(false);
  });

  it('removePendingArtist treats nullish staged artistIds as empty when filtering', async () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    const list = new DataTransfer();
    list.items.add(new File(['x'], 'solo.mp3', { type: 'audio/mp3' }));

    await act(async () => {
      result.current.addAudioFiles(list.files);
    });

    await waitFor(() => {
      expect(result.current.stagedTracks.length).toBe(1);
    });

    const stagedId = result.current.stagedTracks[0]!.id;
    let localId = '';

    act(() => {
      localId = result.current.registerPendingArtist('Pending');
      result.current.updateStagedTrack(stagedId, {
        artistIds: null as unknown as string[] | undefined,
      });
    });

    act(() => {
      result.current.removePendingArtist(localId);
    });

    expect(result.current.stagedTracks).toHaveLength(1);
    expect(result.current.pendingArtists.some((p) => p.id === localId)).toBe(false);
  });

  it('sorts existing tracks by disk number then track number', () => {
    const album = buildAlbumWithTwoTracksOnDifferentDisks();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    expect(result.current.sortedExisting.map((t) => t.id)).toEqual(['track-a', 'track-b']);
    expect(result.current.sortedExisting[0]?.diskNumber).toBe(1);
    expect(result.current.sortedExisting[1]?.diskNumber).toBe(2);
  });

  it('sorts existing tracks on the same disk by track number', () => {
    const albumId = 'album-z';
    const mainArtist: ZodArtist = {
      ...artistBuilder({ id: 'artist-main', name: 'Main Artist' }),
    } as ZodArtist;

    const secondFirst: ZodTrack = {
      ...trackBuilder({
        id: 'track-later',
        albumId,
        title: 'Second',
        trackNumber: 2,
        diskNumber: 1,
      }),
      visibility: Visibility.private,
      artists: [mainArtist],
      updatedAt: new Date('2024-06-02T00:00:00.000Z'),
    } as ZodTrack;

    const firstTrack: ZodTrack = {
      ...trackBuilder({
        id: 'track-first',
        albumId,
        title: 'First',
        trackNumber: 1,
        diskNumber: 1,
      }),
      visibility: Visibility.private,
      artists: [mainArtist],
      updatedAt: new Date('2024-06-01T00:00:00.000Z'),
    } as ZodTrack;

    const album: ZodAlbum = {
      ...albumBuilder({ id: albumId, name: 'My Album' }),
      artists: [mainArtist],
      tracks: [secondFirst, firstTrack],
    } as ZodAlbum;

    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    expect(result.current.sortedExisting.map((t) => t.trackNumber)).toEqual([1, 2]);
  });

  it('includes pendingArtistsToCreate in prepareTracksSubmit payload', () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    let localId = '';
    act(() => {
      localId = result.current.registerPendingArtist('  Draft Name  ');
    });

    const prep = result.current.prepareTracksSubmit();
    expect(prep.ok).toBe(true);
    if (prep.ok) {
      expect(prep.payload.pendingArtistsToCreate).toEqual([{ localId, name: 'Draft Name' }]);
    }
  });

  it('initializes drafts when server track has no artists array entries', () => {
    const album = buildAlbumWithTrackNoArtists();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    expect(result.current.draftById['track-1']?.artistIds).toEqual([]);
    expect(result.current.prepareTracksSubmit().ok).toBe(false);
    act(() => {
      result.current.updateDraft('track-1', { artistIds: ['artist-main'] });
    });
    expect(result.current.prepareTracksSubmit().ok).toBe(true);
  });

  it('isDirty tracks diskNumber, trackNumber, and explicit separately', () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    expect(result.current.isDirty('track-1')).toBe(false);

    act(() => {
      result.current.updateDraft('track-1', { diskNumber: 2 });
    });
    expect(result.current.isDirty('track-1')).toBe(true);

    act(() => {
      result.current.updateDraft('track-1', {
        diskNumber: 1,
        trackNumber: 2,
      });
    });
    expect(result.current.isDirty('track-1')).toBe(true);

    act(() => {
      result.current.updateDraft('track-1', {
        trackNumber: 1,
        explicit: true,
      });
    });
    expect(result.current.isDirty('track-1')).toBe(true);
  });

  it('isDirty is false when artist ids match server order semantically (sorted)', () => {
    const album = buildAlbumWithTwoArtistsOnTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    act(() => {
      result.current.updateDraft('track-1', {
        artistIds: ['artist-guest', 'artist-main'],
      });
    });

    expect(result.current.isDirty('track-1')).toBe(false);
  });

  it('isDirty when draft loses an artist compared to server', () => {
    const album = buildAlbumWithTwoArtistsOnTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    act(() => {
      result.current.updateDraft('track-1', { artistIds: ['artist-main'] });
    });

    expect(result.current.isDirty('track-1')).toBe(true);
  });

  it('builds draft when server track has undefined artists', () => {
    const albumId = 'album-z';
    const mainArtist = artistBuilder({ id: 'artist-main', name: 'Main' }) as ZodArtist;
    const serverTrack = {
      ...trackBuilder({
        id: 'track-1',
        albumId,
        title: 'NoArtistsKey',
        trackNumber: 1,
        diskNumber: 1,
        explicit: false,
      }),
      visibility: Visibility.private,
      artists: undefined,
      updatedAt: new Date('2024-06-01T00:00:00.000Z'),
    } as ZodTrack;

    const album = {
      ...albumBuilder({ id: albumId, name: 'My Album' }),
      artists: [mainArtist],
      tracks: [serverTrack],
    } as ZodAlbum;

    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    expect(result.current.draftById['track-1']?.artistIds).toEqual([]);
  });

  it('isDirty is false for unknown track ids', () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    expect(result.current.isDirty('no-such-track')).toBe(false);
  });

  it('updateDraft and updateStagedTrack no-op for unknown ids', async () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    const beforeDraft = result.current.draftById['track-1'];

    act(() => {
      result.current.updateDraft('missing-track', { title: 'X' });
    });
    expect(result.current.draftById['track-1']).toEqual(beforeDraft);

    const list = new DataTransfer();
    list.items.add(new File(['x'], 'a.mp3', { type: 'audio/mp3' }));
    await act(async () => {
      result.current.addAudioFiles(list.files);
    });
    await waitFor(() => expect(result.current.stagedTracks.length).toBe(1));
    const stagedSnapshot = result.current.stagedTracks;

    act(() => {
      result.current.updateStagedTrack('missing-staged', { title: 'Y' });
    });
    expect(result.current.stagedTracks).toEqual(stagedSnapshot);
  });

  it('merges second addAudioFiles batch with existing staged tracks (non-empty prev)', async () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    const first = new DataTransfer();
    first.items.add(new File(['x'], 'first.mp3', { type: 'audio/mp3' }));
    await act(async () => {
      result.current.addAudioFiles(first.files);
    });
    await waitFor(() => expect(result.current.stagedTracks.length).toBe(1));

    const second = new DataTransfer();
    second.items.add(new File(['y'], 'second.mp3', { type: 'audio/mp3' }));
    await act(async () => {
      result.current.addAudioFiles(second.files);
    });
    await waitFor(() => expect(result.current.stagedTracks.length).toBe(2));
    expect(result.current.stagedTracks.map((t) => t.file.name)).toEqual([
      'first.mp3',
      'second.mp3',
    ]);
  });

  it('skips metadata rescan when album name changes but staged ids stay the same', async () => {
    const album = buildAlbumWithTrack();
    const { result, rerender } = customRenderHook(
      ({ album: a }: HookProps) => useEditAlbumTracks(a),
      {
        initialProps: { album },
      },
    );

    const list = new DataTransfer();
    list.items.add(new File(['x'], 'one.mp3', { type: 'audio/mp3' }));
    await act(async () => {
      result.current.addAudioFiles(list.files);
    });

    await waitFor(() => {
      expect(result.current.stagedTracks.length).toBe(1);
      expect(result.current.isScanningMetadata).toBe(false);
    });

    const trackIdsKey = result.current.stagedTracks.map((t) => t.id).join(',');
    const extractCallsAfterFirstScan = vi.mocked(extractMetadataFromAudioFile).mock.calls.length;

    rerender({ album: { ...album, name: 'Renamed album title' } });

    await waitFor(() => expect(result.current.isScanningMetadata).toBe(false));

    expect(result.current.stagedTracks.map((t) => t.id).join(',')).toBe(trackIdsKey);
    expect(vi.mocked(extractMetadataFromAudioFile).mock.calls.length).toBe(
      extractCallsAfterFirstScan,
    );
  });

  it('applies extracted metadata fields when scanner returns rich meta', async () => {
    vi.mocked(extractMetadataFromAudioFile).mockImplementation(async (file: File) => {
      if (file.name === 'a.mp3') {
        return {
          title: 'Meta Title',
          artist: 'Meta Artist',
          album: 'Meta Album',
          trackNo: 9,
          diskNo: 3,
        };
      }
      return {
        title: undefined,
        artist: undefined,
        album: undefined,
        trackNo: undefined,
        diskNo: undefined,
      };
    });

    const album = buildAlbumWithTrack({ name: 'Hook Album' });
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    const list = new DataTransfer();
    list.items.add(new File(['x'], 'a.mp3', { type: 'audio/mp3' }));
    list.items.add(new File(['y'], 'b.mp3', { type: 'audio/mp3' }));

    await act(async () => {
      result.current.addAudioFiles(list.files);
    });

    await waitFor(() => {
      expect(result.current.stagedTracks.length).toBe(2);
      expect(result.current.isScanningMetadata).toBe(false);
    });

    const withMeta = result.current.stagedTracks.find((t) => t.file.name === 'a.mp3');
    expect(withMeta?.title).toBe('Meta Title');
    expect(withMeta?.trackNumber).toBe(9);
    expect(withMeta?.diskNumber).toBe(3);

    expect(vi.mocked(cleanFilenameToTitle)).toHaveBeenCalledWith(
      'b.mp3',
      expect.objectContaining({
        artists: [],
        album: 'Hook Album',
      }),
    );
  });

  it('prepareTracksSubmit fails for staged track with undefined artistIds', async () => {
    const album = buildAlbumWithTrack();
    const { result } = customRenderHook(() => useEditAlbumTracks(album));

    const list = new DataTransfer();
    list.items.add(new File(['x'], 'a.mp3', { type: 'audio/mp3' }));
    await act(async () => {
      result.current.addAudioFiles(list.files);
    });
    await waitFor(() => expect(result.current.stagedTracks.length).toBe(1));

    const id = result.current.stagedTracks[0]!.id;
    act(() => {
      result.current.updateStagedTrack(id, { artistIds: undefined });
    });

    const prep = result.current.prepareTracksSubmit();
    expect(prep.ok).toBe(false);
  });

  it('prunes multiple stale pending delete ids when server track list changes', () => {
    const albumTwo = buildAlbumWithTwoTracksOnDifferentDisks();
    const { result, rerender } = customRenderHook(
      ({ album: a }: HookProps) => useEditAlbumTracks(a),
      {
        initialProps: { album: albumTwo },
      },
    );

    act(() => {
      result.current.scheduleTrackDelete('track-a');
      result.current.scheduleTrackDelete('track-b');
    });
    expect(result.current.pendingDeleteIds.size).toBe(2);

    const mainArtist = (albumTwo.artists ?? [])[0] as ZodArtist;
    const replacementTrack: ZodTrack = {
      ...trackBuilder({
        id: 'track-next',
        albumId: albumTwo.id,
        title: 'Only',
        trackNumber: 1,
        diskNumber: 1,
      }),
      visibility: Visibility.private,
      artists: [mainArtist],
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } as ZodTrack;

    rerender({
      album: {
        ...albumTwo,
        tracks: [replacementTrack],
      },
    });

    expect(result.current.pendingDeleteIds.size).toBe(0);
  });

  it('breaks metadata scan loop early when cancelled mid-queue', async () => {
    let resolveSecond!: () => void;
    const secondPromise = new Promise<void>((r) => {
      resolveSecond = r;
    });

    vi.mocked(extractMetadataFromAudioFile).mockImplementation(async (file: File) => {
      if (file.name === 'one.mp3') {
        return {};
      }
      await secondPromise;
      return {};
    });

    const album = buildAlbumWithTrack();
    const { result, unmount } = customRenderHook(() => useEditAlbumTracks(album));

    const list = new DataTransfer();
    list.items.add(new File(['x'], 'one.mp3', { type: 'audio/mp3' }));
    list.items.add(new File(['y'], 'two.mp3', { type: 'audio/mp3' }));

    await act(async () => {
      result.current.addAudioFiles(list.files);
    });

    await waitFor(() => {
      expect(vi.mocked(extractMetadataFromAudioFile).mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    unmount();
    resolveSecond();

    vi.mocked(extractMetadataFromAudioFile).mockResolvedValue(null);
  });

  describe('updateAllTracksGenres', () => {
    it('updates drafts when genre id lists match old ids (order-insensitive)', () => {
      const album = buildAlbumWithTrack();
      const { result } = customRenderHook(() => useEditAlbumTracks(album));

      act(() => {
        result.current.updateDraft('track-1', { genreIds: ['b', 'a'] });
      });

      act(() => {
        result.current.updateAllTracksGenres(['a', 'b'], ['x']);
      });

      expect(result.current.draftById['track-1']?.genreIds).toEqual(['x']);
    });

    it('updates staged tracks seeded from album genres when old ids match', async () => {
      const album = buildAlbumWithTrack({
        genres: [
          {
            id: 'rel',
            albumId: 'album-z',
            genreId: 'seed-genre',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });
      const { result } = customRenderHook(() => useEditAlbumTracks(album));

      const list = new DataTransfer();
      list.items.add(new File(['x'], 'z.mp3', { type: 'audio/mp3' }));

      await act(async () => {
        result.current.addAudioFiles(list.files);
      });

      await waitFor(() => expect(result.current.stagedTracks.length).toBe(1));

      act(() => {
        result.current.updateAllTracksGenres(['seed-genre'], ['next-genre']);
      });

      expect(result.current.stagedTracks[0]?.genreIds).toEqual(['next-genre']);
    });

    it('does not mutate drafts when old genre id set matches no draft', () => {
      const album = buildAlbumWithTrack();
      const { result } = customRenderHook(() => useEditAlbumTracks(album));

      act(() => {
        result.current.updateDraft('track-1', { genreIds: ['only-one'] });
      });

      const snapshot = result.current.draftById['track-1'];

      act(() => {
        result.current.updateAllTracksGenres(['unrelated'], ['z']);
      });

      expect(result.current.draftById['track-1']).toEqual(snapshot);
    });

    it('does not change staged rows when their genres do not match old ids', async () => {
      const album = buildAlbumWithTrack();
      const { result } = customRenderHook(() => useEditAlbumTracks(album));

      const list = new DataTransfer();
      list.items.add(new File(['x'], 'solo.mp3', { type: 'audio/mp3' }));

      await act(async () => {
        result.current.addAudioFiles(list.files);
      });

      await waitFor(() => expect(result.current.stagedTracks.length).toBe(1));

      act(() => {
        result.current.updateStagedTrack(result.current.stagedTracks[0]!.id, {
          genreIds: ['custom'],
        });
      });

      const stagedBefore = result.current.stagedTracks[0];

      act(() => {
        result.current.updateAllTracksGenres(['other'], ['z']);
      });

      expect(result.current.stagedTracks[0]).toEqual(stagedBefore);
    });

    it('updates staged rows with undefined genreIds when they match an empty old id set', async () => {
      const album = buildAlbumWithTrack();
      const { result } = customRenderHook(() => useEditAlbumTracks(album));

      const list = new DataTransfer();
      list.items.add(new File(['x'], 'solo.mp3', { type: 'audio/mp3' }));

      await act(async () => {
        result.current.addAudioFiles(list.files);
      });

      await waitFor(() => expect(result.current.stagedTracks.length).toBe(1));

      const id = result.current.stagedTracks[0]!.id;

      act(() => {
        result.current.updateStagedTrack(id, { genreIds: undefined });
      });

      act(() => {
        result.current.updateAllTracksGenres([], ['seeded']);
      });

      expect(result.current.stagedTracks[0]?.genreIds).toEqual(['seeded']);
    });
  });

  describe('updateAllTracksArtists', () => {
    it('updates drafts when artist id lists match old ids (order-insensitive)', () => {
      const album = buildAlbumWithTrack();
      const { result } = customRenderHook(() => useEditAlbumTracks(album));

      act(() => {
        result.current.updateDraft('track-1', { artistIds: ['b', 'a'] });
      });

      act(() => {
        result.current.updateAllTracksArtists(['a', 'b'], ['x']);
      });

      expect(result.current.draftById['track-1']?.artistIds).toEqual(['x']);
    });

    it('updates staged tracks seeded from album artists when old ids match', async () => {
      const album = buildAlbumWithTrack();
      const { result } = customRenderHook(() => useEditAlbumTracks(album));

      const list = new DataTransfer();
      list.items.add(new File(['x'], 'z.mp3', { type: 'audio/mp3' }));

      await act(async () => {
        result.current.addAudioFiles(list.files);
      });

      await waitFor(() => expect(result.current.stagedTracks.length).toBe(1));

      act(() => {
        result.current.updateAllTracksArtists(['artist-main'], ['next-artist']);
      });

      expect(result.current.stagedTracks[0]?.artistIds).toEqual(['next-artist']);
    });

    it('does not mutate drafts when old artist id set matches no draft', () => {
      const album = buildAlbumWithTrack();
      const { result } = customRenderHook(() => useEditAlbumTracks(album));

      act(() => {
        result.current.updateDraft('track-1', { artistIds: ['only-one'] });
      });

      const snapshot = result.current.draftById['track-1'];

      act(() => {
        result.current.updateAllTracksArtists(['unrelated'], ['z']);
      });

      expect(result.current.draftById['track-1']).toEqual(snapshot);
    });

    it('does not change staged rows when their artists do not match old ids', async () => {
      const album = buildAlbumWithTrack();
      const { result } = customRenderHook(() => useEditAlbumTracks(album));

      const list = new DataTransfer();
      list.items.add(new File(['x'], 'solo.mp3', { type: 'audio/mp3' }));

      await act(async () => {
        result.current.addAudioFiles(list.files);
      });

      await waitFor(() => expect(result.current.stagedTracks.length).toBe(1));

      act(() => {
        result.current.updateStagedTrack(result.current.stagedTracks[0]!.id, {
          artistIds: ['custom-artist'],
        });
      });

      const stagedBefore = result.current.stagedTracks[0];

      act(() => {
        result.current.updateAllTracksArtists(['other'], ['z']);
      });

      expect(result.current.stagedTracks[0]).toEqual(stagedBefore);
    });

    it('updates staged rows with undefined artistIds when they match an empty old id set', async () => {
      const album = buildAlbumWithTrack();
      const { result } = customRenderHook(() => useEditAlbumTracks(album));

      const list = new DataTransfer();
      list.items.add(new File(['x'], 'solo.mp3', { type: 'audio/mp3' }));

      await act(async () => {
        result.current.addAudioFiles(list.files);
      });

      await waitFor(() => expect(result.current.stagedTracks.length).toBe(1));

      const id = result.current.stagedTracks[0]!.id;

      act(() => {
        result.current.updateStagedTrack(id, { artistIds: undefined });
      });

      act(() => {
        result.current.updateAllTracksArtists([], ['seeded-artist']);
      });

      expect(result.current.stagedTracks[0]?.artistIds).toEqual(['seeded-artist']);
    });
  });
});
