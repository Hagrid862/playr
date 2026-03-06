import type { UpdateLibraryAlbumRequest } from '@repo/contracts';
import { AlbumType } from '@repo/db';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockAlbum } from '../__tests__/fixtures';
import { useEditAlbumForm, validateWithZod } from './useEditAlbumForm';

describe('validateWithZod', () => {
  it('maps multiple validation errors correctly', () => {
    // Missing required fields 'name' and invalid type should cause errors
    const invalidForm: UpdateLibraryAlbumRequest = {
      name: '', // should be min 1
      description: '',
      type: 'invalid-type' as AlbumType, // invalid enum
      releaseDate: null,
    };

    const errors = validateWithZod(invalidForm);
    expect(errors).toBeDefined();
    // Verify it creates an object with paths
    expect(Object.keys(errors as Record<string, string>).length).toBeGreaterThan(0);
    expect(errors?.name).toBeDefined();
    expect(errors?.type).toBeDefined();
  });

  it('returns undefined for valid payload', () => {
    const validForm: UpdateLibraryAlbumRequest = {
      name: 'Valid Name',
      type: AlbumType.album,
    };
    const errors = validateWithZod(validForm);
    expect(errors).toBeUndefined();
  });
});

describe('useEditAlbumForm', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('initializes with album values', () => {
    const { result } = renderHook(() =>
      useEditAlbumForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
    );

    expect(result.current.form.state.values.name).toBe(mockAlbum.name);
    expect(result.current.form.state.values.description).toBe(mockAlbum.description);
    expect(result.current.form.state.values.type).toBe(mockAlbum.type);
    expect(result.current.currentCoverUrl).toBe(mockAlbum.cover?.url);
    expect(result.current.isFormatModalOpen).toBe(false);
    expect(result.current.isMultipleFilesModalOpen).toBe(false);
  });

  it('initializes with fallback values when description and releaseDate are missing', () => {
    const incompleteAlbum = {
      ...mockAlbum,
      description: null,
      releaseDate: null,
    };
    const { result } = renderHook(() =>
      useEditAlbumForm({ album: incompleteAlbum, onSubmit: mockOnSubmit }),
    );

    expect(result.current.form.state.values.description).toBe('');
    expect(result.current.form.state.values.releaseDate).toBeNull();
  });

  describe('handleCoverSelect', () => {
    it('sets selected cover and preview for valid image', () => {
      const { result } = renderHook(() =>
        useEditAlbumForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      const file = new File(['image'], 'test.png', { type: 'image/png' });
      act(() => {
        result.current.handleCoverSelect(file);
      });

      expect(result.current.currentCoverUrl).toBe('blob:test-url');
      expect(result.current.isFormatModalOpen).toBe(false);
    });

    it('opens format modal for non-image file', () => {
      const { result } = renderHook(() =>
        useEditAlbumForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      const file = new File(['doc'], 'test.pdf', { type: 'application/pdf' });
      act(() => {
        result.current.handleCoverSelect(file);
      });

      expect(result.current.isFormatModalOpen).toBe(true);
    });
  });

  describe('handleFiles', () => {
    it('opens multiple files modal for more than one file', () => {
      const { result } = renderHook(() =>
        useEditAlbumForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      const file1 = new File(['image1'], '1.png', { type: 'image/png' });
      const file2 = new File(['image2'], '2.png', { type: 'image/png' });
      const fileList = [file1, file2] as unknown as FileList;
      Object.defineProperty(fileList, 'length', { value: 2 });

      act(() => {
        result.current.handleFiles(fileList);
      });

      expect(result.current.isMultipleFilesModalOpen).toBe(true);
    });

    it('handles dropped single file and updates selected cover', () => {
      const { result } = renderHook(() =>
        useEditAlbumForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      const file1 = new File(['image'], 'single.png', { type: 'image/png' });
      const fileList = [file1] as unknown as FileList;
      Object.defineProperty(fileList, 'length', { value: 1 });

      act(() => {
        result.current.handleFiles(fileList);
      });

      expect(result.current.currentCoverUrl).toBe('blob:test-url');
    });
  });

  describe('handleRemoveCover', () => {
    it('clears cover and sets isCoverRemoved', () => {
      const { result } = renderHook(() =>
        useEditAlbumForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      act(() => {
        result.current.handleRemoveCover();
      });

      expect(result.current.currentCoverUrl).toBeUndefined();
    });

    it('resets file input context when coverInputRef has current', () => {
      const { result } = renderHook(() =>
        useEditAlbumForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      // Mutate ref
      result.current.coverInputRef.current = { value: 'fake-path' } as unknown as HTMLInputElement;

      act(() => {
        result.current.handleRemoveCover();
      });

      expect(result.current.coverInputRef.current.value).toBe('');
    });
  });

  describe('submission', () => {
    it('calls onSubmit with correct arguments', async () => {
      const { result } = renderHook(() =>
        useEditAlbumForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      await act(async () => {
        result.current.form.handleSubmit();
      });

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ name: mockAlbum.name }),
          undefined,
          false,
        );
      });
    });

    it('calls onSubmit with isCoverRemoved when cover is removed', async () => {
      const { result } = renderHook(() =>
        useEditAlbumForm({ album: mockAlbum, onSubmit: mockOnSubmit }),
      );

      act(() => {
        result.current.handleRemoveCover();
      });

      await act(async () => {
        result.current.form.handleSubmit();
      });

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ coverId: null }),
          undefined,
          true,
        );
      });
    });
  });
});
