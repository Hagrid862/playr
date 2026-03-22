import * as contracts from '@repo/contracts';
import { customRenderHook } from '@repo/testing/web';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { useCreateAlbumForm } from './useCreateAlbumForm';

vi.mock('@repo/contracts', async (importOriginal) => {
  const actual = await importOriginal<typeof contracts>();
  return {
    ...actual,
    CreateLibraryAlbumRequestSchema: {
      ...actual.CreateLibraryAlbumRequestSchema,
      safeParse: vi.fn(actual.CreateLibraryAlbumRequestSchema.safeParse),
    },
  };
});

describe('useCreateAlbumForm', () => {
  const artistId = 'artist-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = customRenderHook(() => useCreateAlbumForm(artistId));

    expect(result.current.formData).toEqual({
      name: '',
      description: '',
      type: 'album',
      artistId: artistId,
      releaseDate: null,
    });
    expect(result.current.touched).toEqual({});
    expect(result.current.errors).toEqual({
      name: 'Album name is required',
    });
    expect(result.current.isFormValid).toBe(false);
  });

  it('should handle changes and updating validation', () => {
    const { result } = customRenderHook(() => useCreateAlbumForm(artistId));

    act(() => {
      result.current.handleChange('name', 'Nevermind');
    });

    expect(result.current.formData.name).toBe('Nevermind');
    expect(result.current.errors.name).toBeUndefined();
    expect(result.current.isFormValid).toBe(true);

    act(() => {
      result.current.handleChange('type', 'single');
    });
    expect(result.current.formData.type).toBe('single');

    act(() => {
      result.current.handleChange('description', 'A great album');
    });
    expect(result.current.formData.description).toBe('A great album');

    const date = new Date();
    act(() => {
      result.current.handleChange('releaseDate', date);
    });
    expect(result.current.formData.releaseDate).toBe(date);
    expect(result.current.errors.releaseDate).toBeUndefined();
  });

  it('should handle field blur', () => {
    const { result } = customRenderHook(() => useCreateAlbumForm(artistId));

    act(() => {
      result.current.handleBlur('name');
    });

    expect(result.current.touched.name).toBe(true);
    expect(result.current.getFieldError('name')).toBe('Album name is required');

    expect(result.current.touched.description).toBeUndefined();
    expect(result.current.getFieldError('description')).toBeUndefined();
  });

  it('should show all errors and touch all fields on submit failure', () => {
    const { result } = customRenderHook(() => useCreateAlbumForm(artistId));

    let submitData: ReturnType<typeof result.current.handleSubmit> = null;
    act(() => {
      submitData = result.current.handleSubmit();
    });

    expect(submitData).toBeNull();
    expect(result.current.touched).toEqual({
      name: true,
      description: true,
      type: true,
      artistId: true,
      releaseDate: true,
    });
    expect(result.current.errors.name).toBe('Album name is required');
  });

  it('should return valid data on successful submit', () => {
    const { result } = customRenderHook(() => useCreateAlbumForm(artistId));

    act(() => {
      result.current.handleChange('name', 'In Utero');
    });

    let submitData: ReturnType<typeof result.current.handleSubmit> = null;
    act(() => {
      submitData = result.current.handleSubmit();
    });

    expect(submitData).toEqual({
      name: 'In Utero',
      description: '',
      type: 'album',
      artistId: artistId,
      releaseDate: null,
    });
  });

  it('should handle Zod validation constraints', () => {
    const { result } = customRenderHook(() => useCreateAlbumForm(artistId));

    act(() => {
      result.current.handleChange('name', 'a'.repeat(256));
    });
    expect(result.current.errors.name).toBe('Album name must be 255 characters or less');

    act(() => {
      result.current.handleChange('name', 'Valid name');
      result.current.handleChange('description', 'a'.repeat(2049));
    });
    expect(result.current.errors.description).toBe('Description must be 2048 characters or less');
  });

  it('should update validation state when fields depend on each other (if applicable)', () => {
    const { result } = customRenderHook(() => useCreateAlbumForm(artistId));

    expect(result.current.isFormValid).toBe(false);

    act(() => {
      result.current.handleChange('name', 'Valid Album');
    });

    expect(result.current.isFormValid).toBe(true);

    act(() => {
      result.current.handleChange('name', '');
    });

    expect(result.current.isFormValid).toBe(false);
  });

  it('should ignore validation issues with invalid paths', () => {
    const mockSafeParse = vi.mocked(contracts.CreateLibraryAlbumRequestSchema.safeParse);

    // We want to test how useCreateAlbumForm handles unexpected/invalid paths in Zod issues.
    // We let Zod create a real error and then manipulate its issues array.
    // Use a payload that is completely valid EXCEPT for 'name',
    // so we know exactly which legit errors should exist.
    const validData: contracts.CreateLibraryAlbumRequest = {
      name: '', // Invalid: required
      description: 'Test description',
      type: 'album',
      artistId: 'artist-123',
      releaseDate: null,
    };

    const realResult = contracts.CreateLibraryAlbumRequestSchema.safeParse(validData);
    if (realResult.success) throw new Error('Expected validation failure');

    // Manually create a ZodError to get valid issue objects
    const extraError = new z.ZodError([
      { code: 'custom', path: [], message: 'Root error' },
      { code: 'custom', path: [123], message: 'Index error' },
      { code: 'custom', path: ['nonExistentField'], message: 'Unknown field' },
    ]);

    // Merge issues into the error object
    realResult.error.issues.push(...extraError.issues);

    mockSafeParse.mockReturnValueOnce(realResult);

    const { result } = customRenderHook(() => useCreateAlbumForm(artistId));

    // The issues with invalid paths should be filtered out, only 'name' should persist.
    // Since we provided valid data for everything else, 'name' should be the only key in errors.
    expect(result.current.errors).toHaveProperty('name');
    expect(Object.keys(result.current.errors)).toHaveLength(1);
  });
});
