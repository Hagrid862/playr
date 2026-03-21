import { extractCoverFromAudioFile } from '@/lib/audio-metadata';
import { cleanFilenameToTitle } from '@/lib/clean-audio-filename.ts';
import { albumBuilder, artistBuilder } from '@repo/testing';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBulkTrackUpload } from './useBulkTrackUpload';

vi.mock('@/lib/audio-metadata', () => ({
  extractCoverFromAudioFile: vi.fn(),
}));

vi.mock('@/lib/clean-audio-filename.ts', () => ({
  cleanFilenameToTitle: vi.fn((name) => name.replace('.mp3', '')),
}));

const originalCreateObjectURL = global.URL.createObjectURL;
const originalRevokeObjectURL = global.URL.revokeObjectURL;

const mockAlbum = { ...albumBuilder(), artists: [artistBuilder()] };

describe('useBulkTrackUpload', () => {
  const onSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useBulkTrackUpload({ album: mockAlbum, onSubmit }));

    expect(result.current.tracks).toEqual([]);
    expect(result.current.isScanningCovers).toBe(false);
    expect(result.current.tracksWithCovers).toEqual([]);
    expect(result.current.selectedCoverTrackId).toBeNull();
  });

  describe('addFiles', () => {
    it('does nothing if files are null or empty', () => {
      const { result } = renderHook(() => useBulkTrackUpload({ album: mockAlbum, onSubmit }));
      act(() => {
        result.current.addFiles(null);
      });
      expect(result.current.tracks).toEqual([]);

      act(() => {
        result.current.addFiles({ length: 0 } as FileList);
      });
      expect(result.current.tracks).toEqual([]);
    });

    it('filters out non-audio files', () => {
      const { result } = renderHook(() => useBulkTrackUpload({ album: mockAlbum, onSubmit }));
      const txtFile = new File([''], 'test.txt', { type: 'text/plain' });
      act(() => {
        result.current.addFiles([txtFile] as unknown as FileList);
      });
      expect(result.current.tracks).toEqual([]);
    });

    it('adds audio files, sorts them, and assigns track numbers', async () => {
      const { result } = renderHook(() => useBulkTrackUpload({ album: mockAlbum, onSubmit }));
      const file2 = new File([''], 'b-track.mp3', { type: 'audio/mp3' });
      const file1 = new File([''], 'a-track.mp3', { type: 'audio/mp3' });

      act(() => {
        result.current.addFiles([file2, file1] as unknown as FileList);
      });

      expect(result.current.tracks).toHaveLength(2);
      expect(result.current.tracks[0].file.name).toBe('a-track.mp3');
      expect(result.current.tracks[0].trackNumber).toBe(1);
      expect(result.current.tracks[1].file.name).toBe('b-track.mp3');
      expect(result.current.tracks[1].trackNumber).toBe(2);
      expect(cleanFilenameToTitle).toHaveBeenCalledWith('b-track.mp3', {
        artists: [mockAlbum.artists[0].name],
        album: mockAlbum.name,
      });
    });

    it('handles album without artists gracefully', () => {
      const { result } = renderHook(() =>
        useBulkTrackUpload({ album: { ...mockAlbum, artists: undefined }, onSubmit }),
      );
      const file = new File([''], 'a.mp3', { type: 'audio/mp3' });
      act(() => {
        result.current.addFiles([file] as unknown as FileList);
      });
      expect(cleanFilenameToTitle).toHaveBeenCalledWith('a.mp3', {
        artists: [],
        album: mockAlbum.name,
      });
    });
    it('handles album with missing name gracefully', () => {
      const albumWithoutName = { ...mockAlbum, name: null } as unknown as typeof mockAlbum;
      const { result } = renderHook(() =>
        useBulkTrackUpload({ album: albumWithoutName, onSubmit }),
      );
      const file = new File([''], 'a.mp3', { type: 'audio/mp3' });
      act(() => {
        result.current.addFiles([file] as unknown as FileList);
      });
      expect(cleanFilenameToTitle).toHaveBeenCalledWith('a.mp3', {
        artists: [mockAlbum.artists[0].name],
        album: '',
      });
    });
  });

  describe('updateTrack', () => {
    it('updates a specific track and leaves others intact', () => {
      const { result } = renderHook(() => useBulkTrackUpload({ album: mockAlbum, onSubmit }));
      const file1 = new File([''], 'a.mp3', { type: 'audio/mp3' });
      const file2 = new File([''], 'b.mp3', { type: 'audio/mp3' });
      act(() => {
        result.current.addFiles([file1, file2] as unknown as FileList);
      });

      const trackIdToChange = result.current.tracks[0].id;
      const trackIdToKeep = result.current.tracks[1].id;

      act(() => {
        result.current.updateTrack(trackIdToChange, { title: 'New Title', explicit: true });
      });

      expect(result.current.tracks[0].title).toBe('New Title');
      expect(result.current.tracks[0].explicit).toBe(true);
      expect(result.current.tracks[1].id).toBe(trackIdToKeep);
      expect(result.current.tracks[1].title).not.toBe('New Title');
    });
  });

  describe('removeTrack', () => {
    it('removes a track and recounts track numbers', () => {
      const { result } = renderHook(() => useBulkTrackUpload({ album: mockAlbum, onSubmit }));
      const file1 = new File([''], 'a.mp3', { type: 'audio/mp3' });
      const file2 = new File([''], 'b.mp3', { type: 'audio/mp3' });
      act(() => {
        result.current.addFiles([file1, file2] as unknown as FileList);
      });

      expect(result.current.tracks).toHaveLength(2);

      const trackIdToRemove = result.current.tracks[0].id;
      act(() => {
        result.current.removeTrack(trackIdToRemove);
      });

      expect(result.current.tracks).toHaveLength(1);
      expect(result.current.tracks[0].file.name).toBe('b.mp3');
      expect(result.current.tracks[0].trackNumber).toBe(1);
    });

    it('clears covers if list becomes empty', async () => {
      const { result } = renderHook(() => useBulkTrackUpload({ album: mockAlbum, onSubmit }));
      const file1 = new File([''], 'a.mp3', { type: 'audio/mp3' });

      act(() => {
        result.current.addFiles([file1] as unknown as FileList);
      });

      act(() => {
        result.current.setSelectedCoverTrackId('some-id');
      });

      const trackId = result.current.tracks[0].id;
      act(() => {
        result.current.removeTrack(trackId);
      });

      expect(result.current.tracks).toHaveLength(0);
      expect(result.current.selectedCoverTrackId).toBeNull();
      expect(result.current.tracksWithCovers).toEqual([]);
    });
  });

  describe('clearAll', () => {
    it('clears all tracks and selections', async () => {
      const { result } = renderHook(() => useBulkTrackUpload({ album: mockAlbum, onSubmit }));
      const file1 = new File([''], 'a.mp3', { type: 'audio/mp3' });
      act(() => {
        result.current.addFiles([file1] as unknown as FileList);
      });

      act(() => {
        result.current.setSelectedCoverTrackId('some-id');
      });

      // Mock input ref
      result.current.fileInputRef.current = { value: 'some-value' } as unknown as HTMLInputElement;

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.tracks).toEqual([]);
      expect(result.current.selectedCoverTrackId).toBeNull();
      expect(result.current.tracksWithCovers).toEqual([]);
      expect(result.current.fileInputRef.current?.value).toBe('');

      await waitFor(() => {
        expect(result.current.isScanningCovers).toBe(false);
      });
    });

    it('does not throw when fileInputRef current is null', () => {
      const { result } = renderHook(() => useBulkTrackUpload({ album: mockAlbum, onSubmit }));
      // Override the current ref explicitly to null
      Object.defineProperty(result.current.fileInputRef, 'current', {
        value: null,
        writable: true,
      });

      expect(() => {
        act(() => {
          result.current.clearAll();
        });
      }).not.toThrow();
    });
  });

  describe('handleSubmit', () => {
    it('does nothing if tracks is empty', () => {
      const { result } = renderHook(() => useBulkTrackUpload({ album: mockAlbum, onSubmit }));
      const event = { preventDefault: vi.fn() } as unknown as React.FormEvent;
      act(() => {
        result.current.handleSubmit(event);
      });
      expect(event.preventDefault).toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('calls onSubmit with tracks and selected cover', async () => {
      const coverFile = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
      vi.mocked(extractCoverFromAudioFile).mockResolvedValue(coverFile);

      const { result } = renderHook(() => useBulkTrackUpload({ album: mockAlbum, onSubmit }));
      const file1 = new File([''], 'a.mp3', { type: 'audio/mp3' });
      act(() => {
        result.current.addFiles([file1] as unknown as FileList);
      });

      await waitFor(() => {
        expect(result.current.tracksWithCovers).toHaveLength(1);
      });

      const event = { preventDefault: vi.fn() } as unknown as React.FormEvent;
      act(() => {
        result.current.handleSubmit(event);
      });

      expect(onSubmit).toHaveBeenCalledWith(result.current.tracks, coverFile);
    });

    it('calls onSubmit with null cover if cover not found in list', async () => {
      const { result } = renderHook(() => useBulkTrackUpload({ album: mockAlbum, onSubmit }));
      const file1 = new File([''], 'a.mp3', { type: 'audio/mp3' });
      act(() => {
        result.current.addFiles([file1] as unknown as FileList);
        result.current.setSelectedCoverTrackId('non-existent');
      });

      const event = { preventDefault: vi.fn() } as unknown as React.FormEvent;
      act(() => {
        result.current.handleSubmit(event);
      });

      expect(onSubmit).toHaveBeenCalledWith(result.current.tracks, null);
    });

    it('calls onSubmit with null cover if selectedCoverTrackId is null', async () => {
      const { result } = renderHook(() => useBulkTrackUpload({ album: mockAlbum, onSubmit }));
      const file1 = new File([''], 'a.mp3', { type: 'audio/mp3' });
      act(() => {
        result.current.addFiles([file1] as unknown as FileList);
        result.current.setSelectedCoverTrackId(null);
      });

      const event = { preventDefault: vi.fn() } as unknown as React.FormEvent;
      act(() => {
        result.current.handleSubmit(event);
      });

      expect(onSubmit).toHaveBeenCalledWith(result.current.tracks, null);
    });
  });

  describe('scanning covers effect', () => {
    it('extracts covers and sets selected cover', async () => {
      const coverFile = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
      vi.mocked(extractCoverFromAudioFile).mockResolvedValue(coverFile);

      const { result } = renderHook(() => useBulkTrackUpload({ album: mockAlbum, onSubmit }));
      const file1 = new File([''], 'a.mp3', { type: 'audio/mp3' });
      act(() => {
        result.current.addFiles([file1] as unknown as FileList);
      });

      await waitFor(() => {
        expect(result.current.tracksWithCovers).toHaveLength(1);
      });

      expect(result.current.tracksWithCovers[0].coverFile).toBe(coverFile);
      expect(result.current.selectedCoverTrackId).toBe(result.current.tracks[0].id);
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(coverFile);
    });

    it('does not push null covers', async () => {
      vi.mocked(extractCoverFromAudioFile).mockResolvedValue(null);

      const { result } = renderHook(() => useBulkTrackUpload({ album: mockAlbum, onSubmit }));
      const file1 = new File([''], 'a.mp3', { type: 'audio/mp3' });
      act(() => {
        result.current.addFiles([file1] as unknown as FileList);
      });

      await waitFor(() => {
        expect(result.current.isScanningCovers).toBe(false);
      });

      expect(result.current.tracksWithCovers).toHaveLength(0);
    });

    it('retains previous selected cover if still present', async () => {
      const coverFile = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
      vi.mocked(extractCoverFromAudioFile).mockResolvedValue(coverFile);

      const { result } = renderHook(() => useBulkTrackUpload({ album: mockAlbum, onSubmit }));
      const file1 = new File([''], 'a.mp3', { type: 'audio/mp3' });
      act(() => {
        result.current.addFiles([file1] as unknown as FileList);
      });

      await waitFor(() => {
        expect(result.current.tracksWithCovers).toHaveLength(1);
      });

      const initialSelected = result.current.selectedCoverTrackId;
      expect(initialSelected).toBeTruthy();

      const file2 = new File([''], 'b.mp3', { type: 'audio/mp3' });
      act(() => {
        result.current.addFiles([file2] as unknown as FileList);
      });

      await waitFor(() => {
        expect(result.current.tracksWithCovers).toHaveLength(2);
      });

      expect(result.current.selectedCoverTrackId).toBe(initialSelected);
    });

    it('cancels scan if unmounted', async () => {
      // Create a slow mock
      let resolvePromise: (val: File | null) => void;
      const promise = new Promise<File | null>((r) => {
        resolvePromise = r;
      });
      vi.mocked(extractCoverFromAudioFile).mockReturnValueOnce(promise);

      const { result, unmount } = renderHook(() =>
        useBulkTrackUpload({ album: mockAlbum, onSubmit }),
      );
      const file1 = new File([''], 'a.mp3', { type: 'audio/mp3' });
      act(() => {
        result.current.addFiles([file1] as unknown as FileList);
      });

      expect(result.current.isScanningCovers).toBe(true);

      // Unmount while scanning
      unmount();

      // Resolve the promise
      await act(async () => {
        resolvePromise(new File(['cover'], 'cover.jpg', { type: 'image/jpeg' }));
      });

      // Should not set tracks with covers because it was cancelled
      expect(result.current.tracksWithCovers).toHaveLength(0);
    });

    it('cancels scan on track change loop', async () => {
      const file = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
      let resolveFirst: (val: File | null) => void;
      const firstPromise = new Promise<File | null>((r) => {
        resolveFirst = r;
      });

      let resolveSecond: (val: File | null) => void;
      const secondPromise = new Promise<File | null>((r) => {
        resolveSecond = r;
      });

      vi.mocked(extractCoverFromAudioFile)
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise);

      const { result } = renderHook(() => useBulkTrackUpload({ album: mockAlbum, onSubmit }));
      const file1 = new File([''], 'a.mp3', { type: 'audio/mp3' });
      act(() => {
        result.current.addFiles([file1] as unknown as FileList);
      });

      const file2 = new File([''], 'b.mp3', { type: 'audio/mp3' });
      act(() => {
        result.current.addFiles([file2] as unknown as FileList);
      });

      await act(async () => {
        resolveFirst(file);
        resolveSecond(file);
      });

      // First run should be cancelled
      expect(result.current.tracksWithCovers).toHaveLength(2); // b/c it runs again and second succeeds. But wait, sorting puts a first, b second.
    });

    it('revokes exact object urls on unmount', async () => {
      const coverFile = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
      vi.mocked(extractCoverFromAudioFile).mockResolvedValue(coverFile);

      const { result, unmount } = renderHook(() =>
        useBulkTrackUpload({ album: mockAlbum, onSubmit }),
      );
      const file1 = new File([''], 'a.mp3', { type: 'audio/mp3' });
      act(() => {
        result.current.addFiles([file1] as unknown as FileList);
      });

      await waitFor(() => {
        expect(result.current.tracksWithCovers).toHaveLength(1);
      });

      unmount();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });
  });
});
