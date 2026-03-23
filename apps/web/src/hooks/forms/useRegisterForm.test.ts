import { RegisterRequest, RegisterRequestSchema } from '@repo/contracts';
import { customRenderHook } from '@repo/testing/web';
import { act } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  MockInstance,
  vi,
} from 'vitest';
import { z } from 'zod';
import { useRegisterForm } from './useRegisterForm';

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

const MOCK_DATE = new Date('2024-01-01T12:00:00Z');

describe('useRegisterForm', () => {
  // Fixed "today" so birthDate / age refinements in RegisterRequestSchema are deterministic.
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(MOCK_DATE);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('initializes with empty form data', () => {
      const { result } = customRenderHook(() => useRegisterForm());
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
  });

  describe('handleChange', () => {
    it('updates form data on change', () => {
      const { result } = customRenderHook(() => useRegisterForm());

      act(() => {
        result.current.handleChange('username', 'newuser');
      });

      expect(result.current.formData.username).toBe('newuser');
    });
  });

  describe('username', () => {
    it('validates length too short', () => {
      const { result } = customRenderHook(() => useRegisterForm());

      act(() => {
        result.current.handleChange('username', 'ab');
      });

      expect(result.current.errors.username).toBe('Username must be at least 3 characters');
    });

    it('validates invalid characters', () => {
      const { result } = customRenderHook(() => useRegisterForm());

      act(() => {
        result.current.handleChange('username', 'Invalid User!');
      });

      expect(result.current.errors.username).toBeDefined();
      expect(result.current.errors.username).toContain('contain lowercase letters');
    });

    it('validates max length', () => {
      const { result } = customRenderHook(() => useRegisterForm());
      act(() => {
        result.current.handleChange('username', 'a'.repeat(33));
      });
      expect(result.current.errors.username).toBe('Username must be at most 32 characters');
    });
  });

  describe('name fields', () => {
    it('validates first name required and max length', () => {
      const { result } = customRenderHook(() => useRegisterForm());
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
      const { result } = customRenderHook(() => useRegisterForm());
      act(() => {
        result.current.handleChange('lastName', '');
      });
      expect(result.current.errors.lastName).toBe('Last name is required');

      act(() => {
        result.current.handleChange('lastName', 'a'.repeat(33));
      });
      expect(result.current.errors.lastName).toBe('Last name must be at most 32 characters');
    });
  });

  describe('birthDate and age', () => {
    it('validates under 13', () => {
      const { result } = customRenderHook(() => useRegisterForm());
      const youngDate = new Date('2015-01-01');

      act(() => {
        result.current.handleChange('birthDate', youngDate);
      });

      expect(result.current.errors.birthDate).toContain('must be at least 13 years old');
    });

    it('validates valid age over 13', () => {
      const { result } = customRenderHook(() => useRegisterForm());
      const oldEnough = new Date('2000-01-01');

      act(() => {
        result.current.handleChange('birthDate', oldEnough);
      });

      expect(result.current.errors.birthDate).toBeUndefined();
    });

    it('validates birth date in future', () => {
      const { result } = customRenderHook(() => useRegisterForm());
      const futureDate = new Date(MOCK_DATE);
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      act(() => {
        result.current.handleChange('birthDate', futureDate);
      });
      expect(result.current.errors.birthDate).toBe('Birth date cannot be in the future');
    });

    it('allows exactly 13 years old', () => {
      const { result } = customRenderHook(() => useRegisterForm());
      const exactAge = new Date('2011-01-01');

      act(() => {
        result.current.handleChange('birthDate', exactAge);
      });
      expect(result.current.errors.birthDate).toBeUndefined();
    });

    it('rejects 1 day less than 13 years old', () => {
      const { result } = customRenderHook(() => useRegisterForm());
      const almost13 = new Date('2011-01-02');

      act(() => {
        result.current.handleChange('birthDate', almost13);
      });
      expect(result.current.errors.birthDate).toContain('must be at least 13 years old');
    });
  });

  describe('email', () => {
    it('validates email format', () => {
      const { result } = customRenderHook(() => useRegisterForm());

      act(() => {
        result.current.handleChange('email', 'not-an-email');
      });

      expect(result.current.errors.email).toBe('Invalid email address');
    });

    it('validates email max length', () => {
      const { result } = customRenderHook(() => useRegisterForm());
      act(() => {
        result.current.handleChange('email', 'a'.repeat(247) + '@example.com');
      });
      expect(result.current.errors.email).toBe('Email must be at most 256 characters');
    });
  });

  describe('password and confirmPassword', () => {
    it('validates password too short', () => {
      const { result } = customRenderHook(() => useRegisterForm());

      act(() => {
        result.current.handleChange('password', 'Short1!');
      });

      expect(result.current.errors.password).toBe('Password must be at least 8 characters');
    });

    it('validates missing uppercase', () => {
      const { result } = customRenderHook(() => useRegisterForm());

      act(() => {
        result.current.handleChange('password', 'password123!');
      });

      expect(result.current.errors.password).toBe(
        'Password must contain at least one uppercase letter',
      );
    });

    it('validates missing lowercase', () => {
      const { result } = customRenderHook(() => useRegisterForm());

      act(() => {
        result.current.handleChange('password', 'PASSWORD123!');
      });

      expect(result.current.errors.password).toBe(
        'Password must contain at least one lowercase letter',
      );
    });

    it('validates missing number', () => {
      const { result } = customRenderHook(() => useRegisterForm());

      act(() => {
        result.current.handleChange('password', 'Password!');
      });

      expect(result.current.errors.password).toBe('Password must contain at least one number');
    });

    it('validates password matching', () => {
      const { result } = customRenderHook(() => useRegisterForm());

      act(() => {
        result.current.handleChange('password', 'Password123');
        result.current.handleChange('confirmPassword', 'Password124');
      });

      expect(result.current.errors.confirmPassword).toBe('Passwords do not match');
    });

    it('validates password max length', () => {
      const { result } = customRenderHook(() => useRegisterForm());
      act(() => {
        result.current.handleChange('password', 'A1!' + 'a'.repeat(126));
      });
      expect(result.current.errors.password).toBe('Password must be at most 128 characters');
    });
  });

  describe('gender', () => {
    it('blocks submission if gender is missing', () => {
      const { result } = customRenderHook(() => useRegisterForm());

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
        result.current.handleChange('email', partialData.email);
        result.current.handleChange('password', partialData.password);
        result.current.handleChange('confirmPassword', partialData.confirmPassword);
      });

      expect(result.current.isFormValid).toBe(false);
      expect(result.current.errors.gender).toBeDefined();

      let submitResult: RegisterRequest | null = null;
      act(() => {
        submitResult = result.current.handleSubmit();
      });

      expect(submitResult).toBeNull();
      expect(result.current.touched.gender).toBe(true);
      expect(result.current.errors.gender).toBeDefined();
    });
  });

  describe('password focus UX', () => {
    it('handles password focus state and showPasswordError', () => {
      const { result } = customRenderHook(() => useRegisterForm());

      expect(result.current.isPasswordFocused).toBe(false);

      act(() => {
        result.current.setIsPasswordFocused(true);
      });
      expect(result.current.isPasswordFocused).toBe(true);

      act(() => {
        result.current.handleChange('password', 'weak');
        result.current.handleBlur('password');
      });

      expect(result.current.showPasswordError).toBe(false);

      act(() => {
        result.current.setIsPasswordFocused(false);
      });
      expect(result.current.showPasswordError).toBe(true);
    });
  });

  describe('blur', () => {
    it('marks fields as touched on blur', () => {
      const { result } = customRenderHook(() => useRegisterForm());

      act(() => {
        result.current.handleBlur('username');
      });

      expect(result.current.touched.username).toBe(true);
    });
  });

  describe('handleSubmit', () => {
    let safeParseSpy: MockInstance;
    let consoleSpy: MockInstance;

    beforeEach(() => {
      safeParseSpy = vi.spyOn(RegisterRequestSchema, 'safeParse');
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      safeParseSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('fails if form is invalid', () => {
      const { result } = customRenderHook(() => useRegisterForm());
      let submitResult: RegisterRequest | null = null;
      act(() => {
        submitResult = result.current.handleSubmit();
      });

      expect(submitResult).toBeNull();
      expect(result.current.touched.username).toBe(true);
      expect(result.current.touched.email).toBe(true);
    });

    it('returns formatted data if valid', () => {
      const { result } = customRenderHook(() => useRegisterForm());
      const validData = {
        username: 'ValidUser',
        firstName: '  John  ',
        lastName: '  Doe  ',
        birthDate: new Date('2000-01-01'),
        gender: 'male',
        email: 'Test@Example.com',
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

    it('returns null if validation fails (defensive safeParse)', () => {
      const { result } = customRenderHook(() => useRegisterForm());

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

      safeParseSpy.mockImplementation((data: unknown) => {
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

      let submitResult: RegisterRequest | null = null;
      act(() => {
        submitResult = result.current.handleSubmit();
      });

      expect(submitResult).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Validation failed:', expect.anything());
    });
  });
});
