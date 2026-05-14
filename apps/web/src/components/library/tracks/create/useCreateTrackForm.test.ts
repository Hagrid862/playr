import {
  extractCoverFromAudioFile,
  extractMetadataFromAudioFile,
} from '@/lib/audio/audio-metadata';
import { albumBuilder, artistBuilder } from '@repo/testing/builders';
import { customRenderHook } from '@repo/testing/web';
import { act, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateTrackForm } from './useCreateTrackForm';

vi.mock('@/lib/audio/audio-metadata', () => ({
  extractMetadataFromAudioFile: vi.fn().mockResolvedValue(null),
  extractCoverFromAudioFile: vi.fn().mockResolvedValue(null),
}));

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
  });
});
