import { fireEvent, render, screen } from '@testing-library/react';
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

  it('renders all fields', () => {
    render(<LoginForm {...mockProps} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('calls onChange when typing', () => {
    render(<LoginForm {...mockProps} />);
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(mockProps.onChange).toHaveBeenCalledWith('email', 'test@example.com');
  });

  it('calls onBlur when field loses focus', () => {
    render(<LoginForm {...mockProps} />);
    const passwordInput = screen.getByLabelText(/password/i);
    fireEvent.blur(passwordInput);
    expect(mockProps.onBlur).toHaveBeenCalledWith('password');
  });

  it('shows error message if getFieldError returns a value', () => {
    mockProps.getFieldError.mockImplementation((field) =>
      field === 'email' ? 'Invalid email' : 'Password too short',
    );
    render(<LoginForm {...mockProps} />);
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
    expect(screen.getByText('Password too short')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(<LoginForm {...mockProps} isLoading={true} />);
    expect(screen.getByText(/logging in.../i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logging in.../i })).toBeDisabled();
  });

  it('disables submit button when invalid', () => {
    render(<LoginForm {...mockProps} isValid={false} />);
    expect(screen.getByRole('button', { name: /login/i })).toBeDisabled();
  });

  it('enables submit button when valid and not loading', () => {
    render(<LoginForm {...mockProps} isValid={true} isLoading={false} />);
    expect(screen.getByRole('button', { name: /login/i })).toBeEnabled();
  });

  it('calls onSubmit when form is submitted', () => {
    render(<LoginForm {...mockProps} isValid={true} />);
    const form = screen.getByRole('button', { name: /login/i }).closest('form');
    if (form) {
      fireEvent.submit(form);
      expect(mockProps.onSubmit).toHaveBeenCalled();
    }
  });
});
