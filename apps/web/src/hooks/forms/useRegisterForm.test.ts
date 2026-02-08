import { RegisterRequest, RegisterRequestSchema } from '@repo/contracts';
import { act, renderHook } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { useRegisterForm } from './useRegisterForm';

// We might need to mock Date to test age calculations deterministically
const MOCK_DATE = new Date('2024-01-01T12:00:00Z');

vi.mock('@repo/contracts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@repo/contracts')>();
  return {
    ...actual,
    RegisterRequestSchema: {
      ...actual.RegisterRequestSchema,
      safeParse: vi.fn(actual.RegisterRequestSchema.safeParse),
    },
  };
});

describe('useRegisterForm', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(MOCK_DATE);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('initializes with empty form data', () => {
    const { result } = renderHook(() => useRegisterForm());
    expect(result.current.formData).toEqual({
      username: '',
      firstName: '',
      lastName: '',
      birthDate: undefined,
      gender: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
    expect(result.current.isFormValid).toBe(false);
  });

  it('updates form data on change', () => {
    const { result } = renderHook(() => useRegisterForm());

    act(() => {
      result.current.handleChange('username', 'newuser');
    });

    expect(result.current.formData.username).toBe('newuser');
  });

  it('validates username (length too short)', () => {
    const { result } = renderHook(() => useRegisterForm());

    act(() => {
      result.current.handleChange('username', 'ab');
    });

    expect(result.current.errors.username).toBe('Username must be at least 3 characters');
  });

  it('validates username (invalid characters)', () => {
    const { result } = renderHook(() => useRegisterForm());

    act(() => {
      result.current.handleChange('username', 'Invalid User!');
    });

    expect(result.current.errors.username).toBeDefined();
    expect(result.current.errors.username).toContain('contain lowercase letters');
  });

  it('validates age (under 13)', () => {
    const { result } = renderHook(() => useRegisterForm());

    // 2024 - 2015 = 9 years old
    const youngDate = new Date('2015-01-01');

    act(() => {
      result.current.handleChange('birthDate', youngDate);
    });

    expect(result.current.errors.birthDate).toContain('must be at least 13 years old');
  });

  it('validates valid age (over 13)', () => {
    const { result } = renderHook(() => useRegisterForm());

    // 2024 - 2000 = 24 years old
    const oldEnough = new Date('2000-01-01');

    act(() => {
      result.current.handleChange('birthDate', oldEnough);
    });

    expect(result.current.errors.birthDate).toBeUndefined();
  });

  it('validates email format', () => {
    const { result } = renderHook(() => useRegisterForm());

    act(() => {
      result.current.handleChange('email', 'not-an-email');
    });

    expect(result.current.errors.email).toBe('Invalid email address');
  });

  it('validates password complexity (too short)', () => {
    const { result } = renderHook(() => useRegisterForm());

    act(() => {
      result.current.handleChange('password', 'Short1!');
    });

    expect(result.current.errors.password).toBe('Password must be at least 8 characters');
  });

  it('validates password complexity (missing uppercase)', () => {
    const { result } = renderHook(() => useRegisterForm());

    act(() => {
      result.current.handleChange('password', 'password123!');
    });

    expect(result.current.errors.password).toBe(
      'Password must contain at least one uppercase letter',
    );
  });

  it('validates password complexity (missing lowercase)', () => {
    const { result } = renderHook(() => useRegisterForm());

    act(() => {
      result.current.handleChange('password', 'PASSWORD123!');
    });

    expect(result.current.errors.password).toBe(
      'Password must contain at least one lowercase letter',
    );
  });

  it('validates password complexity (missing number)', () => {
    const { result } = renderHook(() => useRegisterForm());

    act(() => {
      result.current.handleChange('password', 'Password!');
    });

    expect(result.current.errors.password).toBe('Password must contain at least one number');
  });

  it('validates password matching', () => {
    const { result } = renderHook(() => useRegisterForm());

    act(() => {
      result.current.handleChange('password', 'Password123');
      result.current.handleChange('confirmPassword', 'Password124');
    });

    expect(result.current.errors.confirmPassword).toBe('Passwords do not match');
  });

  it('marks fields as touched on blur', () => {
    const { result } = renderHook(() => useRegisterForm());

    act(() => {
      result.current.handleBlur('username');
    });

    expect(result.current.touched.username).toBe(true);
  });
  it('validates username max length', () => {
    const { result } = renderHook(() => useRegisterForm());
    act(() => {
      result.current.handleChange('username', 'a'.repeat(33));
    });
    expect(result.current.errors.username).toBe('Username must be at most 32 characters');
  });

  it('validates first name required and max length', () => {
    const { result } = renderHook(() => useRegisterForm());
    act(() => {
      result.current.handleChange('firstName', '');
    });
    expect(result.current.errors.firstName).toBe('First name is required');

    act(() => {
      result.current.handleChange('firstName', 'a'.repeat(33));
    });
    expect(result.current.errors.firstName).toBe('First name must be at most 32 characters');
  });

  it('validates last name required and max length', () => {
    const { result } = renderHook(() => useRegisterForm());
    act(() => {
      result.current.handleChange('lastName', '');
    });
    expect(result.current.errors.lastName).toBe('Last name is required');

    act(() => {
      result.current.handleChange('lastName', 'a'.repeat(33));
    });
    expect(result.current.errors.lastName).toBe('Last name must be at most 32 characters');
  });

  it('validates email max length', () => {
    const { result } = renderHook(() => useRegisterForm());
    act(() => {
      // 257 chars total
      result.current.handleChange('email', 'a'.repeat(247) + '@example.com');
    });
    expect(result.current.errors.email).toBe('Email must be at most 256 characters');
  });

  it('validates password max length', () => {
    const { result } = renderHook(() => useRegisterForm());
    act(() => {
      // 129 chars
      result.current.handleChange('password', 'A1!' + 'a'.repeat(126));
    });
    expect(result.current.errors.password).toBe('Password must be at most 128 characters');
  });

  it('validates birth date in future', () => {
    const { result } = renderHook(() => useRegisterForm());
    const futureDate = new Date(MOCK_DATE);
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    act(() => {
      result.current.handleChange('birthDate', futureDate);
    });
    expect(result.current.errors.birthDate).toBe('Birth date cannot be in the future');
  });

  it('validates exactly 13 years old (allowed)', () => {
    const { result } = renderHook(() => useRegisterForm());
    // MOCK_DATE is 2024-01-01
    // 13 years ago is 2011-01-01
    const exactAge = new Date('2011-01-01');

    act(() => {
      result.current.handleChange('birthDate', exactAge);
    });
    expect(result.current.errors.birthDate).toBeUndefined();
  });

  it('validates 1 day less than 13 years old (not allowed)', () => {
    const { result } = renderHook(() => useRegisterForm());
    // 2011-01-02 means they are not yet 13 on 2024-01-01
    const almost13 = new Date('2011-01-02');

    act(() => {
      result.current.handleChange('birthDate', almost13);
    });
    expect(result.current.errors.birthDate).toContain('must be at least 13 years old');
  });

  it('handles password focus state', () => {
    const { result } = renderHook(() => useRegisterForm());

    expect(result.current.isPasswordFocused).toBe(false);

    act(() => {
      result.current.setIsPasswordFocused(true);
    });
    expect(result.current.isPasswordFocused).toBe(true);

    // Verify showPasswordError logic
    // Needs touched + error + not focused to be true
    act(() => {
      result.current.handleChange('password', 'weak'); // creates error
      result.current.handleBlur('password'); // touches it
    });

    // It is focused, so error should be hidden
    expect(result.current.showPasswordError).toBe(false);

    act(() => {
      result.current.setIsPasswordFocused(false);
    });
    // Now not focused, error should show
    expect(result.current.showPasswordError).toBe(true);
  });

  it('handleSubmit fails if form is invalid', () => {
    const { result } = renderHook(() => useRegisterForm());
    // Form initialized empty = invalid
    let submitResult: RegisterRequest | null = null;
    act(() => {
      submitResult = result.current.handleSubmit();
    });

    expect(submitResult).toBeNull();
    // Should touch all fields
    expect(result.current.touched.username).toBe(true);
    expect(result.current.touched.email).toBe(true);
  });

  it('blocks submission if gender is missing', () => {
    const { result } = renderHook(() => useRegisterForm());

    // Fill everything properly except gender
    const partialData = {
      username: 'ValidUser',
      firstName: 'John',
      lastName: 'Doe',
      birthDate: new Date('2000-01-01'),
      email: 'test@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    };

    act(() => {
      result.current.handleChange('username', partialData.username);
      result.current.handleChange('firstName', partialData.firstName);
      result.current.handleChange('lastName', partialData.lastName);
      result.current.handleChange('birthDate', partialData.birthDate);
      // gender left empty
      result.current.handleChange('email', partialData.email);
      result.current.handleChange('password', partialData.password);
      result.current.handleChange('confirmPassword', partialData.confirmPassword);
    });

    expect(result.current.isFormValid).toBe(false);

    let submitResult: RegisterRequest | null = null;
    act(() => {
      submitResult = result.current.handleSubmit();
    });

    expect(submitResult).toBeNull();
  });

  it('handleSubmit returns formatted data if valid', () => {
    const { result } = renderHook(() => useRegisterForm());
    const validData = {
      username: 'ValidUser', // Mixed case to test sanitization
      firstName: '  John  ', // Whitespace to test trim
      lastName: '  Doe  ', // Whitespace to test trim
      birthDate: new Date('2000-01-01'),
      gender: 'male',
      email: 'Test@Example.com', // Mixed case
      password: 'Password123!',
      confirmPassword: 'Password123!',
    };

    act(() => {
      result.current.handleChange('username', validData.username);
      result.current.handleChange('firstName', validData.firstName);
      result.current.handleChange('lastName', validData.lastName);
      result.current.handleChange('birthDate', validData.birthDate);
      result.current.handleChange('gender', validData.gender);
      result.current.handleChange('email', validData.email);
      result.current.handleChange('password', validData.password);
      result.current.handleChange('confirmPassword', validData.confirmPassword);
    });

    let submitResult: RegisterRequest | null = null;

    act(() => {
      submitResult = result.current.handleSubmit();
    });

    expect(submitResult).toEqual(
      expect.objectContaining({
        username: 'validuser',
        firstName: 'John',
        lastName: 'Doe',
        email: 'test@example.com',
        gender: 'male',
        password: 'Password123!',
      }),
    );
  });

  it('handleSubmit returns null if validation fails (defensive check)', async () => {
    const { result } = renderHook(() => useRegisterForm());

    // Fill with valid data first to pass checkFormValid()
    act(() => {
      result.current.handleChange('username', 'testuser');
      result.current.handleChange('firstName', 'Test');
      result.current.handleChange('lastName', 'User');
      result.current.handleChange('email', 'test@example.com');
      result.current.handleChange('password', 'Password123!');
      result.current.handleChange('confirmPassword', 'Password123!');
      result.current.handleChange('birthDate', new Date('2000-01-01'));
      result.current.handleChange('gender', 'male');
    });

    const safeParseSpy = vi
      .spyOn(RegisterRequestSchema, 'safeParse')
      .mockImplementation((data: unknown) => {
        const input = data as RegisterRequest;
        if (input.password) {
          return {
            success: false,
            error: new z.ZodError([]),
          } as z.ZodSafeParseResult<RegisterRequest>;
        }
        return {
          success: true,
          data: input,
        } as z.ZodSafeParseResult<RegisterRequest>;
      });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let submitResult;
    act(() => {
      submitResult = result.current.handleSubmit();
    });

    expect(submitResult).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('Validation failed:', expect.anything());

    safeParseSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});
