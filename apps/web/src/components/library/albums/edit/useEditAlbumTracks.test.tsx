import { albumBuilder, artistBuilder, trackBuilder } from '@repo/testing/builders';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ZodAlbum } from '@repo/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditAlbumTracks } from './useEditAlbumTracks';

describe('useEditAlbumTracks', () => {
  const artist = artistBuilder({ id: 'ar-1', name: 'Unit Test Artist' });
  const baseTrack = {
    ...trackBuilder({ id: 'tr-1', albumId: 'al-1', title: 'Track One' }),
    artists: [artist],
  };
  const album: ZodAlbum = {
    ...albumBuilder({ id: 'al-1' }),
    artists: [artist],
    tracks: [baseTrack],
  } as ZodAlbum;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('isDirty is false when draft matches server track', () => {
    const { result } = renderHook(() => useEditAlbumTracks(album));
    expect(result.current.isDirty('tr-1')).toBe(false);
  });

  it('isDirty is true after title change', async () => {
    const { result } = renderHook(() => useEditAlbumTracks(album));

    await waitFor(() => {
      expect(result.current.draftById['tr-1']).toBeDefined();
    });

    act(() => {
      result.current.updateDraft('tr-1', { title: 'Changed' });
    });

    expect(result.current.isDirty('tr-1')).toBe(true);
  });

  it('prepareTracksSubmit returns existingUpdates when a draft differs', async () => {
    const { result } = renderHook(() => useEditAlbumTracks(album));

    await waitFor(() => {
      expect(result.current.draftById['tr-1']).toBeDefined();
    });

    act(() => {
      result.current.updateDraft('tr-1', { title: 'Changed title' });
    });

    const prep = result.current.prepareTracksSubmit();
    expect(prep.ok).toBe(true);
    if (prep.ok) {
      expect(prep.payload.existingUpdates).toHaveLength(1);
      expect(prep.payload.existingUpdates[0]?.trackId).toBe('tr-1');
      expect(prep.payload.existingUpdates[0]?.data.title).toBe('Changed title');
    }
  });

  it('scheduleTrackDelete puts track id in payload deleteIds', async () => {
    const { result } = renderHook(() => useEditAlbumTracks(album));

    await waitFor(() => {
      expect(result.current.draftById['tr-1']).toBeDefined();
    });

    act(() => {
      result.current.scheduleTrackDelete('tr-1');
    });

    const prep = result.current.prepareTracksSubmit();
    expect(prep.ok).toBe(true);
    if (prep.ok) {
      expect(prep.payload.deleteIds).toContain('tr-1');
      expect(prep.payload.existingUpdates).toHaveLength(0);
    }
  });

  it('removePendingArtist removes id from draft artistIds', async () => {
    const { result } = renderHook(() => useEditAlbumTracks(album));

    await waitFor(() => {
      expect(result.current.draftById['tr-1']).toBeDefined();
    });

    let pendingId = '';
    act(() => {
      pendingId = result.current.registerPendingArtist('Fresh Artist');
      result.current.updateDraft('tr-1', {
        artistIds: [...(result.current.draftById['tr-1']?.artistIds ?? []), pendingId],
      });
    });

    expect(result.current.draftById['tr-1']?.artistIds).toContain(pendingId);

    act(() => {
      result.current.removePendingArtist(pendingId);
    });

    expect(result.current.pendingArtists.some((p) => p.id === pendingId)).toBe(false);
    expect(result.current.draftById['tr-1']?.artistIds).not.toContain(pendingId);
  });
});
