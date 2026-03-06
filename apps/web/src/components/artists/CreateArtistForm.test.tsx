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

    expect(mockOnSubmit).toHaveBeenCalledWith(
      {
        name: 'Nirvana',
        description: 'Grunge band from Seattle',
      },
      undefined,
    );
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

  it('triggers file input click when avatar is clicked', () => {
    render(<CreateArtistForm {...defaultProps} />);
    const avatarContainer = screen.getByText(/Upload Photo/i).closest('div');
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    fireEvent.click(avatarContainer!);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('handles avatar file selection and updates preview', async () => {
    const user = userEvent.setup();
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL');

    const { unmount } = render(<CreateArtistForm {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
    await user.upload(fileInput, file);

    expect(createObjectUrlSpy).toHaveBeenCalledWith(file);
    expect(screen.getByAltText('Avatar preview')).toHaveAttribute('src', 'mock-url');
    expect(screen.getByText('Change Photo')).toBeInTheDocument();

    unmount();
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('mock-url');
  });

  it('submits with the selected avatar file', async () => {
    const user = userEvent.setup();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');

    render(<CreateArtistForm {...defaultProps} />);
    const nameInput = screen.getByLabelText(/Artist Name/i);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /Create Artist/i });

    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
    await user.type(nameInput, 'New Artist');
    await user.upload(fileInput, file);
    await user.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Artist' }),
      file,
    );
  });

  it('handles file change with no files selected', () => {
    render(<CreateArtistForm {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [] } });
    // Just ensuring it doesn't crash and covers the branch
  });

  it('shows drag overlay when dragging files over window', () => {
    render(<CreateArtistForm {...defaultProps} />);
    const dataTransfer = { items: [{}], files: [] };

    fireEvent.dragEnter(window, { dataTransfer });
    expect(screen.getByText(/Drop avatar image here/i)).toBeInTheDocument();
  });

  it('hides drag overlay when dragging leaves window', () => {
    render(<CreateArtistForm {...defaultProps} />);
    const dataTransfer = { items: [{}], files: [] };

    fireEvent.dragEnter(window, { dataTransfer });
    expect(screen.getByText(/Drop avatar image here/i)).toBeInTheDocument();

    fireEvent.dragLeave(window, { dataTransfer });
    expect(screen.queryByText(/Drop avatar image here/i)).not.toBeInTheDocument();
  });

  it('keeps drag overlay visible during nested drag events', () => {
    render(<CreateArtistForm {...defaultProps} />);
    const dataTransfer = { items: [{}], files: [] };

    fireEvent.dragEnter(window, { dataTransfer });
    fireEvent.dragEnter(window, { dataTransfer });
    expect(screen.getByText(/Drop avatar image here/i)).toBeInTheDocument();

    fireEvent.dragLeave(window, { dataTransfer });
    expect(screen.getByText(/Drop avatar image here/i)).toBeInTheDocument();

    fireEvent.dragLeave(window, { dataTransfer });
    expect(screen.queryByText(/Drop avatar image here/i)).not.toBeInTheDocument();
  });

  it('updates preview when dropping single valid image file', () => {
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('dropped-url');
    render(<CreateArtistForm {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const filesDescriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'files',
    ) as PropertyDescriptor;
    Object.defineProperty(fileInput, 'files', {
      ...filesDescriptor,
      set: () => {},
      configurable: true,
    });

    const file = new File(['x'], 'dropped.png', { type: 'image/png' });
    const dataTransfer = { files: [file] };

    fireEvent.drop(window, { dataTransfer });

    expect(createObjectUrlSpy).toHaveBeenCalledWith(file);
    expect(screen.getByAltText('Avatar preview')).toHaveAttribute('src', 'dropped-url');
  });

  it('hides drag overlay when drop occurs', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('dropped-url');
    render(<CreateArtistForm {...defaultProps} />);
    fireEvent.dragEnter(window, { dataTransfer: { items: [{}], files: [] } });
    expect(screen.getByText(/Drop avatar image here/i)).toBeInTheDocument();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const filesDescriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'files',
    ) as PropertyDescriptor;
    const filesSetSpy = vi.fn();
    Object.defineProperty(fileInput, 'files', {
      ...filesDescriptor,
      set: filesSetSpy,
      configurable: true,
    });

    const file = new File(['x'], 'dropped.png', { type: 'image/png' });
    fireEvent.drop(window, { dataTransfer: { files: [file] } });

    expect(screen.queryByText(/Drop avatar image here/i)).not.toBeInTheDocument();
    expect(filesSetSpy).toHaveBeenCalled();
  });

  it('shows Too Many Files dialog when dropping multiple files', () => {
    render(<CreateArtistForm {...defaultProps} />);

    const file1 = new File(['x'], 'a.png', { type: 'image/png' });
    const file2 = new File(['y'], 'b.png', { type: 'image/png' });
    const dataTransfer = { files: [file1, file2] };

    fireEvent.drop(window, { dataTransfer });

    expect(screen.getByText(/Too Many Files/i)).toBeInTheDocument();
    expect(
      screen.getByText(/You can only upload one an avatar picture at a time/i),
    ).toBeInTheDocument();
  });

  it('shows Invalid File Format dialog when dropping non-image file', () => {
    render(<CreateArtistForm {...defaultProps} />);

    const file = new File(['x'], 'document.pdf', { type: 'application/pdf' });
    const dataTransfer = { files: [file] };

    fireEvent.drop(window, { dataTransfer });

    expect(screen.getByText(/Invalid File Format/i)).toBeInTheDocument();
    expect(screen.getByText(/not a supported image format/i)).toBeInTheDocument();
  });

  it('closes Too Many Files dialog when OK is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateArtistForm {...defaultProps} />);

    const file1 = new File(['x'], 'a.png', { type: 'image/png' });
    const file2 = new File(['y'], 'b.png', { type: 'image/png' });
    fireEvent.drop(window, { dataTransfer: { files: [file1, file2] } });

    expect(screen.getByText(/Too Many Files/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^OK$/i }));
    expect(screen.queryByText(/Too Many Files/i)).not.toBeInTheDocument();
  });

  it('closes Invalid File Format dialog when OK is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateArtistForm {...defaultProps} />);

    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.drop(window, { dataTransfer: { files: [file] } });

    expect(screen.getByText(/Invalid File Format/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^OK$/i }));
    expect(screen.queryByText(/Invalid File Format/i)).not.toBeInTheDocument();
  });

  it('does not set dragging when dragenter has no items', () => {
    render(<CreateArtistForm {...defaultProps} />);
    fireEvent.dragEnter(window, { dataTransfer: { items: [], files: [] } });
    expect(screen.queryByText(/Drop avatar image here/i)).not.toBeInTheDocument();
  });

  it('handles dragover event', () => {
    render(<CreateArtistForm {...defaultProps} />);
    fireEvent.dragOver(window, { dataTransfer: { items: [] } });
    expect(screen.getByLabelText(/Artist Name/i)).toBeInTheDocument();
  });

  it('handles drop with no files', () => {
    render(<CreateArtistForm {...defaultProps} />);
    fireEvent.dragEnter(window, { dataTransfer: { items: [{}], files: [] } });
    expect(screen.getByText(/Drop avatar image here/i)).toBeInTheDocument();

    fireEvent.drop(window, { dataTransfer: { files: [] } });

    expect(screen.queryByText(/Drop avatar image here/i)).not.toBeInTheDocument();
  });

  it('handles drop with undefined dataTransfer', () => {
    render(<CreateArtistForm {...defaultProps} />);
    fireEvent.dragEnter(window, { dataTransfer: { items: [{}], files: [] } });
    fireEvent.drop(window, { dataTransfer: undefined } as unknown as DragEvent);

    expect(screen.queryByText(/Drop avatar image here/i)).not.toBeInTheDocument();
  });

  it('handles drop when file input ref is null', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('dropped-url');
    render(<CreateArtistForm {...defaultProps} _testHideFileInput />);

    const file = new File(['x'], 'dropped.png', { type: 'image/png' });
    fireEvent.drop(window, { dataTransfer: { files: [file] } });

    expect(screen.getByAltText('Avatar preview')).toHaveAttribute('src', 'dropped-url');
  });
});
