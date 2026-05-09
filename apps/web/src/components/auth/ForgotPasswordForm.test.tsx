import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForgotPasswordForm } from './ForgotPasswordForm';

vi.mock('@phosphor-icons/react', () => ({
  CircleNotchIcon: vi.fn((props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="circle-notch-icon" {...props} />
  )),
  ArrowsClockwiseIcon: vi.fn((props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="arrows-clockwise-icon" {...props} />
  )),
}));

describe('ForgotPasswordForm', () => {
  const mockFormData = { email: '' };
  const mockOnChange = vi.fn();
  const mockOnBlur = vi.fn();
  const mockOnSubmit = vi.fn((e) => e.preventDefault());
  const mockGetFieldError = vi.fn<() => string | undefined>(() => undefined);

  const defaultProps = {
    formData: mockFormData,
    isValid: false,
    isLoading: false,
    onSubmit: mockOnSubmit,
    onChange: mockOnChange,
    onBlur: mockOnBlur,
    getFieldError: mockGetFieldError,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the email input and submit button', () => {
    render(<ForgotPasswordForm {...defaultProps} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset code/i })).toBeInTheDocument();
  });

  it('should display the current email value from formData', () => {
    const formDataWithEmail = { email: 'test@example.com' };
    render(<ForgotPasswordForm {...defaultProps} formData={formDataWithEmail} />);

    expect(screen.getByLabelText(/email/i)).toHaveValue('test@example.com');
  });

  it('should call onChange when the email input value changes', () => {
    render(<ForgotPasswordForm {...defaultProps} />);
    const emailInput = screen.getByLabelText(/email/i);

    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

    expect(mockOnChange).toHaveBeenCalledWith('email', 'new@example.com');
  });

  it('should call onBlur when the email input loses focus', () => {
    render(<ForgotPasswordForm {...defaultProps} />);
    const emailInput = screen.getByLabelText(/email/i);

    fireEvent.blur(emailInput);

    expect(mockOnBlur).toHaveBeenCalledWith('email');
  });

  it('should display an error message if getFieldError returns one for email', () => {
    mockGetFieldError.mockReturnValueOnce('Invalid email address');
    const { container } = render(<ForgotPasswordForm {...defaultProps} />);

    expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="field"]')).toHaveAttribute('data-invalid', 'true');
  });

  it('should disable the submit button when isValid is false', () => {
    render(<ForgotPasswordForm {...defaultProps} isValid={false} />);
    const submitButton = screen.getByRole('button', { name: /send reset code/i });

    expect(submitButton).toBeDisabled();
  });

  it('should enable the submit button when isValid is true and not loading or timed out', () => {
    render(
      <ForgotPasswordForm {...defaultProps} isValid={true} isLoading={false} resendTimer={0} />,
    );
    const submitButton = screen.getByRole('button', { name: /send reset code/i });

    expect(submitButton).toBeEnabled();
  });

  it('should disable the submit button and show "Sending..." when isLoading is true', () => {
    render(<ForgotPasswordForm {...defaultProps} isLoading={true} />);
    const submitButton = screen.getByRole('button', { name: /sending.../i });

    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Sending...');
    expect(screen.getByTestId('circle-notch-icon')).toBeInTheDocument();
  });

  it('should disable the submit button and show "Wait {resendTimer}s to send" when resendTimer is active', () => {
    render(<ForgotPasswordForm {...defaultProps} resendTimer={10} />);
    const submitButton = screen.getByRole('button', { name: /wait 10s to send/i });

    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Wait 10s to send');
    expect(screen.getByTestId('arrows-clockwise-icon')).toBeInTheDocument();
  });

  it('should call onSubmit when the form is submitted', () => {
    render(<ForgotPasswordForm {...defaultProps} isValid={true} />);
    const form = screen.getByRole('button', { name: /send reset code/i }).closest('form');

    if (form) {
      fireEvent.submit(form);
    }

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
  });

  it('should disable the email input when isLoading is true', () => {
    render(<ForgotPasswordForm {...defaultProps} isLoading={true} />);
    const emailInput = screen.getByLabelText(/email/i);

    expect(emailInput).toBeDisabled();
  });

  it('should render the correct icon for "Send Reset Code" state', () => {
    render(
      <ForgotPasswordForm {...defaultProps} isValid={true} isLoading={false} resendTimer={0} />,
    );
    expect(screen.getByTestId('arrows-clockwise-icon')).toBeInTheDocument();
  });
});
