import { extractCoverFromAudioFile, extractMetadataFromAudioFile } from '@/lib/audio-metadata';
import { cleanFilenameToTitle } from '@/lib/clean-audio-filename';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBulkAlbumUploadForm } from './useBulkAlbumUploadForm';

vi.mock('@/lib/audio-metadata', () => ({
  extractMetadataFromAudioFile: vi.fn(),
  extractCoverFromAudioFile: vi.fn(),
}));

vi.mock('@/lib/clean-audio-filename', () => ({
  cleanFilenameToTitle: vi.fn(),
}));

describe('useBulkAlbumUploadForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
    vi.mocked(cleanFilenameToTitle).mockImplementation((name) => name.replace('.mp3', ''));
  });

  const createAudioFile = (name: string) =>
    new File(['dummy content'], name, { type: 'audio/mp3' });

  const createFileList = (files: File[]): FileList => {
    const dataTransfer = new DataTransfer();
    files.forEach((f) => dataTransfer.items.add(f));
    return dataTransfer.files;
  };

  it('initializes with default state', () => {
    const { result } = renderHook(() => useBulkAlbumUploadForm());

    expect(result.current.formData).toEqual({
      name: '',
      description: '',
      type: 'album',
      artistId: '',
      releaseDate: null,
    });
    expect(result.current.tracks).toEqual([]);
    expect(result.current.tracksWithCovers).toEqual([]);
    expect(result.current.isFormValid).toBe(false);
  });

  it('handles addFiles correctly', async () => {
    const { result } = renderHook(() => useBulkAlbumUploadForm());
    const file1 = createAudioFile('track2.mp3');
    const file2 = createAudioFile('track1.mp3'); // Intentionally reverse alphabetical

    act(() => {
      result.current.addFiles(createFileList([file1, file2]));
    });

    // Expect alphabetical sorting and trackNumber assignment
    expect(result.current.tracks).toHaveLength(2);
    expect(result.current.tracks[0]?.file.name).toBe('track1.mp3');
    expect(result.current.tracks[0]?.trackNumber).toBe(1);
    expect(result.current.tracks[0]?.title).toBe('track1');

    expect(result.current.tracks[1]?.file.name).toBe('track2.mp3');
    expect(result.current.tracks[1]?.trackNumber).toBe(2);
  });

  it('extracts metadata and covers automatically when tracks change', async () => {
    vi.mocked(extractMetadataFromAudioFile)
      .mockResolvedValueOnce({
        title: 'Song 1',
        artist: 'Artist A',
        album: 'Best Album',
        year: 2024,
        trackNo: 1,
        diskNo: 1,
      })
      .mockResolvedValueOnce({
        title: 'Song 2',
        artist: 'Artist A',
        album: 'Best Album',
        year: 2024,
        trackNo: 2,
        diskNo: 1,
      });

    const mockCover = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
    vi.mocked(extractCoverFromAudioFile).mockImplementation(async (file: File) => {
      if (file.name === '01_song.mp3') return mockCover;
      return null;
    });

    const { result } = renderHook(() => useBulkAlbumUploadForm());
    const file1 = createAudioFile('01_song.mp3');
    const file2 = createAudioFile('02_song.mp3');

    act(() => {
      result.current.addFiles(createFileList([file1, file2]));
    });

    await waitFor(() => {
      expect(result.current.tracksWithCovers).toHaveLength(1);
    });

    // Form data derived from metadata
    expect(result.current.formData.name).toBe('Best Album');
    expect(result.current.formData.releaseDate?.getFullYear()).toBe(2024);

    // Tracks updated from metadata
    expect(result.current.tracks[0]?.title).toBe('Song 1');
    expect(result.current.tracks[1]?.title).toBe('Song 2');

    // Covers updated
    expect(result.current.selectedCoverTrackId).toBe(result.current.tracks[0]?.id);
    expect(result.current.selectedCoverFile).toBe(mockCover);
  });

  it('handles empty files or non-audio files in addFiles', () => {
    const { result } = renderHook(() => useBulkAlbumUploadForm());
    const textFile = new File(['text'], 'text.txt', { type: 'text/plain' });

    act(() => {
      result.current.addFiles(null);
      result.current.addFiles(createFileList([]));
      result.current.addFiles(createFileList([textFile]));
    });

    expect(result.current.tracks).toHaveLength(0);
  });

  it('updates track by id', () => {
    const { result } = renderHook(() => useBulkAlbumUploadForm());
    const file = createAudioFile('song.mp3');

    act(() => {
      result.current.addFiles(createFileList([file]));
    });

    const trackId = result.current.tracks[0]?.id as string;

    act(() => {
      result.current.updateTrack(trackId, { title: 'New Title', explicit: true });
    });

    expect(result.current.tracks[0]?.title).toBe('New Title');
    expect(result.current.tracks[0]?.explicit).toBe(true);
  });

  it('removes track by id', () => {
    const { result } = renderHook(() => useBulkAlbumUploadForm());
    const file1 = createAudioFile('song1.mp3');
    const file2 = createAudioFile('song2.mp3');

    act(() => {
      result.current.addFiles(createFileList([file1, file2]));
    });

    const trackIdToRemove = result.current.tracks[0]?.id as string;

    act(() => {
      result.current.removeTrack(trackIdToRemove);
    });

    expect(result.current.tracks).toHaveLength(1);
    expect(result.current.tracks[0]?.file.name).toBe('song2.mp3');
    // Track numbers should be re-assigned
    expect(result.current.tracks[0]?.trackNumber).toBe(1);
  });

  it('clears all state via clearAll', async () => {
    vi.mocked(extractCoverFromAudioFile).mockResolvedValue(new File([], 'i'));
    const { result } = renderHook(() => useBulkAlbumUploadForm());

    act(() => {
      result.current.addFiles(createFileList([createAudioFile('test.mp3')]));
      result.current.updateFormData('name', 'Test Album');
    });

    await waitFor(() => {
      expect(result.current.tracksWithCovers.length).toBeGreaterThan(0);
    });

    act(() => {
      // Simulate input ref being attached and having a value
      // @ts-expect-error - mock input element
      result.current.fileInputRef.current = { value: 'C:\\fakepath\\test.mp3' };
      result.current.clearAll();
    });

    expect(result.current.tracks).toHaveLength(0);
    expect(result.current.tracksWithCovers).toHaveLength(0);
    expect(result.current.formData.name).toBe('');
    expect(result.current.selectedCoverTrackId).toBeNull();
    // Verify line 207 is covered (resetting value)
    expect(result.current.fileInputRef.current?.value).toBe('');
  });

  it('computes isFormValid correctly', () => {
    const { result } = renderHook(() => useBulkAlbumUploadForm());

    expect(result.current.isFormValid).toBe(false);

    act(() => {
      result.current.updateFormData('name', 'My Album');
      result.current.updateFormData('artistId', 'artist-123');
      result.current.addFiles(createFileList([createAudioFile('song.mp3')]));
    });

    expect(result.current.isFormValid).toBe(true);

    // Invalid track
    const trackId = result.current.tracks[0]?.id as string;
    act(() => {
      result.current.updateTrack(trackId, { title: '   ' }); // empty title
    });
    expect(result.current.isFormValid).toBe(false);
  });

  it('handles empty metadata responses', async () => {
    vi.mocked(extractMetadataFromAudioFile).mockResolvedValueOnce(null);

    const { result } = renderHook(() => useBulkAlbumUploadForm());
    const file1 = createAudioFile('01_song.mp3');

    act(() => {
      result.current.addFiles(createFileList([file1]));
    });

    await waitFor(() => {
      expect(result.current.isScanningMetadata).toBe(false);
    });

    expect(result.current.formData.name).toBe('');
    expect(result.current.tracks[0]?.title).toBe('01_song'); // Fallback to filename
  });

  it('handles empty album names during metadata scan array reduction', async () => {
    vi.mocked(extractMetadataFromAudioFile).mockResolvedValueOnce({
      title: 'Song',
      album: undefined,
      year: undefined,
      trackNo: undefined,
      diskNo: undefined,
    });

    const { result } = renderHook(() => useBulkAlbumUploadForm());

    act(() => {
      result.current.addFiles(createFileList([createAudioFile('01_song.mp3')]));
    });

    await waitFor(() => {
      expect(result.current.isScanningMetadata).toBe(false);
    });

    expect(result.current.formData.name).toBe('');
  });

  it('derives cover image fallback correctly', async () => {
    const mockCover = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
    vi.mocked(extractCoverFromAudioFile).mockImplementation(async (file: File) => {
      if (file.name === 'has_cover.mp3') return mockCover;
      return null;
    });

    const { result } = renderHook(() => useBulkAlbumUploadForm());

    act(() => {
      result.current.addFiles(
        createFileList([createAudioFile('no_cover.mp3'), createAudioFile('has_cover.mp3')]),
      );
    });

    await waitFor(() => {
      expect(result.current.tracksWithCovers).toHaveLength(1);
    });

    expect(result.current.selectedCoverTrackId).not.toBeNull();
  });

  it('removes cover image selection when all tracks are removed', async () => {
    const mockCover = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
    vi.mocked(extractCoverFromAudioFile).mockResolvedValueOnce(mockCover);

    const { result } = renderHook(() => useBulkAlbumUploadForm());

    act(() => {
      result.current.addFiles(createFileList([createAudioFile('has_cover.mp3')]));
    });

    await waitFor(() => {
      expect(result.current.tracksWithCovers).toHaveLength(1);
    });

    const trackIdToRemove = result.current.tracks[0]?.id as string;

    act(() => {
      result.current.removeTrack(trackIdToRemove);
    });

    expect(result.current.tracks).toHaveLength(0);
    expect(result.current.tracksWithCovers).toHaveLength(0);
    expect(result.current.selectedCoverTrackId).toBeNull();
  });

  it('retains the initially selected cover track ID when adding more tracks', async () => {
    const mockCover = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
    vi.mocked(extractCoverFromAudioFile).mockResolvedValue(mockCover);

    const { result } = renderHook(() => useBulkAlbumUploadForm());

    // Add first track
    act(() => {
      result.current.addFiles(createFileList([createAudioFile('track1.mp3')]));
    });

    await waitFor(() => {
      expect(result.current.selectedCoverTrackId).not.toBeNull();
    });

    const initialCoverId = result.current.selectedCoverTrackId;

    // Add second track
    act(() => {
      result.current.addFiles(createFileList([createAudioFile('track2.mp3')]));
    });

    await waitFor(() => {
      expect(result.current.tracksWithCovers).toHaveLength(2);
    });

    // Should still be the first track's ID
    expect(result.current.selectedCoverTrackId).toBe(initialCoverId);
  });

  it('updates a specific track and leaves others untouched', () => {
    const { result } = renderHook(() => useBulkAlbumUploadForm());
    const file1 = createAudioFile('song1.mp3');
    const file2 = createAudioFile('song2.mp3');

    act(() => {
      result.current.addFiles(createFileList([file1, file2]));
    });

    const trackIdToUpdate = result.current.tracks[0]?.id as string;
    const trackIdToKeep = result.current.tracks[1]?.id as string;

    act(() => {
      result.current.updateTrack(trackIdToUpdate, { title: 'Updated Title' });
    });

    const updatedTrack = result.current.tracks.find((t) => t.id === trackIdToUpdate);
    const unchangedTrack = result.current.tracks.find((t) => t.id === trackIdToKeep);

    expect(updatedTrack?.title).toBe('Updated Title');
    expect(unchangedTrack?.title).toBe('song2');
  });

  it('clears all state when fileInputRef is null', () => {
    const { result } = renderHook(() => useBulkAlbumUploadForm());

    act(() => {
      result.current.addFiles(createFileList([createAudioFile('test.mp3')]));
      result.current.updateFormData('name', 'Test Album');
    });

    act(() => {
      // Ensure it's null
      result.current.fileInputRef.current = null;
      result.current.clearAll();
    });

    expect(result.current.tracks).toHaveLength(0);
    expect(result.current.formData.name).toBe('');
  });

  it('evaluates selectedCoverFile to null if selectedCoverTrackId does not match any cover', async () => {
    const mockCover = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
    vi.mocked(extractCoverFromAudioFile).mockResolvedValue(mockCover);

    const { result } = renderHook(() => useBulkAlbumUploadForm());

    act(() => {
      result.current.addFiles(createFileList([createAudioFile('track1.mp3')]));
    });

    await waitFor(() => {
      expect(result.current.tracksWithCovers).toHaveLength(1);
    });

    act(() => {
      result.current.setSelectedCoverTrackId('non-existent-id');
    });

    expect(result.current.selectedCoverFile).toBeNull();
  });

  it('covers the true branch of retaining the previous cover id during a rescan', async () => {
    const mockCover = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
    vi.mocked(extractCoverFromAudioFile).mockResolvedValue(mockCover);

    const { result } = renderHook(() => useBulkAlbumUploadForm());

    act(() => {
      result.current.addFiles(
        createFileList([createAudioFile('track1.mp3'), createAudioFile('track2.mp3')]),
      );
    });

    await waitFor(() => {
      expect(result.current.tracksWithCovers).toHaveLength(2);
    });

    const track1Id = result.current.tracks[0]?.id as string;
    const track2Id = result.current.tracks[1]?.id as string;

    // Manually set to track2, ensuring it's not the default track1
    act(() => {
      result.current.setSelectedCoverTrackId(track2Id);
    });

    // We remove track1. This triggers a scan of the remaining track (track2).
    // The previously selected track (track2) should be retained, hitting the true branch.
    act(() => {
      result.current.removeTrack(track1Id);
    });

    await waitFor(() => {
      expect(result.current.tracksWithCovers).toHaveLength(1);
    });

    // Since track2 is still in the results, it should retain track2Id (true branch)
    expect(result.current.selectedCoverTrackId).toBe(track2Id);
  });

  it('falls back to first available track cover when selected track is removed', async () => {
    const mockCover = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
    vi.mocked(extractCoverFromAudioFile).mockResolvedValue(mockCover);

    const { result } = renderHook(() => useBulkAlbumUploadForm());

    act(() => {
      result.current.addFiles(
        createFileList([createAudioFile('track1.mp3'), createAudioFile('track2.mp3')]),
      );
    });

    await waitFor(() => {
      expect(result.current.tracksWithCovers).toHaveLength(2);
    });

    const track1Id = result.current.tracks[0]?.id as string;
    const track2Id = result.current.tracks[1]?.id as string;

    // Select track2 as cover
    act(() => {
      result.current.setSelectedCoverTrackId(track2Id);
    });

    // Remove track2. The selected track is no longer in results, so we fall back to results[0]
    act(() => {
      result.current.removeTrack(track2Id);
    });

    await waitFor(() => {
      expect(result.current.tracksWithCovers).toHaveLength(1);
    });

    // Should fall back to track1 (the only remaining track with a cover)
    expect(result.current.selectedCoverTrackId).toBe(track1Id);
  });

  it('falls back to null when no tracks have covers', async () => {
    vi.mocked(extractCoverFromAudioFile).mockResolvedValue(null);

    const { result } = renderHook(() => useBulkAlbumUploadForm());

    act(() => {
      result.current.addFiles(createFileList([createAudioFile('no_cover.mp3')]));
    });

    await waitFor(() => {
      expect(result.current.isScanningCovers).toBe(false);
    });

    // results is empty, so results[0]?.trackId ?? null = null
    expect(result.current.selectedCoverTrackId).toBeNull();
  });
});
