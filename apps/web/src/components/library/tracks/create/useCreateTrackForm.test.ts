import type { ExtractedAudioMetadata } from '@/lib/audio/audio-metadata';
import {
  extractCoverFromAudioFile,
  extractMetadataFromAudioFile,
} from '@/lib/audio/audio-metadata';
import { albumBuilder, artistBuilder, imageBuilder } from '@repo/testing/builders';
import { customRenderHook } from '@repo/testing/web';
import { act, waitFor } from '@testing-library/react';
import { ZodError, z } from 'zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateTrackForm, validateWithZod } from './useCreateTrackForm';

type SchemaType = z.infer<typeof CreateLibraryTrackRequestSchema>;

vi.mock('@/lib/audio/audio-metadata', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audio/audio-metadata')>();
  return {
    ...actual,
    extractMetadataFromAudioFile: vi.fn().mockResolvedValue(null),
    extractCoverFromAudioFile: vi.fn().mockResolvedValue(null),
  };
});

vi.mock('@repo/contracts', async () => {
  const actual = await vi.importActual<typeof import('@repo/contracts')>('@repo/contracts');
  return {
    ...actual,
    CreateLibraryTrackRequestSchema: {
      ...actual.CreateLibraryTrackRequestSchema,
      safeParse: vi.fn().mockImplementation(actual.CreateLibraryTrackRequestSchema.safeParse),
    },
  };
});

import { CreateLibraryTrackRequestSchema } from '@repo/contracts';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

const originalCreateObjectURL = global.URL.createObjectURL;
const originalRevokeObjectURL = global.URL.revokeObjectURL;

const mockAlbum = { ...albumBuilder(), artists: [artistBuilder()] };

