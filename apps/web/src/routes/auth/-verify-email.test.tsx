import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';
import { userBuilder } from '@repo/testing';

// Mock constants
const mockVerifyEmail = vi.fn();
const mockResendEmail = vi.fn();
const mockNavigate = vi.fn();
const mockInvalidate = vi.fn();
const mockEmail = 'test@example.com';

vi.mock('@/hooks/api/auth', () => ({
  useVerifyEmail: () => ({
    mutateAsync: mockVerifyEmail,
    isPending: false,
  }),
  useResendEmailVerificationCode: () => ({
    mutateAsync: mockResendEmail,
    isPending: false,
  }),
}));

vi.mock('@/hooks/forms/useVerifyEmailForm', () => {
  const { useState } = require('react');
  return {
    useVerifyEmailForm: () => {
      const [data, setData] = useState({ email: mockEmail, otpCode: '' });

      return {
        formData: data,
        isFormValid: data.otpCode.length === 8,
        handleChange: (field: string, value: string) => {
          setData((prev: any) => ({ ...prev, [field]: value }));
        },
        handleBlur: vi.fn(),
        handleSubmit: () => {
          if (data.otpCode.length === 8) {
            return { ...data };
          }
          return null;
        },
        getFieldError: () => undefined,
      };
    },
  };
});

// Mock resend timer hook
vi.mock('@/hooks/use-resend-timer', () => {
  const { useState } = require('react');
  return {
    useResendTimer: () => {
      const [timeLeft, setTimeLeft] = useState(0);

      return {
        timeLeft,
        startTimer: () => setTimeLeft(60),
      };
    },
  };
});

// Mock TanStack Router
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useRouter: () => ({
      invalidate: mockInvalidate,
    }),
  };
});

// Import component after mocks
import { RouteComponent, Route } from './verify-email';

describe('VerifyEmail Route', () => {
  const mockUser = userBuilder();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
    // Mock Route.useSearch before each test
    vi.spyOn(Route, 'useSearch').mockReturnValue({ email: mockEmail });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render the verify email page', async () => {
    useAuthStore.getState().setUnauthenticatedUser(mockUser);
    
    render(<RouteComponent />);

    expect(screen.getByText(/verify your email/i)).toBeInTheDocument();
    expect(screen.getByText(mockEmail)).toBeInTheDocument();
  });

  it('should handle successful verification', async () => {
    useAuthStore.getState().setUnauthenticatedUser(mockUser);
    const setAuthSpy = vi.spyOn(useAuthStore.getState(), 'setAuth');
    
    mockVerifyEmail.mockResolvedValueOnce({
      success: true,
      data: {
        user: mockUser,
        accessToken: 'new-token',
      },
    });

    render(<RouteComponent />);

    // Fill OTP code
    const otpInput = screen.getByLabelText(/verification code/i);
    fireEvent.change(otpInput, { target: { value: '12345678' } });

    // Submit form - use query method since button text changes when loading
    const buttons = screen.getAllByRole('button');
    const submitBtn = buttons.find(btn => btn.getAttribute('type') === 'submit');
    fireEvent.click(submitBtn!);

    await waitFor(() => {
      expect(mockVerifyEmail).toHaveBeenCalledWith({
        email: mockEmail,
        otpCode: '12345678',
      });
      expect(setAuthSpy).toHaveBeenCalledWith(mockUser, 'new-token');
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/' });
    });
  });

  it('should handle resend code', async () => {
    useAuthStore.getState().setUnauthenticatedUser(mockUser);
    mockResendEmail.mockResolvedValueOnce({ success: true });

    render(<RouteComponent />);

    const resendBtn = screen.getByRole('button', { name: /resend code/i });
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(mockResendEmail).toHaveBeenCalledWith({ email: mockEmail });
    });

    // After resend, the button should show the timer
    expect(screen.getByText(/wait 60s to resend code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /wait 60s to resend code/i })).toBeDisabled();
  });

   it('should handle logout via dialog', async () => {
    useAuthStore.getState().setUnauthenticatedUser(mockUser);
    const logoutSpy = vi.spyOn(useAuthStore.getState(), 'logout');

    render(<RouteComponent />);

    // Click trigger to open dialog
    const logoutTrigger = screen.getByRole('button', { name: /log out/i });
    fireEvent.click(logoutTrigger);

    // Dialog should be open
    expect(screen.getByText(/are you absolutely sure/i)).toBeInTheDocument();

    // Find all "Log out" buttons and click the one in the dialog (the confirmation button)
    const buttons = screen.getAllByRole('button', { name: /log out/i });
    // The first is the trigger button, the second is the action button in the dialog
    const confirmLogoutBtn = buttons[buttons.length - 1];

    fireEvent.click(confirmLogoutBtn);

    await waitFor(() => {
      expect(logoutSpy).toHaveBeenCalled();
      expect(mockInvalidate).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/auth/login' });
    });
  });
});
