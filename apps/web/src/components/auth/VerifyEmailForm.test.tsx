import { render, screen, fireEvent } from '@testing-library/react';
import { VerifyEmailForm } from './VerifyEmailForm';
import { describe, it, expect, vi } from 'vitest';

describe('VerifyEmailForm', () => {
  const defaultProps = {
    formData: { email: 'test@example.com', otpCode: '' },
    isValid: false,
    isVerifyEmailLoading: false,
    onSubmit: vi.fn((e) => e.preventDefault()),
    onChange: vi.fn(),
    onBlur: vi.fn(),
    getFieldError: vi.fn(),
    onResend: vi.fn(),
    isResendLoading: false,
    resendTimer: 0,
  };

  it('should render correctly', () => {
    render(<VerifyEmailForm {...defaultProps} />);
    expect(screen.getByText('Verification Code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /verify/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend code/i })).toBeInTheDocument();
  });

  it('should call onResend when resend button is clicked', () => {
    render(<VerifyEmailForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /resend code/i }));
    expect(defaultProps.onResend).toHaveBeenCalled();
  });

  it('should show timer in resend button when resendTimer > 0', () => {
    render(<VerifyEmailForm {...defaultProps} resendTimer={45} />);
    expect(screen.getByText(/wait 45s to resend code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /wait 45s to resend code/i })).toBeDisabled();
  });

  it('should disable buttons when loading', () => {
    render(<VerifyEmailForm {...defaultProps} isVerifyEmailLoading={true} />);
    // When loading, the Verify button is disabled and shows a spinner
    const verifyButton = screen.getByRole('button', { name: /verify/i });
    expect(verifyButton).toBeDisabled();
    // Resend button should also be disabled when verify is loading
    expect(screen.getByRole('button', { name: /resend code/i })).toBeDisabled();
  });

  it('should call onSubmit when form is submitted', () => {
    render(<VerifyEmailForm {...defaultProps} isValid={true} />);
    fireEvent.submit(screen.getByRole('button', { name: /verify/i }).closest('form')!);
    expect(defaultProps.onSubmit).toHaveBeenCalled();
  });

  it('should display error message when provided', () => {
    const getFieldError = vi.fn().mockReturnValue('Invalid code');
    render(<VerifyEmailForm {...defaultProps} getFieldError={getFieldError} />);
    expect(screen.getByText('Invalid code')).toBeInTheDocument();
  });
});
