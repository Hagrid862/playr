import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLoginForm } from './useLoginForm';

describe('useLoginForm', () => {
  it('initializes with empty form data', () => {
    const { result } = renderHook(() => useLoginForm());
    expect(result.current.formData).toEqual({
      email: '',
      password: '',
    });
    expect(result.current.isFormValid).toBe(false);
  });

  it('updates form data on change', () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.handleChange('email', 'test@example.com');
    });

    expect(result.current.formData.email).toBe('test@example.com');
  });

  it('validates email format', () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.handleChange('email', 'invalid-email');
    });

    expect(result.current.errors.email).toBeDefined();
  });

  it('validates required fields', () => {
    const { result } = renderHook(() => useLoginForm());

    // Attempt submit with empty fields
    let submitResult;
    act(() => {
      submitResult = result.current.handleSubmit();
    });

    expect(submitResult).toBeNull();
    expect(result.current.touched.email).toBe(true);
    expect(result.current.touched.password).toBe(true);
  });

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

  it('handles blur and shows errors correctly', () => {
    const { result } = renderHook(() => useLoginForm());

    act(() => {
      result.current.handleChange('email', 'invalid');
    });

    // Error exists but field not touched, so getFieldError should be undefined
    expect(result.current.errors.email).toBeDefined();
    expect(result.current.getFieldError('email')).toBeUndefined();

    act(() => {
      result.current.handleBlur('email');
    });

    // Now touched, should show error
    expect(result.current.touched.email).toBe(true);
    expect(result.current.getFieldError('email')).toBeDefined();
  });
});
