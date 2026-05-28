import {
  extractCoverFromAudioFile,
  extractMetadataFromAudioFile,
} from '@/lib/audio/audio-metadata';
import { cleanFilenameToTitle } from '@/lib/audio/clean-audio-filename';
import { sha256HexFromBlob } from '@/lib/crypto/sha256HexFromBlob';
import { customRenderHook } from '@repo/testing/web';
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLibraryAlbumFromFilesForm } from './useLibraryAlbumFromFilesForm';

vi.mock('@/lib/audio/audio-metadata', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audio/audio-metadata')>();
  return {
    ...actual,
    extractMetadataFromAudioFile: vi.fn(),
    extractCoverFromAudioFile: vi.fn(),
  };
});

vi.mock('@/lib/audio/clean-audio-filename', () => ({
  cleanFilenameToTitle: vi.fn(),
}));

vi.mock('@/lib/crypto/sha256HexFromBlob', () => ({
  sha256HexFromBlob: vi.fn(async (blob: Blob) => `digest-${blob.size}`),
}));

describe('useLibraryAlbumFromFilesForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
    vi.mocked(cleanFilenameToTitle).mockImplementation((name) => name.replace('.mp3', ''));
    vi.mocked(sha256HexFromBlob).mockImplementation(async (blob: Blob) => `digest-${blob.size}`);
  });

  const createAudioFile = (name: string) =>
    new File(['dummy content'], name, { type: 'audio/mp3' });

  const createFileList = (files: File[]): FileList => {
    const dataTransfer = new DataTransfer();
    files.forEach((f) => dataTransfer.items.add(f));
    return dataTransfer.files;
  };

  describe('initial state', () => {
    it('initializes with default state', () => {
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      expect(result.current.formData).toEqual({
        name: '',
        description: '',
        type: 'album',
        artistIds: [],
        genreIds: [],
        releaseDate: null,
      });
      expect(result.current.suggestedArtistName).toBeNull();
      expect(result.current.tracks).toEqual([]);
      expect(result.current.tracksWithCovers).toEqual([]);
      expect(result.current.isFormValid).toBe(false);
      expect(result.current.pendingArtists).toEqual([]);
    });

    it('seeds artistIds from initialArtistId when provided', () => {
      const { result } = customRenderHook(() =>
        useLibraryAlbumFromFilesForm({ initialArtistId: 'pre-seeded-artist' }),
      );

      expect(result.current.formData.artistIds).toEqual(['pre-seeded-artist']);
    });
  });

  describe('addFiles', () => {
    it('handles addFiles correctly', async () => {
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());
      const file1 = createAudioFile('track2.mp3');
      const file2 = createAudioFile('track1.mp3');

      act(() => {
        result.current.addFiles(createFileList([file1, file2]));
      });

      expect(result.current.tracks).toHaveLength(2);
      expect(result.current.tracks[0]?.file.name).toBe('track1.mp3');
      expect(result.current.tracks[0]?.trackNumber).toBe(1);
      expect(result.current.tracks[0]?.title).toBe('track1');

      expect(result.current.tracks[1]?.file.name).toBe('track2.mp3');
      expect(result.current.tracks[1]?.trackNumber).toBe(2);
    });

    it('handles empty files or non-audio files in addFiles', () => {
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());
      const textFile = new File(['text'], 'text.txt', { type: 'text/plain' });

      act(() => {
        result.current.addFiles(null);
        result.current.addFiles(createFileList([]));
        result.current.addFiles(createFileList([textFile]));
      });

      expect(result.current.tracks).toHaveLength(0);
    });
  });

  describe('metadata and covers', () => {
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

      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());
      const file1 = createAudioFile('01_song.mp3');
      const file2 = createAudioFile('02_song.mp3');

      act(() => {
        result.current.addFiles(createFileList([file1, file2]));
      });

      await waitFor(() => {
        expect(result.current.tracksWithCovers).toHaveLength(1);
      });

      expect(result.current.formData.name).toBe('Best Album');
      expect(result.current.formData.releaseDate?.getFullYear()).toBe(2024);
      expect(result.current.suggestedArtistName).toBe('Artist A');

      expect(result.current.tracks[0]?.title).toBe('Song 1');
      expect(result.current.tracks[1]?.title).toBe('Song 2');

      expect(result.current.selectedCoverTrackId).toBe(result.current.tracks[0]?.id);
      expect(result.current.selectedCoverFile).toBe(mockCover);
    });

    it('extracts full release date (month and day) when available in metadata', async () => {
      vi.mocked(extractMetadataFromAudioFile).mockResolvedValueOnce({
        title: 'Song 1',
        artist: 'Artist A',
        album: 'Best Album',
        year: 2024,
        date: '2024-05-15',
        trackNo: 1,
        diskNo: 1,
      });

      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());
      const file1 = createAudioFile('01_song.mp3');

      act(() => {
        result.current.addFiles(createFileList([file1]));
      });

      await waitFor(() => {
        expect(result.current.isScanningMetadata).toBe(false);
      });

      expect(result.current.formData.name).toBe('Best Album');
      expect(result.current.formData.releaseDate).toBeInstanceOf(Date);
      expect(result.current.formData.releaseDate?.getFullYear()).toBe(2024);
      expect(result.current.formData.releaseDate?.getMonth()).toBe(4); // May is index 4
      expect(result.current.formData.releaseDate?.getDate()).toBe(15);
    });

    it('handles empty metadata responses', async () => {
      vi.mocked(extractMetadataFromAudioFile).mockResolvedValueOnce(null);

      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());
      const file1 = createAudioFile('01_song.mp3');

      act(() => {
        result.current.addFiles(createFileList([file1]));
      });

      await waitFor(() => {
        expect(result.current.isScanningMetadata).toBe(false);
      });

      expect(result.current.formData.name).toBe('');
      expect(result.current.tracks[0]?.title).toBe('01_song');
      expect(result.current.suggestedArtistName).toBeNull();
    });

    it('handles empty album names during metadata scan array reduction', async () => {
      vi.mocked(extractMetadataFromAudioFile).mockResolvedValueOnce({
        title: 'Song',
        album: undefined,
        year: undefined,
        trackNo: undefined,
        diskNo: undefined,
      });

      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.addFiles(createFileList([createAudioFile('01_song.mp3')]));
      });

      await waitFor(() => {
        expect(result.current.isScanningMetadata).toBe(false);
      });

      expect(result.current.formData.name).toBe('');
      expect(result.current.suggestedArtistName).toBeNull();
    });

    it('does not overwrite album name when already set before metadata scan', async () => {
      vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
        title: 'Song',
        artist: 'A',
        album: 'From Metadata',
        year: 2019,
        trackNo: 1,
        diskNo: 1,
      });
      vi.mocked(extractCoverFromAudioFile).mockResolvedValue(null);

      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.updateFormData('name', 'User Title');
      });

      act(() => {
        result.current.addFiles(createFileList([createAudioFile('t.mp3')]));
      });

      await waitFor(() => {
        expect(result.current.isScanningMetadata).toBe(false);
      });

      expect(result.current.formData.name).toBe('User Title');
      expect(result.current.suggestedArtistName).toBe('A');
    });

    it('sets suggestedArtistName to null when metadata artists conflict across tracks', async () => {
      vi.mocked(extractMetadataFromAudioFile)
        .mockResolvedValueOnce({
          title: 'A',
          artist: 'Artist One',
          album: 'Alb',
          year: 2020,
          trackNo: 1,
          diskNo: 1,
        })
        .mockResolvedValueOnce({
          title: 'B',
          artist: 'Artist Two',
          album: 'Alb',
          year: 2020,
          trackNo: 2,
          diskNo: 1,
        });

      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.addFiles(
          createFileList([createAudioFile('a.mp3'), createAudioFile('b.mp3')]),
        );
      });

      await waitFor(() => {
        expect(result.current.isScanningMetadata).toBe(false);
      });

      expect(result.current.suggestedArtistName).toBeNull();
    });

    it('suggests artist when only some tracks have the same artist tag', async () => {
      vi.mocked(extractMetadataFromAudioFile)
        .mockResolvedValueOnce({
          title: 'A',
          artist: 'Shared',
          album: 'Alb',
          year: 2021,
          trackNo: 1,
          diskNo: 1,
        })
        .mockResolvedValueOnce({
          title: 'B',
          album: 'Alb',
          year: 2021,
          trackNo: 2,
          diskNo: 1,
        });

      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.addFiles(
          createFileList([createAudioFile('a.mp3'), createAudioFile('b.mp3')]),
        );
      });

      await waitFor(() => {
        expect(result.current.isScanningMetadata).toBe(false);
      });

      expect(result.current.suggestedArtistName).toBe('Shared');
    });

    it('clears suggestedArtistName when tracks are cleared', async () => {
      vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
        title: 'Song',
        artist: 'Meta Artist',
        album: 'Alb',
        year: 2022,
        trackNo: 1,
        diskNo: 1,
      });
      vi.mocked(extractCoverFromAudioFile).mockResolvedValue(null);

      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.addFiles(createFileList([createAudioFile('track.mp3')]));
      });

      await waitFor(() => {
        expect(result.current.isScanningMetadata).toBe(false);
      });

      expect(result.current.suggestedArtistName).toBe('Meta Artist');

      act(() => {
        result.current.clearTracks();
      });

      expect(result.current.suggestedArtistName).toBeNull();
    });

    it('derives cover image fallback correctly', async () => {
      const mockCover = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
      vi.mocked(extractCoverFromAudioFile).mockImplementation(async (file: File) => {
        if (file.name === 'has_cover.mp3') return mockCover;
        return null;
      });

      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

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

    it('does not auto-select embedded cover after scan when a manual cover is already set', async () => {
      vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
        title: 'Song',
        album: 'Album',
        year: 2024,
        trackNo: 1,
        diskNo: 1,
      });
      const embeddedCover = new File(['e'], 'embedded.jpg', { type: 'image/jpeg' });
      vi.mocked(extractCoverFromAudioFile).mockResolvedValue(embeddedCover);

      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());
      const manualCover = new File(['m'], 'manual.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.setManualAlbumCover(manualCover);
      });

      act(() => {
        result.current.addFiles(createFileList([createAudioFile('track.mp3')]));
      });

      await waitFor(() => {
        expect(result.current.tracksWithCovers.length).toBe(1);
      });

      expect(result.current.selectedCoverTrackId).toBeNull();
      expect(result.current.coverFileForUpload).toBe(manualCover);
    });
  });

  describe('track CRUD', () => {
    it('updates track by id', () => {
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());
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
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());
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
      expect(result.current.tracks[0]?.trackNumber).toBe(1);
    });

    it('updates a specific track and leaves others untouched', () => {
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());
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
  });

  describe('form validity', () => {
    it('computes isFormValid correctly', () => {
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      expect(result.current.isFormValid).toBe(false);

      act(() => {
        result.current.updateFormData('name', 'My Album');
        result.current.updateFormData('artistIds', ['artist-123']);
      });

      expect(result.current.isFormValid).toBe(true);

      act(() => {
        result.current.addFiles(createFileList([createAudioFile('song.mp3')]));
      });

      expect(result.current.isFormValid).toBe(true);

      const trackId = result.current.tracks[0]?.id as string;
      act(() => {
        result.current.updateTrack(trackId, { title: '   ' });
      });
      expect(result.current.isFormValid).toBe(false);
    });
  });

  describe('appendArtistId', () => {
    it('does not duplicate an id already present', () => {
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.appendArtistId('dup');
        result.current.appendArtistId('dup');
      });

      expect(result.current.formData.artistIds).toEqual(['dup']);
    });
  });

  describe('toggleArtistId', () => {
    it('adds id when absent and removes when present', () => {
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.toggleArtistId('a');
      });
      expect(result.current.formData.artistIds).toEqual(['a']);

      act(() => {
        result.current.toggleArtistId('a');
      });
      expect(result.current.formData.artistIds).toEqual([]);
    });
  });

  describe('clearArtistSelection', () => {
    it('clears artistIds', () => {
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.updateFormData('artistIds', ['x', 'y']);
      });
      expect(result.current.formData.artistIds).toEqual(['x', 'y']);

      act(() => {
        result.current.clearArtistSelection();
      });
      expect(result.current.formData.artistIds).toEqual([]);
    });
  });

  describe('clearTracks', () => {
    it('clears tracks and cover state but keeps album form fields', async () => {
      vi.mocked(extractCoverFromAudioFile).mockResolvedValue(new File([], 'i'));
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.addFiles(createFileList([createAudioFile('test.mp3')]));
        result.current.updateFormData('name', 'Kept Album');
        result.current.updateFormData('artistIds', ['artist-1']);
      });

      await waitFor(() => {
        expect(result.current.tracksWithCovers.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.clearTracks();
      });

      expect(result.current.tracks).toHaveLength(0);
      expect(result.current.tracksWithCovers).toHaveLength(0);
      expect(result.current.coverGroups).toHaveLength(0);
      expect(result.current.formData.name).toBe('Kept Album');
      expect(result.current.formData.artistIds).toEqual(['artist-1']);
    });
  });

  describe('clearAll', () => {
    it('clears all state via clearAll', async () => {
      vi.mocked(extractCoverFromAudioFile).mockResolvedValue(new File([], 'i'));
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.addFiles(createFileList([createAudioFile('test.mp3')]));
        result.current.updateFormData('name', 'Test Album');
      });

      await waitFor(() => {
        expect(result.current.tracksWithCovers.length).toBeGreaterThan(0);
      });

      act(() => {
        // @ts-expect-error - mock input element
        result.current.fileInputRef.current = { value: 'C:\\fakepath\\test.mp3' };
        result.current.clearAll();
      });

      expect(result.current.tracks).toHaveLength(0);
      expect(result.current.tracksWithCovers).toHaveLength(0);
      expect(result.current.formData.name).toBe('');
      expect(result.current.selectedCoverTrackId).toBeNull();
      expect(result.current.fileInputRef.current?.value).toBe('');
    });

    it('clears all state when fileInputRef is null', () => {
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.addFiles(createFileList([createAudioFile('test.mp3')]));
        result.current.updateFormData('name', 'Test Album');
      });

      act(() => {
        result.current.fileInputRef.current = null;
        result.current.clearAll();
      });

      expect(result.current.tracks).toHaveLength(0);
      expect(result.current.formData.name).toBe('');
    });

    it('restores initialArtistId in artistIds after clearAll', () => {
      const { result } = customRenderHook(() =>
        useLibraryAlbumFromFilesForm({ initialArtistId: 'seed-artist' }),
      );

      act(() => {
        result.current.updateFormData('name', 'Named');
        result.current.appendArtistId('extra-artist');
      });

      expect(result.current.formData.artistIds).toEqual(['seed-artist', 'extra-artist']);

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.formData.name).toBe('');
      expect(result.current.formData.artistIds).toEqual(['seed-artist']);
    });
  });

  describe('genre selection', () => {
    it('toggleGenreId removes a genre when it is already selected', () => {
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.toggleGenreId('g1');
      });
      expect(result.current.formData.genreIds).toEqual(['g1']);

      act(() => {
        result.current.toggleGenreId('g1');
      });
      expect(result.current.formData.genreIds).toEqual([]);
    });

    it('clearGenreSelection removes all genre ids', () => {
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.appendGenreId('a');
        result.current.appendGenreId('b');
        result.current.clearGenreSelection();
      });

      expect(result.current.formData.genreIds).toEqual([]);
    });

    it('appendGenreId is a no-op when the id is already present', () => {
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.appendGenreId('g1');
        result.current.appendGenreId('g1');
      });

      expect(result.current.formData.genreIds).toEqual(['g1']);
    });

    it('syncs tracks that mirror form genres when appending a second genre', () => {
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.addFiles(createFileList([createAudioFile('song.mp3')]));
      });

      act(() => {
        result.current.appendGenreId('g1');
      });

      expect(result.current.tracks[0]?.genreIds).toEqual(['g1']);

      act(() => {
        result.current.appendGenreId('g2');
      });

      expect(result.current.formData.genreIds).toEqual(['g1', 'g2']);
      expect(result.current.tracks[0]?.genreIds).toEqual(['g1', 'g2']);
    });

    it('does not sync tracks whose genre ids diverged from the form when toggling', () => {
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.addFiles(createFileList([createAudioFile('song.mp3')]));
      });

      const trackId = result.current.tracks[0]?.id as string;

      act(() => {
        result.current.appendGenreId('g1');
      });

      expect(result.current.tracks[0]?.genreIds).toEqual(['g1']);

      act(() => {
        result.current.updateTrack(trackId, { genreIds: ['other'] });
      });

      act(() => {
        result.current.toggleGenreId('g1');
      });

      expect(result.current.formData.genreIds).toEqual([]);
      expect(result.current.tracks[0]?.genreIds).toEqual(['other']);
    });

    it('does not sync when track genres differ in length from the album form snapshot', () => {
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.addFiles(createFileList([createAudioFile('song.mp3')]));
      });

      const trackId = result.current.tracks[0]?.id as string;

      act(() => {
        result.current.appendGenreId('g1');
      });

      act(() => {
        result.current.updateTrack(trackId, { genreIds: ['g1', 'extra'] });
      });

      act(() => {
        result.current.toggleGenreId('g1');
      });

      expect(result.current.formData.genreIds).toEqual([]);
      expect(result.current.tracks[0]?.genreIds).toEqual(['g1', 'extra']);
    });

    it('does not sync when genre id sets match in size but not membership', () => {
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.addFiles(createFileList([createAudioFile('song.mp3')]));
      });

      const trackId = result.current.tracks[0]?.id as string;

      act(() => {
        result.current.appendGenreId('g1');
      });

      act(() => {
        result.current.updateTrack(trackId, { genreIds: ['g2'] });
      });

      act(() => {
        result.current.toggleGenreId('g1');
      });

      expect(result.current.formData.genreIds).toEqual([]);
      expect(result.current.tracks[0]?.genreIds).toEqual(['g2']);
    });

    it('syncs tracks that still mirror the form when clearing genre selection', () => {
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.addFiles(createFileList([createAudioFile('song.mp3')]));
      });

      act(() => {
        result.current.appendGenreId('g1');
      });

      expect(result.current.tracks[0]?.genreIds).toEqual(['g1']);

      act(() => {
        result.current.clearGenreSelection();
      });

      expect(result.current.formData.genreIds).toEqual([]);
      expect(result.current.tracks[0]?.genreIds).toEqual([]);
    });

    it('treats undefined per-track genre ids as empty when syncing album genres', () => {
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.addFiles(createFileList([createAudioFile('song.mp3')]));
      });

      const trackId = result.current.tracks[0]!.id;

      act(() => {
        result.current.updateTrack(trackId, { genreIds: undefined });
      });

      act(() => {
        result.current.appendGenreId('g1');
      });

      expect(result.current.tracks[0]?.genreIds).toEqual(['g1']);
    });

    it('applies genre toggles only to tracks that still mirror the album genre snapshot', () => {
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.addFiles(
          createFileList([createAudioFile('a.mp3'), createAudioFile('b.mp3')]),
        );
      });

      const trackA = result.current.tracks[0]!;
      const trackB = result.current.tracks[1]!;

      act(() => {
        result.current.appendGenreId('g1');
      });

      act(() => {
        result.current.updateTrack(trackB.id, { genreIds: ['ignored'] });
      });

      act(() => {
        result.current.toggleGenreId('g1');
      });

      expect(result.current.formData.genreIds).toEqual([]);
      expect(result.current.tracks.find((t) => t.id === trackA.id)?.genreIds).toEqual([]);
      expect(result.current.tracks.find((t) => t.id === trackB.id)?.genreIds).toEqual(['ignored']);
    });

    it('applies appendGenreId only to tracks that mirror the prior album genre selection', () => {
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.addFiles(
          createFileList([createAudioFile('a.mp3'), createAudioFile('b.mp3')]),
        );
      });

      const trackA = result.current.tracks[0]!;
      const trackB = result.current.tracks[1]!;

      act(() => {
        result.current.appendGenreId('x');
      });

      act(() => {
        result.current.updateTrack(trackB.id, { genreIds: ['solo'] });
      });

      act(() => {
        result.current.appendGenreId('y');
      });

      expect(result.current.formData.genreIds).toEqual(['x', 'y']);
      expect(result.current.tracks.find((t) => t.id === trackA.id)?.genreIds).toEqual(['x', 'y']);
      expect(result.current.tracks.find((t) => t.id === trackB.id)?.genreIds).toEqual(['solo']);
    });

    it('clears genres only on tracks that mirrored the album selection when multiple tracks exist', () => {
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.addFiles(
          createFileList([createAudioFile('a.mp3'), createAudioFile('b.mp3')]),
        );
      });

      const trackA = result.current.tracks[0]!;
      const trackB = result.current.tracks[1]!;

      act(() => {
        result.current.appendGenreId('g1');
      });

      act(() => {
        result.current.updateTrack(trackB.id, { genreIds: ['other'] });
      });

      act(() => {
        result.current.clearGenreSelection();
      });

      expect(result.current.formData.genreIds).toEqual([]);
      expect(result.current.tracks.find((t) => t.id === trackA.id)?.genreIds).toEqual([]);
      expect(result.current.tracks.find((t) => t.id === trackB.id)?.genreIds).toEqual(['other']);
    });
  });

  describe('selected cover', () => {
    it('removes cover image selection when all tracks are removed', async () => {
      const mockCover = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
      vi.mocked(extractCoverFromAudioFile).mockResolvedValueOnce(mockCover);

      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

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

      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.addFiles(createFileList([createAudioFile('track1.mp3')]));
      });

      await waitFor(() => {
        expect(result.current.selectedCoverTrackId).not.toBeNull();
      });

      const initialCoverId = result.current.selectedCoverTrackId;

      act(() => {
        result.current.addFiles(createFileList([createAudioFile('track2.mp3')]));
      });

      await waitFor(() => {
        expect(result.current.tracksWithCovers).toHaveLength(2);
      });

      expect(result.current.selectedCoverTrackId).toBe(initialCoverId);
    });

    it('evaluates selectedCoverFile to null if selectedCoverTrackId does not match any cover', async () => {
      const mockCover = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
      vi.mocked(extractCoverFromAudioFile).mockResolvedValue(mockCover);

      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

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

    it('retains the previous cover id during a rescan when that track still has a cover', async () => {
      const mockCover = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
      vi.mocked(extractCoverFromAudioFile).mockResolvedValue(mockCover);

      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

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

      act(() => {
        result.current.setSelectedCoverTrackId(track2Id);
      });

      act(() => {
        result.current.removeTrack(track1Id);
      });

      await waitFor(() => {
        expect(result.current.tracksWithCovers).toHaveLength(1);
      });

      expect(result.current.selectedCoverTrackId).toBe(track2Id);
    });

    it('falls back to first available track cover when selected track is removed', async () => {
      const mockCover = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
      vi.mocked(extractCoverFromAudioFile).mockResolvedValue(mockCover);

      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

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

      act(() => {
        result.current.setSelectedCoverTrackId(track2Id);
      });

      act(() => {
        result.current.removeTrack(track2Id);
      });

      await waitFor(() => {
        expect(result.current.tracksWithCovers).toHaveLength(1);
      });

      expect(result.current.selectedCoverTrackId).toBe(track1Id);
    });

    it('falls back to null when no tracks have covers', async () => {
      vi.mocked(extractCoverFromAudioFile).mockResolvedValue(null);

      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.addFiles(createFileList([createAudioFile('no_cover.mp3')]));
      });

      await waitFor(() => {
        expect(result.current.isScanningCovers).toBe(false);
      });

      expect(result.current.selectedCoverTrackId).toBeNull();
    });

    it('revokes manual cover preview URL when removeManualAlbumCover runs', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());
      const manual = new File(['m'], 'manual.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.setManualAlbumCover(manual);
      });

      act(() => {
        result.current.removeManualAlbumCover();
      });

      expect(revokeSpy).toHaveBeenCalledWith('mock-url');
      expect(result.current.manualAlbumCoverPreviewUrl).toBeNull();
      expect(result.current.coverFileForUpload).toBeNull();
    });

    it('merges identical embedded covers into one cover group', async () => {
      const sharedBytes = new Uint8Array([1, 2, 3, 4]);
      const mockCover = new File([sharedBytes], 'cover.jpg', { type: 'image/jpeg' });
      vi.mocked(extractCoverFromAudioFile).mockResolvedValue(mockCover);

      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.addFiles(
          createFileList([createAudioFile('a.mp3'), createAudioFile('b.mp3')]),
        );
      });

      await waitFor(() => {
        expect(result.current.coverGroups).toHaveLength(1);
      });

      expect(result.current.coverGroups[0]?.trackIds).toHaveLength(2);
    });

    it('skips revoke when removeManualAlbumCover has no preview URL', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.removeManualAlbumCover();
      });

      expect(result.current.manualAlbumCoverPreviewUrl).toBeNull();
      expect(revokeSpy).not.toHaveBeenCalled();
      revokeSpy.mockRestore();
    });

    it('allows setManualAlbumCover(null) when no manual preview exists', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.setManualAlbumCover(null);
      });

      expect(revokeSpy).not.toHaveBeenCalled();
      revokeSpy.mockRestore();
    });

    it('revokes previous manual preview when replacing manual cover', () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      const { result } = customRenderHook(() => useLibraryAlbumFromFilesForm());
      const f1 = new File(['a'], 'a.png', { type: 'image/png' });
      const f2 = new File(['b'], 'b.png', { type: 'image/png' });

      act(() => {
        result.current.setManualAlbumCover(f1);
        result.current.setManualAlbumCover(f2);
      });

      expect(revokeSpy).toHaveBeenCalledWith('mock-url');
      revokeSpy.mockRestore();
    });

    it('aborts cover digest when unmounted before sha256 resolves', async () => {
      vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
        title: 'Song',
        artist: 'A',
        album: 'Alb',
        year: 2024,
        trackNo: 1,
        diskNo: 1,
      });
      const coverFile = new File(['x'], 'c.jpg', { type: 'image/jpeg' });
      vi.mocked(extractCoverFromAudioFile).mockResolvedValue(coverFile);

      let finishSha!: (value: string) => void;
      vi.mocked(sha256HexFromBlob).mockImplementation(
        () =>
          new Promise<string>((resolve) => {
            finishSha = resolve;
          }),
      );

      const { result, unmount } = customRenderHook(() => useLibraryAlbumFromFilesForm());

      act(() => {
        result.current.addFiles(createFileList([createAudioFile('a.mp3')]));
      });

      await waitFor(() => {
        expect(vi.mocked(sha256HexFromBlob)).toHaveBeenCalled();
      });

      unmount();

      await act(async () => {
        finishSha('digest-1');
      });
    });
  });
});