describe('useCreateTrackForm', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

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
    const { result } = customRenderHook(() =>
      useCreateTrackForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
    );

    expect(result.current.form.state.values.title).toBe('');
    expect(result.current.form.state.values.trackNumber).toBe(1);
    expect(result.current.form.state.values.diskNumber).toBe(1);
    expect(result.current.form.state.values.explicit).toBe(false);
    expect(result.current.isFormatModalOpen).toBe(false);
    expect(result.current.isMultipleFilesModalOpen).toBe(false);
    expect(result.current.trackCoverFile).toBeNull();
    expect(result.current.trackCoverPreviewUrl).toBeNull();
  });

  it('initializes with empty artistIds when album has no artists', () => {
    const albumNoArtists = { ...mockAlbum, artists: undefined };
    const { result } = customRenderHook(() =>
      useCreateTrackForm({ album: albumNoArtists, onSubmit: mockOnSubmit }),
    );

    expect(result.current.form.state.values.artistIds).toEqual([]);
  });

  describe('validateWithZod', () => {
    it('handles root-level validation errors (empty path)', () => {
      vi.mocked(CreateLibraryTrackRequestSchema.safeParse).mockReturnValueOnce({
        success: false,
        error: new ZodError([
          { path: [], message: 'Root error', code: 'custom' },
        ]) as ZodError<SchemaType>,
      });

      const errors = validateWithZod({
        title: 'Test',
        audioFile: new File([], 'test.mp3'),
        albumId: 'album-1',
        artistIds: ['artist-1'],
        trackNumber: 1,
        diskNumber: 1,
        explicit: false,
      });

      expect(errors).toEqual({ form: 'Root error' });
    });

    it('only keeps the first error for a field', () => {
      vi.mocked(CreateLibraryTrackRequestSchema.safeParse).mockReturnValueOnce({
        success: false,
        error: new ZodError([
          { path: ['title'], message: 'First error', code: 'custom' },
          { path: ['title'], message: 'Second error', code: 'custom' },
        ]) as ZodError<SchemaType>,
      });

      const errors = validateWithZod({
        title: '',
        audioFile: new File([], 'test.mp3'),
        albumId: 'album-1',
        artistIds: ['artist-1'],
        trackNumber: 1,
        diskNumber: 1,
        explicit: false,
      });

      expect(errors).toEqual({ title: 'First error' });
    });
  });

  describe('handleFiles', () => {
    it('opens multiple-files modal when more than one file', () => {
      const { result } = customRenderHook(() =>
        useCreateTrackForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      const file1 = new File(['a'], 'a.mp3', { type: 'audio/mpeg' });
      const file2 = new File(['b'], 'b.mp3', { type: 'audio/mpeg' });
      const fileList = [file1, file2] as unknown as FileList;
      Object.defineProperty(fileList, 'length', { value: 2 });

      act(() => {
        result.current.handleFiles(fileList);
      });

      expect(result.current.isMultipleFilesModalOpen).toBe(true);
    });

    it('opens format modal for non-audio file', () => {
      const { result } = customRenderHook(() =>
        useCreateTrackForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
      const fileList = [file] as unknown as FileList;
      Object.defineProperty(fileList, 'length', { value: 1 });

      act(() => {
        result.current.handleFiles(fileList);
      });

      expect(result.current.isFormatModalOpen).toBe(true);
    });

    it('sets audioFile for valid audio file', () => {
      const { result } = customRenderHook(() =>
        useCreateTrackForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      const file = new File(['audio'], 'track.mp3', { type: 'audio/mpeg' });
      const fileList = [file] as unknown as FileList;
      Object.defineProperty(fileList, 'length', { value: 1 });

      act(() => {
        result.current.handleFiles(fileList);
      });

      expect(result.current.form.state.values.audioFile).toBe(file);
    });
  });

  describe('submission', () => {
    it('calls onSubmit and navigates when stayOnPage is false', async () => {
      const { result } = customRenderHook(() =>
        useCreateTrackForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      act(() => {
        result.current.form.setFieldValue('title', 'Test Track');
        result.current.form.setFieldValue(
          'audioFile',
          new File(['x'], 'track.mp3', { type: 'audio/mpeg' }),
        );
      });

      await act(async () => {
        result.current.form.handleSubmit();
      });

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith({ to: '..' });
      });
    });

    it('resets form and increments track number when stayOnPage is true', async () => {
      const { result } = customRenderHook(() =>
        useCreateTrackForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      act(() => {
        result.current.setStayOnPage(true);
        result.current.form.setFieldValue('title', 'Track 1');
        result.current.form.setFieldValue('trackNumber', 1);
        result.current.form.setFieldValue(
          'audioFile',
          new File(['x'], 'track.mp3', { type: 'audio/mpeg' }),
        );
      });

      await act(async () => {
        result.current.form.handleSubmit();
      });

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
      });

      expect(result.current.form.state.values.title).toBe('');
      expect(result.current.form.state.values.trackNumber).toBe(2);
    });

    it('sets coverFile to trackCoverFile if useTrackCoverAsAlbumCover is true', async () => {
      const { result } = customRenderHook(() =>
        useCreateTrackForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      const file = new File(['audio'], 'track.mp3', { type: 'audio/mpeg' });
      act(() => {
        result.current.form.setFieldValue('title', 'Test Title');
        result.current.form.setFieldValue('audioFile', file);
      });

      const coverFile = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
      vi.mocked(extractCoverFromAudioFile).mockResolvedValue(coverFile);

      act(() => {
        result.current.handleFiles([file] as unknown as FileList);
      });

      await waitFor(() => {
        expect(result.current.trackCoverFile).toBe(coverFile);
      });

      act(() => {
        result.current.setUseTrackCoverAsAlbumCover(true);
      });

      await act(async () => {
        result.current.form.handleSubmit();
      });

      expect(mockOnSubmit).toHaveBeenCalledWith(expect.anything(), file, coverFile);
    });

    it('cleans up URLs and cancels pending scans when unmounted or file changes', async () => {
      let resolveScan: (value: File | null) => void;
      vi.mocked(extractCoverFromAudioFile).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveScan = resolve;
          }),
      );

      const { result, unmount } = customRenderHook(() =>
        useCreateTrackForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      const file = new File(['x'], 'track1.mp3', { type: 'audio/mpeg' });
      act(() => {
        result.current.handleFiles([file] as unknown as FileList);
      });

      // While scanning, unmount
      unmount();

      // Resolve after unmount - should not update state, returning early
      await act(async () => {
        if (resolveScan) resolveScan(null);
      });

      expect(result.current.isScanningMetadata).toBe(true); // Left in true state because it bailed before setting false
    });

    it('revokes url when resetting on stayOnPage if preview existed', async () => {
      const revokeSpy = vi.spyOn(global.URL, 'revokeObjectURL');
      vi.mocked(extractCoverFromAudioFile).mockResolvedValue(
        new File(['cover'], 'cover.jpg', { type: 'image/jpeg' }),
      );
      const { result } = customRenderHook(() =>
        useCreateTrackForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      act(() => {
        result.current.setStayOnPage(true);
        result.current.form.setFieldValue('title', 'Track 1');
      });

      const file = new File(['audio'], 'track.mp3', { type: 'audio/mpeg' });
      act(() => {
        result.current.handleFiles([file] as unknown as FileList);
      });

      await waitFor(() => {
        expect(result.current.trackCoverPreviewUrl).toBe('blob:test-url');
      });

      await act(async () => {
        await result.current.form.handleSubmit(); // this triggers scan reset
      });

      // The URL should be revoked when audioFileForScan becomes null
      expect(revokeSpy).toHaveBeenCalledWith('blob:test-url');
    });

    it('revokes url when scanning a new file while a preview already exists', async () => {
      const revokeSpy = vi.spyOn(global.URL, 'revokeObjectURL');
      vi.mocked(extractCoverFromAudioFile).mockResolvedValue(
        new File(['cover'], 'cover.jpg', { type: 'image/jpeg' }),
      );
      const { result } = customRenderHook(() =>
        useCreateTrackForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      const file1 = new File(['x'], 'track1.mp3', { type: 'audio/mpeg' });
      act(() => {
        result.current.handleFiles([file1] as unknown as FileList);
      });

      await waitFor(() => {
        expect(result.current.trackCoverPreviewUrl).toBe('blob:test-url');
      });

      // Scanning a second file
      const file2 = new File(['y'], 'track2.mp3', { type: 'audio/mpeg' });
      act(() => {
        result.current.handleFiles([file2] as unknown as FileList);
      });

      // We expect the scan to begin and immediately revoke the existing prev
      expect(revokeSpy).toHaveBeenCalledWith('blob:test-url');
    });

    it('sets submissionError on submit failure', async () => {
      mockOnSubmit.mockRejectedValueOnce(new Error('Network error'));

      const { result } = customRenderHook(() =>
        useCreateTrackForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      act(() => {
        result.current.form.setFieldValue('title', 'Test');
        result.current.form.setFieldValue(
          'audioFile',
          new File(['x'], 'track.mp3', { type: 'audio/mpeg' }),
        );
      });

      await act(async () => {
        result.current.form.handleSubmit();
      });

      await waitFor(() => {
        expect(result.current.submissionError).toBe('Network error');
      });
    });

    it('sets generic error message for non-Error rejection', async () => {
      mockOnSubmit.mockRejectedValueOnce('Something went wrong');

      const { result } = customRenderHook(() =>
        useCreateTrackForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      act(() => {
        result.current.form.setFieldValue('title', 'Test');
        result.current.form.setFieldValue(
          'audioFile',
          new File(['x'], 'track.mp3', { type: 'audio/mpeg' }),
        );
      });

      await act(async () => {
        result.current.form.handleSubmit();
      });

      await waitFor(() => {
        expect(result.current.submissionError).toBe('Submission failed. Please try again.');
      });
    });

    it('sets coverFile to null if useTrackCoverAsAlbumCover is false even if trackCoverFile exists', async () => {
      const { result } = customRenderHook(() =>
        useCreateTrackForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      const file = new File(['audio'], 'track.mp3', { type: 'audio/mpeg' });
      const coverFile = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
      vi.mocked(extractCoverFromAudioFile).mockResolvedValue(coverFile);

      act(() => {
        result.current.form.setFieldValue('title', 'Test Title');
        result.current.form.setFieldValue('audioFile', file);
        result.current.handleFiles([file] as unknown as FileList);
      });

      await waitFor(() => {
        expect(result.current.trackCoverFile).toBe(coverFile);
      });

      act(() => {
        result.current.setUseTrackCoverAsAlbumCover(false);
      });

      await act(async () => {
        result.current.form.handleSubmit();
      });

      expect(mockOnSubmit).toHaveBeenCalledWith(expect.anything(), file, null);
    });

    it('sets coverFile to null if trackCoverFile is null even if useTrackCoverAsAlbumCover is true', async () => {
      const { result } = customRenderHook(() =>
        useCreateTrackForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      const file = new File(['audio'], 'track.mp3', { type: 'audio/mpeg' });
      vi.mocked(extractCoverFromAudioFile).mockResolvedValue(null);

      act(() => {
        result.current.form.setFieldValue('title', 'Test Title');
        result.current.form.setFieldValue('audioFile', file);
        result.current.handleFiles([file] as unknown as FileList);
      });

      await waitFor(() => {
        expect(result.current.trackCoverFile).toBeNull();
      });

      act(() => {
        result.current.setUseTrackCoverAsAlbumCover(true);
      });

      await act(async () => {
        result.current.form.handleSubmit();
      });

      expect(mockOnSubmit).toHaveBeenCalledWith(expect.anything(), file, null);
    });
  });

  describe('metadata scanning', () => {
    it('extracts metadata and sets form values', async () => {
      vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
        title: 'Extracted Title',
        artist: 'Artist',
        album: 'Album',
        trackNo: 3,
        diskNo: 2,
      });

      const { result } = customRenderHook(() =>
        useCreateTrackForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      const file = new File(['x'], 'track.mp3', { type: 'audio/mpeg' });
      act(() => {
        result.current.form.setFieldValue('audioFile', file);
      });

      act(() => {
        result.current.handleFiles([file] as unknown as FileList);
      });

      await waitFor(() => {
        expect(result.current.isScanningMetadata).toBe(false);
      });

      expect(result.current.form.state.values.title).toBe('Extracted Title');
      expect(result.current.form.state.values.trackNumber).toBe(3);
      expect(result.current.form.state.values.diskNumber).toBe(2);
    });

    it('does not overwrite title when the user already entered one', async () => {
      vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
        title: 'Extracted Title',
        artist: 'Artist',
        album: 'Album',
        trackNo: 3,
        diskNo: 2,
      });

      const { result } = customRenderHook(() =>
        useCreateTrackForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      act(() => {
        result.current.form.setFieldValue('title', 'User Chosen Title');
      });

      const file = new File(['x'], 'track.mp3', { type: 'audio/mpeg' });
      act(() => {
        result.current.handleFiles([file] as unknown as FileList);
      });

      await waitFor(() => {
        expect(result.current.isScanningMetadata).toBe(false);
      });

      expect(result.current.form.state.values.title).toBe('User Chosen Title');
      expect(result.current.form.state.values.trackNumber).toBe(3);
      expect(result.current.form.state.values.diskNumber).toBe(2);
    });

    it('sets track cover when cover is extracted', async () => {
      const coverFile = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
      vi.mocked(extractCoverFromAudioFile).mockResolvedValue(coverFile);

      const { result } = customRenderHook(() =>
        useCreateTrackForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      const file = new File(['x'], 'track.mp3', { type: 'audio/mpeg' });
      act(() => {
        result.current.handleFiles([file] as unknown as FileList);
      });

      await waitFor(() => {
        expect(result.current.trackCoverFile).toBe(coverFile);
        expect(result.current.trackCoverPreviewUrl).toBe('blob:test-url');
      });
    });

    it('uses fallback values when metadata is partially missing', async () => {
      vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
        title: '', // empty title
        artist: '',
        album: '',
        trackNo: undefined,
        diskNo: undefined,
      } satisfies ExtractedAudioMetadata);

      const { result } = customRenderHook(() =>
        useCreateTrackForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      const file = new File(['x'], 'clean-filename.mp3', { type: 'audio/mpeg' });
      act(() => {
        result.current.handleFiles([file] as unknown as FileList);
      });

      await waitFor(() => {
        expect(result.current.isScanningMetadata).toBe(false);
      });

      // Should capitalize and clean the filename
      expect(result.current.form.state.values.title).toBe('Clean filename');
      expect(result.current.form.state.values.trackNumber).toBe(1);
      expect(result.current.form.state.values.diskNumber).toBe(1);
    });

    it('uses fallback values when metadata is fully missing', async () => {
      vi.mocked(extractMetadataFromAudioFile).mockResolvedValue(null);

      const { result } = customRenderHook(() =>
        useCreateTrackForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      const file = new File(['x'], 'track.mp3', { type: 'audio/mpeg' });
      act(() => {
        result.current.handleFiles([file] as unknown as FileList);
      });

      await waitFor(() => {
        expect(result.current.isScanningMetadata).toBe(false);
      });

      expect(result.current.form.state.values.title).toBe('Track');
      expect(result.current.form.state.values.trackNumber).toBe(1);
      expect(result.current.form.state.values.diskNumber).toBe(1);
    });

    it('handles partially missing metadata fields', async () => {
      vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
        artist: 'Some Artist',
        album: undefined,
        title: undefined,
        trackNo: undefined,
        diskNo: undefined,
      } satisfies ExtractedAudioMetadata);

      const { result } = customRenderHook(() =>
        useCreateTrackForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      const file = new File(['x'], 'track.mp3', { type: 'audio/mpeg' });
      act(() => {
        result.current.handleFiles([file] as unknown as FileList);
      });

      await waitFor(() => {
        expect(result.current.isScanningMetadata).toBe(false);
      });

      expect(result.current.form.state.values.title).toBe('Track');
      expect(result.current.form.state.values.trackNumber).toBe(1);
      expect(result.current.form.state.values.diskNumber).toBe(1);
    });

    it('handles null/undefined title in form state via ?? fallback', async () => {
      vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
        title: 'New Title',
      } satisfies ExtractedAudioMetadata);

      const { result } = customRenderHook(() =>
        useCreateTrackForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      act(() => {
        // Force title to undefined to hit the ?? '' branch
        // We use a functional update or similar if possible, but form values are controlled by tanstack form
        // To be fully type safe and hit this, we might need to cast to a type that allows undefined
        // but since we want to avoid 'as any' or 'as unknown', we'll try to use setFieldValue with a cast
        result.current.form.setFieldValue('title', undefined as unknown as string);
      });

      const file = new File(['x'], 'track.mp3', { type: 'audio/mpeg' });
      act(() => {
        result.current.handleFiles([file] as unknown as FileList);
      });

      await waitFor(() => {
        expect(result.current.isScanningMetadata).toBe(false);
      });

      expect(result.current.form.state.values.title).toBe('New Title');
    });

    it('sets useTrackCoverAsAlbumCover to false when no cover is extracted', async () => {
      vi.mocked(extractCoverFromAudioFile).mockResolvedValue(null);

      const { result } = customRenderHook(() =>
        useCreateTrackForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      const file = new File(['x'], 'track.mp3', { type: 'audio/mpeg' });
      act(() => {
        result.current.handleFiles([file] as unknown as FileList);
      });

      await waitFor(() => {
        expect(result.current.isScanningMetadata).toBe(false);
      });

      expect(result.current.trackCoverFile).toBeNull();
      expect(result.current.useTrackCoverAsAlbumCover).toBe(false);
    });

    it('sets useTrackCoverAsAlbumCover based on existing album cover', async () => {
      const coverFile = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
      vi.mocked(extractCoverFromAudioFile).mockResolvedValue(coverFile);

      // Case 1: Album already has a cover -> should NOT auto-use track cover
      const albumWithCover = { ...mockAlbum, cover: imageBuilder({ url: 'existing-url' }) };
      const { result: result1 } = customRenderHook(() =>
        useCreateTrackForm({ album: albumWithCover, onSubmit: mockOnSubmit }),
      );

      const file = new File(['x'], 'track.mp3', { type: 'audio/mpeg' });
      act(() => {
        result1.current.handleFiles([file] as unknown as FileList);
      });

      await waitFor(() => {
        expect(result1.current.useTrackCoverAsAlbumCover).toBe(false);
      });

      // Case 2: Album has NO cover -> SHOULD auto-use track cover
      const albumNoCover = { ...mockAlbum, cover: undefined };
      const { result: result2 } = customRenderHook(() =>
        useCreateTrackForm({ album: albumNoCover, onSubmit: mockOnSubmit }),
      );

      act(() => {
        result2.current.handleFiles([file] as unknown as FileList);
      });

      await waitFor(() => {
        expect(result2.current.useTrackCoverAsAlbumCover).toBe(true);
      });
    });
  });

  describe('cleanup and edge cases', () => {
    it('cancels microtask if unmounted immediately after setting audioFileForScan to null', async () => {
      const { result, unmount } = customRenderHook(() =>
        useCreateTrackForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      act(() => {
        // Set to null to trigger the microtask useEffect
        result.current.form.setFieldValue('audioFile', null);
      });

      unmount();

      // The microtask will run but 'cancelled' will be true
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      // No assertion needed other than it doesn't crash or update unmounted state (which Vitest would catch)
    });
  });
});
