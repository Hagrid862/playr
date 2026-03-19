import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLoginForm } from './useLoginForm';

describe('useLoginForm', () => {
  describe('initialization', () => {
    it('initializes with empty form data', () => {
      const { result } = renderHook(() => useLoginForm());
      expect(result.current.formData).toEqual({
        email: '',
        password: '',
      });
      expect(result.current.isFormValid).toBe(false);
    });
  });

  describe('handleChange', () => {
    it('updates form data on change', () => {
      const { result } = renderHook(() => useLoginForm());

      act(() => {
        result.current.handleChange('email', 'test@example.com');
      });

      expect(result.current.formData.email).toBe('test@example.com');
    });
  });

  describe('validation', () => {
    it('validates email format', () => {
      const { result } = renderHook(() => useLoginForm());

      act(() => {
        result.current.handleChange('email', 'invalid-email');
      });

      expect(result.current.errors.email).toBeDefined();
    });

    it('validates required fields', () => {
      const { result } = renderHook(() => useLoginForm());

      let submitResult;
      act(() => {
        submitResult = result.current.handleSubmit();
      });

      expect(submitResult).toBeNull();
      expect(result.current.touched.email).toBe(true);
      expect(result.current.touched.password).toBe(true);
    });
  });

  describe('submit', () => {
    it('submits valid data', () => {
      const { result } = renderHook(() => useLoginForm());

      act(() => {
        result.current.handleChange('email', 'user@example.com');
        result.current.handleChange('password', 'Password123!');
      });

      expect(result.current.isFormValid).toBe(true);

      let submitResult;
      act(() => {
        submitResult = result.current.handleSubmit();
      });

      expect(submitResult).toEqual(
        expect.objectContaining({
          email: 'user@example.com',
          password: 'Password123!',
        }),
      );
    });
  });

  describe('blur and getFieldError', () => {
    it('handles blur and shows errors correctly', () => {
      const { result } = renderHook(() => useLoginForm());

      act(() => {
        result.current.handleChange('email', 'invalid');
      });

      expect(result.current.errors.email).toBeDefined();
      expect(result.current.getFieldError('email')).toBeUndefined();

      act(() => {
        result.current.handleBlur('email');
      });

      expect(result.current.touched.email).toBe(true);
      expect(result.current.getFieldError('email')).toBeDefined();
    });
  });
});
