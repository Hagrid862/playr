import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useRecoverPasswordForm } from './useRecoverPasswordForm';

describe('useRecoverPasswordForm', () => {
  it('initializes with empty form data', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    expect(result.current.formData).toEqual({
      email: '',
      otpCode: '',
      newPassword: '',
      confirmPassword: '',
    });
  });

  it('initializes with empty touched state', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    expect(result.current.touched).toEqual({});
  });

  it('initializes isPasswordFocused as false', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    expect(result.current.isPasswordFocused).toBe(false);
  });

  it('updates formData when handleChange is called', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    act(() => {
      result.current.handleChange('email', 'test@example.com');
    });
    expect(result.current.formData.email).toBe('test@example.com');
  });

  it('updates multiple fields via handleChange', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    act(() => {
      result.current.handleChange('otpCode', '12345678');
      result.current.handleChange('newPassword', 'Secret1!');
      result.current.handleChange('confirmPassword', 'Secret1!');
    });
    expect(result.current.formData.otpCode).toBe('12345678');
    expect(result.current.formData.newPassword).toBe('Secret1!');
    expect(result.current.formData.confirmPassword).toBe('Secret1!');
  });

  it('updates touched when handleBlur is called', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    act(() => {
      result.current.handleBlur('email');
    });
    expect(result.current.touched.email).toBe(true);
  });

  it('has errors for empty form data', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);
  });

  it('has email error for invalid email', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    act(() => {
      result.current.handleChange('email', 'not-an-email');
    });
    expect(result.current.errors.email).toBeDefined();
  });

  it('has otpCode error for non-digit characters', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    act(() => {
      result.current.handleChange('otpCode', 'abcdefgh');
    });
    expect(result.current.errors.otpCode).toBeDefined();
  });

  it('has otpCode error for wrong length', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    act(() => {
      result.current.handleChange('otpCode', '1234');
    });
    expect(result.current.errors.otpCode).toBeDefined();
  });

  it('has newPassword error for too short password', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    act(() => {
      result.current.handleChange('newPassword', 'Short1');
    });
    expect(result.current.errors.newPassword).toBeDefined();
  });

  it('has newPassword error for missing uppercase', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    act(() => {
      result.current.handleChange('newPassword', 'secret123');
    });
    expect(result.current.errors.newPassword).toBeDefined();
  });

  it('has newPassword error for missing lowercase', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    act(() => {
      result.current.handleChange('newPassword', 'SECRET123');
    });
    expect(result.current.errors.newPassword).toBeDefined();
  });

  it('has newPassword error for missing number', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    act(() => {
      result.current.handleChange('newPassword', 'SecretPass');
    });
    expect(result.current.errors.newPassword).toBeDefined();
  });

  it('has confirmPassword error when passwords do not match', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    act(() => {
      result.current.handleChange('newPassword', 'Secret1!');
      result.current.handleChange('confirmPassword', 'Different1!');
    });
    expect(result.current.errors.confirmPassword).toBe("Passwords don't match");
  });

  it('has no errors for fully valid form data', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    act(() => {
      result.current.handleChange('email', 'user@example.com');
      result.current.handleChange('otpCode', '12345678');
      result.current.handleChange('newPassword', 'Secret1!');
      result.current.handleChange('confirmPassword', 'Secret1!');
    });
    expect(result.current.errors).toEqual({});
  });

  it('returns isFormValid false when there are errors', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    expect(result.current.isFormValid).toBe(false);
  });

  it('returns isFormValid true when all fields are valid', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    act(() => {
      result.current.handleChange('email', 'user@example.com');
      result.current.handleChange('otpCode', '12345678');
      result.current.handleChange('newPassword', 'Secret1!');
      result.current.handleChange('confirmPassword', 'Secret1!');
    });
    expect(result.current.isFormValid).toBe(true);
  });

  it('handleSubmit sets all fields as touched', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    act(() => {
      result.current.handleSubmit();
    });
    expect(result.current.touched).toEqual({
      email: true,
      otpCode: true,
      newPassword: true,
      confirmPassword: true,
    });
  });

  it('handleSubmit returns null for invalid formData', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    let submitResult: ReturnType<typeof result.current.handleSubmit>;
    act(() => {
      submitResult = result.current.handleSubmit();
    });
    expect(submitResult!).toBeNull();
  });

  it('handleSubmit returns parsed data excluding confirmPassword for valid formData', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    act(() => {
      result.current.handleChange('email', 'user@example.com');
      result.current.handleChange('otpCode', '12345678');
      result.current.handleChange('newPassword', 'Secret1!');
      result.current.handleChange('confirmPassword', 'Secret1!');
    });
    let submitResult: ReturnType<typeof result.current.handleSubmit>;
    act(() => {
      submitResult = result.current.handleSubmit();
    });
    expect(submitResult!).toEqual({
      email: 'user@example.com',
      otpCode: '12345678',
      newPassword: 'Secret1!',
    });
  });

  it('getFieldError returns undefined when field is not touched', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    expect(result.current.getFieldError('email')).toBeUndefined();
    expect(result.current.getFieldError('otpCode')).toBeUndefined();
    expect(result.current.getFieldError('newPassword')).toBeUndefined();
    expect(result.current.getFieldError('confirmPassword')).toBeUndefined();
  });

  it('getFieldError returns error message when field is touched and invalid', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    act(() => {
      result.current.handleBlur('email');
      result.current.handleBlur('otpCode');
    });
    expect(result.current.getFieldError('email')).toBeDefined();
    expect(result.current.getFieldError('otpCode')).toBeDefined();
  });

  it('getFieldError returns undefined when field is touched and valid', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    act(() => {
      result.current.handleChange('email', 'valid@example.com');
      result.current.handleBlur('email');
    });
    expect(result.current.getFieldError('email')).toBeUndefined();
  });

  it('allows setTouched to be called directly', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    act(() => {
      result.current.setTouched({ email: true, otpCode: true });
    });
    expect(result.current.touched).toEqual({ email: true, otpCode: true });
  });

  it('allows setIsPasswordFocused to be called directly', () => {
    const { result } = renderHook(() => useRecoverPasswordForm());
    act(() => {
      result.current.setIsPasswordFocused(true);
    });
    expect(result.current.isPasswordFocused).toBe(true);
    act(() => {
      result.current.setIsPasswordFocused(false);
    });
    expect(result.current.isPasswordFocused).toBe(false);
  });
});
