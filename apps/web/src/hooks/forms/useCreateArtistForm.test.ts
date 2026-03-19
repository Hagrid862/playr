import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCreateArtistForm } from './useCreateArtistForm';

describe('useCreateArtistForm', () => {
  describe('initialization', () => {
    it('initializes with default values', () => {
      const { result } = renderHook(() => useCreateArtistForm());

      expect(result.current.formData).toEqual({ name: '', description: '' });
      expect(result.current.touched).toEqual({});
      expect(result.current.errors).toEqual({
        name: 'Artist name is required',
      });
      expect(result.current.isFormValid).toBe(false);
    });
  });

  describe('handleChange', () => {
    it('handles changes', () => {
      const { result } = renderHook(() => useCreateArtistForm());

      act(() => {
        result.current.handleChange('name', 'Nirvana');
      });

      expect(result.current.formData.name).toBe('Nirvana');
      expect(result.current.errors.name).toBeUndefined();
      expect(result.current.isFormValid).toBe(true);

      act(() => {
        result.current.handleChange('description', 'Grunge band');
      });

      expect(result.current.formData.description).toBe('Grunge band');
    });
  });

  describe('blur and getFieldError', () => {
    it('handles blur', () => {
      const { result } = renderHook(() => useCreateArtistForm());

      act(() => {
        result.current.handleBlur('name');
      });

      expect(result.current.touched.name).toBe(true);
      expect(result.current.getFieldError('name')).toBe('Artist name is required');
    });

    it('returns undefined for field error if not touched', () => {
      const { result } = renderHook(() => useCreateArtistForm());
      expect(result.current.getFieldError('name')).toBeUndefined();
    });
  });

  describe('submit', () => {
    it('validates form and show all errors on submit', () => {
      const { result } = renderHook(() => useCreateArtistForm());

      let submitResult;
      act(() => {
        submitResult = result.current.handleSubmit();
      });

      expect(submitResult).toBeNull();
      expect(result.current.touched).toEqual({ name: true, description: true });
      expect(result.current.getFieldError('name')).toBe('Artist name is required');
    });

    it('returns data on successful submit', () => {
      const { result } = renderHook(() => useCreateArtistForm());

      act(() => {
        result.current.handleChange('name', 'Nirvana');
      });

      let submitResult;
      act(() => {
        submitResult = result.current.handleSubmit();
      });

      expect(submitResult).toEqual({ name: 'Nirvana', description: '' });
    });
  });

  describe('validation limits', () => {
    it('handles complex validation errors', () => {
      const { result } = renderHook(() => useCreateArtistForm());

      act(() => {
        result.current.handleChange('name', 'a'.repeat(300));
      });

      expect(result.current.errors.name).toBeDefined();

      act(() => {
        result.current.handleChange('description', 'a'.repeat(3000));
      });

      expect(result.current.errors.description).toBe('Description must be 2048 characters or less');
    });
  });
});
