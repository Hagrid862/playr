import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RouteComponent } from './register';

// Mock hooks
// Mock hooks
const mockValues: {
  mutateAsync: ReturnType<typeof vi.fn>;
  isPending: boolean;
  error: { message: string } | null;
} = {
  mutateAsync: vi.fn(),
  isPending: false,
  error: null,
};
vi.mock('@/hooks/api/auth', () => ({
  useRegister: () => mockValues,
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
    Link: (props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
      <a href={props.to}>{props.children}</a>
    ),
  };
});

// Mock UI components to avoid Radix UI/JSDOM interaction issues
vi.mock('@/components/form', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/form')>();
  return {
    ...actual,
    // Mock DatePickerField
    DatePickerField: ({
      label,
      onChange,
      value,
      error,
    }: {
      label: string;
      onChange: (date: Date) => void;
      value: Date | undefined;
      error?: string;
    }) => (
      <div data-testid="mock-datepicker">
        <label htmlFor="params-birth-date">{label}</label>
        <input
          id="params-birth-date"
          type="date"
          onChange={(e) => {
            const date = new Date(e.target.value);
            onChange(date);
          }}
          value={value ? value.toISOString().split('T')[0] : ''}
        />
        {error && <div role="alert">{error}</div>}
      </div>
    ),
    // Mock SelectField
    SelectField: ({
      label,
      onChange,
      value,
      error,
      options,
    }: {
      label: string;
      onChange: (val: string) => void;
      value: string;
      error?: string;
      options: { value: string; label: string }[];
    }) => (
      <div data-testid="mock-select">
        <label htmlFor="params-gender">{label}</label>
        <select id="params-gender" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <div role="alert">{error}</div>}
      </div>
    ),
  };
});

describe('Register Page Integration', () => {
  const Component = RouteComponent;

  beforeEach(() => {
    vi.clearAllMocks();
    mockValues.mutateAsync.mockResolvedValue({});
    mockValues.isPending = false;
    mockValues.error = null;
  });

  it('renders the registration form', () => {
    render(<Component />);
    expect(screen.getByText('Create an account')).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByText('Create account')).toBeDisabled(); // Initially disabled
  });

  it('validates and submits the form', async () => {
    const user = userEvent.setup();
    render(<Component />);

    // Fill out the form
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/first name/i), 'Test');
    await user.type(screen.getByLabelText(/last name/i), 'User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');

    // Gender - select using mocked Select
    const genderSelect = screen.getByLabelText(/gender/i);
    await user.selectOptions(genderSelect, 'male');

    // Verify selection
    expect(genderSelect).toHaveValue('male');

    // Birth Date - using mocked input
    const dateInput = screen.getByLabelText(/birth date/i);
    await user.type(dateInput, '2000-01-01');

    // Check submit button enabled
    const submitBtn = screen.getByText('Create account');
    await waitFor(() => expect(submitBtn).toBeEnabled());

    // Submit
    await user.click(submitBtn);

    expect(mockValues.mutateAsync).toHaveBeenCalled();

    // Verify values passed to mutateAsync
    expect(mockValues.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'testuser',
        email: 'test@example.com',
        gender: 'male',
      }),
    );
  });

  it('shows validation error for existing user (API error)', async () => {
    mockValues.mutateAsync.mockRejectedValue(new Error('User already exists'));
    mockValues.error = { message: 'User already exists' };

    render(<Component />);

    expect(screen.getByText('User already exists')).toBeInTheDocument();
  });
});
