import { CreateLibraryArtistRequest, CreateLibraryArtistRequestSchema } from '@repo/contracts';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { CreateArtistForm } from './CreateArtistForm';

// Mocking link because it needs router context
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

describe('CreateArtistForm', () => {
  const mockOnSubmit = vi.fn<(values: CreateLibraryArtistRequest) => Promise<void>>();
  const defaultProps = {
    isLoading: false,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<CreateArtistForm {...defaultProps} />);

    expect(screen.getByLabelText(/Artist Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Artist/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('shows validation error when name is empty and touched', async () => {
    const user = userEvent.setup();
    render(<CreateArtistForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Artist Name/i);
    await user.type(nameInput, 'a');
    await user.clear(nameInput);
    await user.tab(); // Blur

    expect(await screen.findByText('Artist name is required')).toBeInTheDocument();
  });

  it('calls onSubmit with form data when values are valid', async () => {
    const user = userEvent.setup();
    render(<CreateArtistForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Artist Name/i);
    const descInput = screen.getByLabelText(/Description/i);
    const submitButton = screen.getByRole('button', { name: /Create Artist/i });

    await user.type(nameInput, 'Nirvana');
    await user.type(descInput, 'Grunge band from Seattle');

    await user.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith({
      name: 'Nirvana',
      description: 'Grunge band from Seattle',
    });
  });

  it('shows loading state on submit button', () => {
    render(<CreateArtistForm {...defaultProps} isLoading={true} />);

    expect(screen.getByText(/Creating.../i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Creating.../i })).toBeDisabled();
  });

  it('displays server errors if provided even if not touched', () => {
    const serverErrors: Partial<Record<keyof CreateLibraryArtistRequest, string>> = {
      name: 'Server error name',
    };
    render(<CreateArtistForm {...defaultProps} serverErrors={serverErrors} />);

    expect(screen.getByText('Server error name')).toBeInTheDocument();
  });

  it('handles multiple validation errors correctly via validateWithZod', async () => {
    const spy = vi.spyOn(CreateLibraryArtistRequestSchema, 'safeParse').mockReturnValue({
      success: false,
      error: new z.ZodError([
        { path: ['name'], message: 'First error', code: 'custom' },
        { path: ['name'], message: 'Second error', code: 'custom' },
      ]),
    } as ReturnType<typeof CreateLibraryArtistRequestSchema.safeParse>);

    render(<CreateArtistForm {...defaultProps} />);
    const nameInput = screen.getByLabelText(/Artist Name/i);
    fireEvent.change(nameInput, { target: { value: 'trigger' } });
    fireEvent.blur(nameInput);

    expect(await screen.findByText('First error')).toBeInTheDocument();
    expect(screen.queryByText('Second error')).not.toBeInTheDocument();
    spy.mockRestore();
  });

  it('displays form-level errors for description when touched', async () => {
    const user = userEvent.setup();
    // Re-render with server errors to cover that branch
    render(
      <CreateArtistForm
        {...defaultProps}
        serverErrors={{ description: 'Server description error' }}
      />,
    );
    expect(screen.getByText('Server description error')).toBeInTheDocument();

    const descInput = screen.getByLabelText(/Description/i);
    await user.type(descInput, 'a');
    await user.tab();
    // Once touched, server error should disappear (per our logic: touched ? (fieldError || formError) : serverError)
    expect(screen.queryByText('Server description error')).not.toBeInTheDocument();
  });

  it('shows field-level validation error for long description', async () => {
    const user = userEvent.setup();
    render(<CreateArtistForm {...defaultProps} />);
    const descInput = screen.getByLabelText(/Description/i);

    // Using fireEvent for long text is faster in tests
    fireEvent.change(descInput, { target: { value: 'a'.repeat(2050) } });
    await user.tab();

    expect(
      await screen.findByText('Description must be 2048 characters or less'),
    ).toBeInTheDocument();
  });

  it('does not show error when value is valid and blurred', () => {
    render(<CreateArtistForm {...defaultProps} />);
    const nameInput = screen.getByLabelText(/Artist Name/i);
    fireEvent.change(nameInput, { target: { value: 'Valid Name' } });
    fireEvent.blur(nameInput);
    expect(screen.queryByText('Artist name is required')).not.toBeInTheDocument();
  });

  it('handles null/undefined value in description validator', () => {
    render(<CreateArtistForm {...defaultProps} />);
    const descInput = screen.getByLabelText(/Description/i);
    // Directly fire change with null to trigger the ?? 0 fallback
    fireEvent.change(descInput, { target: { value: null } });
    fireEvent.blur(descInput);
  });

  it('does not show error when not touched', () => {
    render(<CreateArtistForm {...defaultProps} />);
    const nameInput = screen.getByLabelText(/Artist Name/i);
    fireEvent.change(nameInput, { target: { value: '' } });
    expect(screen.queryByText('Artist name is required')).not.toBeInTheDocument();
  });
});
