import { customRenderWithRouter } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  const mockProps = {
    formData: { email: '', password: '' },
    isLoading: false,
    isValid: false,
    onSubmit: vi.fn((e) => e.preventDefault()),
    onChange: vi.fn(),
    onBlur: vi.fn(),
    getFieldError: vi.fn(),
  };

  it('renders all fields', async () => {
    customRenderWithRouter(<LoginForm {...mockProps} />);
    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/password/i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('calls onChange when typing', async () => {
    customRenderWithRouter(<LoginForm {...mockProps} />);
    const emailInput = await screen.findByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(mockProps.onChange).toHaveBeenCalledWith('email', 'test@example.com');
  });

  it('calls onBlur when field loses focus', async () => {
    customRenderWithRouter(<LoginForm {...mockProps} />);
    const passwordInput = await screen.findByLabelText(/password/i);
    fireEvent.blur(passwordInput);
    expect(mockProps.onBlur).toHaveBeenCalledWith('password');
  });

  it('shows error message if getFieldError returns a value', async () => {
    mockProps.getFieldError.mockImplementation((field) =>
      field === 'email' ? 'Invalid email' : 'Password too short',
    );
    customRenderWithRouter(<LoginForm {...mockProps} />);
    expect(await screen.findByText('Invalid email')).toBeInTheDocument();
    expect(await screen.findByText('Password too short')).toBeInTheDocument();
  });

  it('displays loading state', async () => {
    customRenderWithRouter(<LoginForm {...mockProps} isLoading={true} />);
    expect(await screen.findByText(/logging in.../i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /logging in.../i })).toBeDisabled();
  });

  it('disables submit button when invalid', async () => {
    customRenderWithRouter(<LoginForm {...mockProps} isValid={false} />);
    expect(await screen.findByRole('button', { name: /login/i })).toBeDisabled();
  });

  it('enables submit button when valid and not loading', async () => {
    customRenderWithRouter(<LoginForm {...mockProps} isValid={true} isLoading={false} />);
    expect(await screen.findByRole('button', { name: /login/i })).toBeEnabled();
  });

  it('calls onSubmit when form is submitted', async () => {
    customRenderWithRouter(<LoginForm {...mockProps} isValid={true} />);
    const button = await screen.findByRole('button', { name: /login/i });
    const form = button.closest('form');
    if (form) {
      fireEvent.submit(form);
      expect(mockProps.onSubmit).toHaveBeenCalled();
    }
  });
});
