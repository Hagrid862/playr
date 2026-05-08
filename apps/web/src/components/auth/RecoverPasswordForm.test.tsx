import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecoverPasswordForm } from './RecoverPasswordForm';

vi.mock('@phosphor-icons/react', () => ({
  CircleNotchIcon: vi.fn((props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="circle-notch-icon" {...props} />
  )),
  ArrowsClockwiseIcon: vi.fn((props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="arrows-clockwise-icon" {...props} />
  )),
}));

vi.mock('@/components/ui/input-otp', () => ({
  InputOTP: vi.fn(({ value, onChange, disabled, children, ...props }: {
    value?: string;
    onChange?: (value: string) => void;
    disabled?: boolean;
    children?: React.ReactNode;
  }) => (
    <div data-testid="mock-input-otp" {...props}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        data-testid="mock-input-otp-input"
      />
      {children}
    </div>
  )),
  InputOTPGroup: vi.fn(({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-input-otp-group">{children}</div>
  )),
  InputOTPSlot: vi.fn(({ index }: { index: number }) => (
    <div data-testid={`mock-input-otp-slot-${index}`} />
  )),
}));

vi.mock('@/components/auth/PasswordStrengthPopover', () => ({
  PasswordStrengthPopover: vi.fn(({
    id, value, onChange, onFocus, onBlur, hasError,
  }: {
    id?: string;
    value?: string;
    onChange?: (value: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    hasError?: boolean;
  }) => (
    <input
      id={id}
      type="password"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      data-testid="mock-password-input"
      data-has-error={String(hasError)}
    />
  )),
}));

describe('RecoverPasswordForm', () => {
  const mockFormData = { email: '', otpCode: '', newPassword: '', confirmPassword: '' };
  const mockOnChange = vi.fn();
  const mockOnBlur = vi.fn();
  const mockOnSubmit = vi.fn((e) => e.preventDefault());
  const mockGetFieldError = vi.fn<(field: string) => string | undefined>(() => undefined);
  const mockSetIsPasswordFocused = vi.fn();
  const mockOnResend = vi.fn();

  const defaultProps = {
    formData: mockFormData,
    isValid: false,
    isLoading: false,
    isPasswordFocused: false,
    onSubmit: mockOnSubmit,
    onChange: mockOnChange,
    onBlur: mockOnBlur,
    getFieldError: mockGetFieldError,
    setIsPasswordFocused: mockSetIsPasswordFocused,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders OTP, password fields, and submit button', () => {
    render(<RecoverPasswordForm {...defaultProps} />);

    expect(screen.getByTestId('mock-input-otp-input')).toBeInTheDocument();
    expect(screen.getByTestId('mock-password-input')).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  it('renders resend button when onResend is provided', () => {
    render(<RecoverPasswordForm {...defaultProps} onResend={mockOnResend} />);
    expect(screen.getByRole('button', { name: /resend code/i })).toBeInTheDocument();
  });

  it('does not render resend button when onResend is not provided', () => {
    render(<RecoverPasswordForm {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /resend code/i })).not.toBeInTheDocument();
  });

  it('displays current OTP value from formData', () => {
    render(<RecoverPasswordForm {...defaultProps} formData={{ ...mockFormData, otpCode: '12345678' }} />);
    expect(screen.getByTestId('mock-input-otp-input')).toHaveValue('12345678');
  });

  it('displays current new password value from formData', () => {
    render(<RecoverPasswordForm {...defaultProps} formData={{ ...mockFormData, newPassword: 'secret123' }} />);
    expect(screen.getByTestId('mock-password-input')).toHaveValue('secret123');
  });

  it('displays current confirm password value from formData', () => {
    render(<RecoverPasswordForm {...defaultProps} formData={{ ...mockFormData, confirmPassword: 'secret123' }} />);
    expect(screen.getByLabelText(/confirm password/i)).toHaveValue('secret123');
  });

  it('calls onChange when OTP value changes', () => {
    render(<RecoverPasswordForm {...defaultProps} />);
    fireEvent.change(screen.getByTestId('mock-input-otp-input'), { target: { value: '87654321' } });
    expect(mockOnChange).toHaveBeenCalledWith('otpCode', '87654321');
  });

  it('calls onChange when new password changes', () => {
    render(<RecoverPasswordForm {...defaultProps} />);
    fireEvent.change(screen.getByTestId('mock-password-input'), { target: { value: 'newpass' } });
    expect(mockOnChange).toHaveBeenCalledWith('newPassword', 'newpass');
  });

  it('calls onChange when confirm password changes', () => {
    render(<RecoverPasswordForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'confirmpass' } });
    expect(mockOnChange).toHaveBeenCalledWith('confirmPassword', 'confirmpass');
  });

  it('calls onBlur when OTP loses focus', () => {
    render(<RecoverPasswordForm {...defaultProps} />);
    fireEvent.blur(screen.getByTestId('mock-input-otp-input'));
    expect(mockOnBlur).toHaveBeenCalledWith('otpCode');
  });

  it('calls setIsPasswordFocused(false) and onBlur when new password loses focus', () => {
    render(<RecoverPasswordForm {...defaultProps} />);
    fireEvent.blur(screen.getByTestId('mock-password-input'));
    expect(mockSetIsPasswordFocused).toHaveBeenCalledWith(false);
    expect(mockOnBlur).toHaveBeenCalledWith('newPassword');
  });

  it('calls setIsPasswordFocused(true) when new password gains focus', () => {
    render(<RecoverPasswordForm {...defaultProps} />);
    fireEvent.focus(screen.getByTestId('mock-password-input'));
    expect(mockSetIsPasswordFocused).toHaveBeenCalledWith(true);
  });

  it('calls onBlur when confirm password loses focus', () => {
    render(<RecoverPasswordForm {...defaultProps} />);
    fireEvent.blur(screen.getByLabelText(/confirm password/i));
    expect(mockOnBlur).toHaveBeenCalledWith('confirmPassword');
  });

  it('displays OTP error and sets data-invalid when getFieldError returns an error', () => {
    mockGetFieldError.mockImplementation((field) =>
      field === 'otpCode' ? 'Invalid code' : undefined,
    );
    const { container } = render(<RecoverPasswordForm {...defaultProps} />);
    expect(screen.getByText('Invalid code')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="field"]')[0]).toHaveAttribute('data-invalid', 'true');
  });

  it('displays new password error and sets data-invalid when getFieldError returns an error', () => {
    mockGetFieldError.mockImplementation((field) =>
      field === 'newPassword' ? 'Too weak' : undefined,
    );
    const { container } = render(<RecoverPasswordForm {...defaultProps} />);
    expect(screen.getByText('Too weak')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="field"]')[1]).toHaveAttribute('data-invalid', 'true');
  });

  it('displays confirm password error and sets data-invalid when getFieldError returns an error', () => {
    mockGetFieldError.mockImplementation((field) =>
      field === 'confirmPassword' ? 'Passwords do not match' : undefined,
    );
    const { container } = render(<RecoverPasswordForm {...defaultProps} />);
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="field"]')[2]).toHaveAttribute('data-invalid', 'true');
  });

  it('disables submit button when isValid is false', () => {
    render(<RecoverPasswordForm {...defaultProps} isValid={false} />);
    expect(screen.getByRole('button', { name: /reset password/i })).toBeDisabled();
  });

  it('enables submit button when isValid is true and not loading', () => {
    render(<RecoverPasswordForm {...defaultProps} isValid={true} isLoading={false} />);
    expect(screen.getByRole('button', { name: /reset password/i })).toBeEnabled();
  });

  it('disables submit button and shows spinner when isLoading is true', () => {
    render(<RecoverPasswordForm {...defaultProps} isValid={true} isLoading={true} />);
    const submitButton = screen.getByRole('button', { name: '' });
    expect(submitButton).toBeDisabled();
    expect(screen.getByTestId('circle-notch-icon')).toBeInTheDocument();
  });

  it('shows "Reset Password" text on submit button when not loading', () => {
    render(<RecoverPasswordForm {...defaultProps} isValid={true} isLoading={false} />);
    expect(screen.getByRole('button', { name: /reset password/i })).toHaveTextContent('Reset Password');
  });

  it('calls onSubmit when form is submitted', () => {
    render(<RecoverPasswordForm {...defaultProps} isValid={true} />);
    const form = screen.getByRole('button', { name: /reset password/i }).closest('form');
    if (form) {
      fireEvent.submit(form);
    }
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables OTP and confirm password inputs when isLoading is true', () => {
    render(<RecoverPasswordForm {...defaultProps} isLoading={true} />);
    expect(screen.getByTestId('mock-input-otp-input')).toBeDisabled();
    expect(screen.getByLabelText(/confirm password/i)).toBeDisabled();
  });

  it('disables resend button and shows timer text when resendTimer > 0', () => {
    render(
      <RecoverPasswordForm
        {...defaultProps}
        onResend={mockOnResend}
        resendTimer={30}
      />,
    );
    const resendButton = screen.getByRole('button', { name: /wait 30s to resend/i });
    expect(resendButton).toBeDisabled();
    expect(resendButton).toHaveTextContent('Wait 30s to resend');
  });

  it('shows "Resend Code" text when resendTimer is 0', () => {
    render(
      <RecoverPasswordForm
        {...defaultProps}
        onResend={mockOnResend}
        resendTimer={0}
      />,
    );
    expect(screen.getByRole('button', { name: /resend code/i })).toHaveTextContent('Resend Code');
  });

  it('disables resend button and shows spinner when isResendLoading is true', () => {
    render(
      <RecoverPasswordForm
        {...defaultProps}
        onResend={mockOnResend}
        isResendLoading={true}
      />,
    );
    const resendButton = screen.getByRole('button', { name: /resend code/i });
    expect(resendButton).toBeDisabled();
    expect(screen.getByTestId('circle-notch-icon')).toBeInTheDocument();
  });

  it('shows ArrowsClockwiseIcon on resend button when not resend loading', () => {
    render(
      <RecoverPasswordForm
        {...defaultProps}
        onResend={mockOnResend}
        isResendLoading={false}
      />,
    );
    expect(screen.getByTestId('arrows-clockwise-icon')).toBeInTheDocument();
  });

  it('calls onResend when resend button is clicked', () => {
    render(
      <RecoverPasswordForm
        {...defaultProps}
        onResend={mockOnResend}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /resend code/i }));
    expect(mockOnResend).toHaveBeenCalledTimes(1);
  });

  it('disables resend button when isLoading is true', () => {
    render(
      <RecoverPasswordForm
        {...defaultProps}
        onResend={mockOnResend}
        isLoading={true}
        isResendLoading={false}
        resendTimer={0}
      />,
    );
    expect(screen.getByRole('button', { name: /resend code/i })).toBeDisabled();
  });
});
