import { createMock } from '@golevelup/ts-vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteComponent } from './login';
import { userBuilder, emailAddressBuilder } from '@repo/testing';
import { EmailStatus, User, EmailAddress } from '@repo/db';
import React from "react";

// Define a type that extends User to include emailAddresses
type UserWithEmailAddresses = User & {
  emailAddresses: EmailAddress[];
};

// Mock hooks
const mockValues = createMock<{
  mutateAsync: ReturnType<typeof vi.fn>;
  isPending: boolean;
  error: { message: string } | null;
}>({
  mutateAsync: vi.fn(),
  isPending: false,
  error: null,
});

vi.mock('@/hooks/api/auth', () => ({
  useLogin: () => mockValues,
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    createFileRoute: (path: string) => (options: Record<string, unknown>) => ({
      ...options,
      path,
    }),
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  };
});

describe('Login Page Integration', () => {
  const Component = RouteComponent;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock email address verified for the authenticated user
    const verifiedEmail = emailAddressBuilder({
      email: 'test@example.com',
      status: EmailStatus.verified,
      verifiedAt: new Date(),
    });

    // Create a mock authenticated user using the builder
    const baseAuthenticatedUser = userBuilder();
    const authenticatedUser: UserWithEmailAddresses = {
      ...baseAuthenticatedUser,
      emailAddresses: [verifiedEmail],
    };

    // Default mock for mutateAsync to simulate an authenticated user
    mockValues.mutateAsync.mockResolvedValue({
      data: {
        outcome: 'authenticated', // Default to authenticated for most tests
        user: authenticatedUser,
        accessToken: 'token',
      },
    });
    mockValues.isPending = false;
    mockValues.error = null;
  });

  it('renders the login form', () => {
    render(<Component />);
    expect(screen.getByText('Login to your account')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('validates and submits the form successfully', async () => {
    const user = userEvent.setup();
    render(<Component />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');

    const submitBtn = screen.getByRole('button', { name: /login/i });
    await waitFor(() => expect(submitBtn).toBeEnabled());

    await user.click(submitBtn);

    expect(mockValues.mutateAsync).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123!',
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/' });
    });
  });

  it('navigates to verify-email if unauthenticated outcome', async () => {
    // Create a mock email address pending verification for the unauthenticated user
    const pendingEmail = emailAddressBuilder({
      email: 'test@example.com',
      status: EmailStatus.pending,
      verifiedAt: null,
    });

    // Create a mock unauthenticated user using the builder
    const baseUnauthenticatedUser = userBuilder();
    const unauthenticatedUser: UserWithEmailAddresses = {
      ...baseUnauthenticatedUser,
      emailAddresses: [pendingEmail],
    };

    // Override the default mock for this specific test
    mockValues.mutateAsync.mockResolvedValue({
      data: {
        outcome: 'unauthenticated',
        user: unauthenticatedUser,
      },
    });

    const user = userEvent.setup();
    render(<Component />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');

    const submitBtn = screen.getByRole('button', { name: /login/i });
    await waitFor(() => expect(submitBtn).toBeEnabled());

    await user.click(submitBtn);

    expect(mockValues.mutateAsync).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123!',
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/auth/verify-email',
        search: { email: 'test@example.com' },
      });
    });
  });

  it('logs error to console on submission exception', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockValues.mutateAsync.mockRejectedValue(new Error('Network error'));

    const user = userEvent.setup();
    render(<Component />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');

    const submitBtn = screen.getByRole('button', { name: /login/i });
    await waitFor(() => expect(submitBtn).toBeEnabled());
    await user.click(submitBtn);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Login failed', expect.any(Error));
    });
    consoleSpy.mockRestore();
  });

  it('handles manual form submission (coverage for handleSubmit check)', async () => {
    const { container } = render(<Component />);
    const form = container.querySelector('form');
    if (form) {
      fireEvent.submit(form);
    }
    // Should not call mutateAsync because form is empty/invalid
    expect(mockValues.mutateAsync).not.toHaveBeenCalled();
  });
});
