import { render, screen, fireEvent } from '@testing-library/react';
import { VerifyEmailForm } from './VerifyEmailForm';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('should disable buttons and OTP input when verify is loading and show spinner on verify button', () => {
    render(<VerifyEmailForm {...defaultProps} isVerifyEmailLoading={true} />);

    // Find the Verify button by filtering all buttons by its type attribute
    const verifyButton = screen
      .getAllByRole('button')
      .find((btn) => btn.getAttribute('type') === 'submit');
    expect(verifyButton).toBeInTheDocument(); // Ensure the button is found
    expect(verifyButton).toBeDisabled();

    // Find the spinner element (any SVG) within the Verify button
    const spinner = verifyButton?.querySelector('svg');
    expect(spinner).toBeInTheDocument(); // Ensure the spinner is found

    // Resend button should also be disabled when verify is loading
    expect(screen.getByRole('button', { name: /resend code/i })).toBeDisabled();
    // OTP input slots should be disabled
    const otpInputs = screen.getAllByRole('textbox');
    otpInputs.forEach((input) => expect(input).toBeDisabled());
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

  it('should call onChange when OTP input value changes', () => {
    render(<VerifyEmailForm {...defaultProps} />);
    // Target the first individual input slot
    const otpInputs = screen.getAllByRole('textbox');
    const firstInput = otpInputs[0];
    fireEvent.change(firstInput, { target: { value: '12345678' } });
    expect(defaultProps.onChange).toHaveBeenCalledWith('otpCode', '12345678');
  });

  it('should call onBlur when OTP input loses focus', () => {
    render(<VerifyEmailForm {...defaultProps} />);
    // Target the first individual input slot
    const otpInputs = screen.getAllByRole('textbox');
    const firstInput = otpInputs[0];
    fireEvent.blur(firstInput);
    expect(defaultProps.onBlur).toHaveBeenCalledWith('otpCode');
  });

  it('should disable resend button and show spinner when resend is loading', () => {
    render(<VerifyEmailForm {...defaultProps} isResendLoading={true} />);
    const resendButton = screen.getByRole('button', { name: /resend code/i });
    expect(resendButton).toBeDisabled();
    const spinner = resendButton.querySelector('svg'); // Find the spinner (any SVG) within the resend button
    expect(spinner).toBeInTheDocument();
  });

  it('should disable verify button when isValid is false', () => {
    render(<VerifyEmailForm {...defaultProps} isValid={false} />);
    expect(screen.getByRole('button', { name: /verify/i })).toBeDisabled();
  });
});
