import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useForgotPasswordForm } from './useForgotPasswordForm';

describe('useForgotPasswordForm', () => {
  it('initializes with empty email when no argument is provided', () => {
    const { result } = renderHook(() => useForgotPasswordForm());
    expect(result.current.formData).toEqual({ email: '' });
  });

  it('initializes with provided email', () => {
    const { result } = renderHook(() => useForgotPasswordForm('user@example.com'));
    expect(result.current.formData).toEqual({ email: 'user@example.com' });
  });

  it('updates formData when handleChange is called', () => {
    const { result } = renderHook(() => useForgotPasswordForm());
    act(() => {
      result.current.handleChange('email', 'test@example.com');
    });
    expect(result.current.formData.email).toBe('test@example.com');
  });

  it('updates touched when handleBlur is called', () => {
    const { result } = renderHook(() => useForgotPasswordForm());
    act(() => {
      result.current.handleBlur('email');
    });
    expect(result.current.touched).toEqual({ email: true });
  });

  it('has errors for empty email', () => {
    const { result } = renderHook(() => useForgotPasswordForm());
    expect(result.current.errors.email).toBeDefined();
  });

  it('has errors for invalid email format', () => {
    const { result } = renderHook(() => useForgotPasswordForm());
    act(() => {
      result.current.handleChange('email', 'not-an-email');
    });
    expect(result.current.errors.email).toBeDefined();
  });

  it('has no errors for valid email', () => {
    const { result } = renderHook(() => useForgotPasswordForm());
    act(() => {
      result.current.handleChange('email', 'valid@example.com');
    });
    expect(result.current.errors).toEqual({});
  });

  it('returns isFormValid false when there are errors', () => {
    const { result } = renderHook(() => useForgotPasswordForm());
    expect(result.current.isFormValid).toBe(false);
  });

  it('returns isFormValid true when there are no errors', () => {
    const { result } = renderHook(() => useForgotPasswordForm());
    act(() => {
      result.current.handleChange('email', 'valid@example.com');
    });
    expect(result.current.isFormValid).toBe(true);
  });

  it('handleSubmit sets all fields as touched', () => {
    const { result } = renderHook(() => useForgotPasswordForm());
    act(() => {
      result.current.handleSubmit();
    });
    expect(result.current.touched).toEqual({ email: true });
  });

  it('handleSubmit returns null for invalid formData', () => {
    const { result } = renderHook(() => useForgotPasswordForm());
    let submitResult: ReturnType<typeof result.current.handleSubmit>;
    act(() => {
      submitResult = result.current.handleSubmit();
    });
    expect(submitResult!).toBeNull();
  });

  it('handleSubmit returns parsed data for valid formData', () => {
    const { result } = renderHook(() => useForgotPasswordForm('user@EXAMPLE.COM'));
    let submitResult: ReturnType<typeof result.current.handleSubmit>;
    act(() => {
      submitResult = result.current.handleSubmit();
    });
    expect(submitResult!).toEqual({ email: 'user@example.com' });
  });

  it('getFieldError returns undefined when field is not touched', () => {
    const { result } = renderHook(() => useForgotPasswordForm());
    expect(result.current.getFieldError('email')).toBeUndefined();
  });

  it('getFieldError returns error message when field is touched and invalid', () => {
    const { result } = renderHook(() => useForgotPasswordForm());
    act(() => {
      result.current.handleBlur('email');
    });
    expect(result.current.getFieldError('email')).toBeDefined();
  });

  it('getFieldError returns undefined when field is touched and valid', () => {
    const { result } = renderHook(() => useForgotPasswordForm());
    act(() => {
      result.current.handleChange('email', 'valid@example.com');
      result.current.handleBlur('email');
    });
    expect(result.current.getFieldError('email')).toBeUndefined();
  });

  it('allows setTouched to be called directly', () => {
    const { result } = renderHook(() => useForgotPasswordForm());
    act(() => {
      result.current.setTouched({ email: true });
    });
    expect(result.current.touched).toEqual({ email: true });
  });
});
