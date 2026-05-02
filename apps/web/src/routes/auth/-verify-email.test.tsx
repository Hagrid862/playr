import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '@/stores/auth.store';
import { userBuilder } from '@repo/testing';

// Mock the API hooks
const mockVerifyEmail = vi.fn();
const mockResendEmail = vi.fn();

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

// Mock form hooks
const mockHandleChange = vi.fn();
const mockHandleBlur = vi.fn();
const mockHandleSubmit = vi.fn();
const mockGetFieldError = vi.fn();

vi.mock('@/hooks/forms/useVerifyEmailForm', () => ({
  useVerifyEmailForm: (email: string) => ({
    formData: { email, otpCode: '' },
    isFormValid: false,
    handleChange: mockHandleChange,
    handleBlur: mockHandleBlur,
    handleSubmit: mockHandleSubmit,
    getFieldError: mockGetFieldError,
  }),
}));

// Mock resend timer hook
const mockStartTimer = vi.fn();

vi.mock('@/hooks/use-resend-timer', () => ({
  useResendTimer: () => ({
    timeLeft: 0,
    startTimer: mockStartTimer,
  }),
}));

// Mock TanStack Router
const mockNavigate = vi.fn();
const mockInvalidate = vi.fn();

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

// Mock the verify-email route module to override Route.useSearch
vi.mock('./verify-email', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./verify-email')>();
  return {
    ...actual,
    Route: {
      ...actual.Route,
      useSearch: () => ({ email: 'test@example.com' }),
    },
  };
});

// Import component after mocks
import { RouteComponent } from './verify-email';

describe('VerifyEmail Route', () => {
  const mockUser = userBuilder();
  const searchParams = { email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
  });

  it('should render the verify email page', async () => {
    useAuthStore.getState().setUnauthenticatedUser(mockUser);
    
    render(<RouteComponent />);

    expect(screen.getByText(/verify your email/i)).toBeInTheDocument();
    expect(screen.getByText(searchParams.email)).toBeInTheDocument();
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

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /verify/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockVerifyEmail).toHaveBeenCalledWith({
        email: 'test@example.com',
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
      expect(mockResendEmail).toHaveBeenCalledWith({ email: 'test@example.com' });
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
    
    // Find all "Log out" buttons and click the one in the dialog (the confirm button)
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
