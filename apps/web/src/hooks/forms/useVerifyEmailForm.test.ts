import { renderHook, act } from '@testing-library/react';
import { useVerifyEmailForm } from './useVerifyEmailForm';
import { describe, it, expect } from 'vitest';

describe('useVerifyEmailForm', () => {
  it('should initialize with provided email', () => {
    const { result } = renderHook(() => useVerifyEmailForm('test@example.com'));
    expect(result.current.formData.email).toBe('test@example.com');
    expect(result.current.formData.otpCode).toBe('');
  });

  it('should update otpCode on change', () => {
    const { result } = renderHook(() => useVerifyEmailForm('test@example.com'));

    act(() => {
      result.current.handleChange('otpCode', '12345678');
    });

    expect(result.current.formData.otpCode).toBe('12345678');
  });

  it('should validate form correctly', () => {
    const { result } = renderHook(() => useVerifyEmailForm('test@example.com'));

    expect(result.current.isFormValid).toBe(false); // otpCode is empty

    act(() => {
      result.current.handleChange('otpCode', '12345678');
    });

    expect(result.current.isFormValid).toBe(true);
  });

  it('should show errors only after blur or submit', () => {
    const { result } = renderHook(() => useVerifyEmailForm('test@example.com'));

    expect(result.current.getFieldError('otpCode')).toBeUndefined();

    act(() => {
      result.current.handleBlur('otpCode');
    });

    expect(result.current.getFieldError('otpCode')).toBeDefined();
  });

  it('should return data on successful submit', () => {
    const { result } = renderHook(() => useVerifyEmailForm('test@example.com'));

    act(() => {
      result.current.handleChange('otpCode', '12345678');
    });

    let data;
    act(() => {
      data = result.current.handleSubmit();
    });

    expect(data).toEqual({
      email: 'test@example.com',
      otpCode: '12345678',
    });
  });

  it('should return null on unsuccessful submit', () => {
    const { result } = renderHook(() => useVerifyEmailForm('test@example.com'));

    let data;
    act(() => {
      data = result.current.handleSubmit();
    });

    expect(data).toBeNull();
  });
});
