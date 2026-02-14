import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AlbumType } from '@repo/db';
import { CreateAlbumForm } from './CreateAlbumForm';

// Mocking Link because it needs router context
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('@/components/form', () => ({
  TextField: ({
    label,
    onChange,
    onBlur,
    value,
    error,
  }: {
    label: string;
    onChange: (v: string) => void;
    onBlur: () => void;
    value: string;
    error?: string;
  }) => (
    <div>
      <label>
        {label}
        <input value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
      </label>
      {error && <span>{error}</span>}
    </div>
  ),
  TextAreaField: ({
    label,
    onChange,
    onBlur,
    value,
    error,
  }: {
    label: string;
    onChange: (v: string) => void;
    onBlur: () => void;
    value: string;
    error?: string;
  }) => (
    <div>
      <label>
        {label}
        <textarea value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
      </label>
      {error && <span>{error}</span>}
    </div>
  ),
  DatePickerField: ({
    label,
    onChange,
    onBlur,
    value,
    error,
  }: {
    label: string;
    onChange: (v: Date | null) => void;
    onBlur: () => void;
    value?: Date;
    error?: string;
  }) => (
    <div>
      <label>{label}</label>
      <button
        onClick={() => onChange(new Date('2022-01-01'))}
        onBlur={onBlur}
        data-selected-date={value?.toISOString() ?? ''}
      >
        Mock Date Picker
      </button>
      <button onClick={() => onChange(null)}>Clear Date</button>
      {error && <span>{error}</span>}
    </div>
  ),
}));

describe('CreateAlbumForm', () => {
  const mockOnSubmit = vi.fn((e) => e.preventDefault());
  const mockOnChange = vi.fn();
  const mockOnBlur = vi.fn();
  const mockGetFieldError = vi.fn();
  const mockOnFileSelect = vi.fn();

  const defaultProps = {
    formData: {
      name: '',
      description: '',
      type: AlbumType.album,
      artistId: '123',
      releaseDate: null,
    },
    isLoading: false,
    isValid: true,
    onSubmit: mockOnSubmit,
    onChange: mockOnChange,
    onBlur: mockOnBlur,
    getFieldError: mockGetFieldError,
    onFileSelect: mockOnFileSelect,
  };

  it('renders correctly', () => {
    render(<CreateAlbumForm {...defaultProps} />);

    expect(screen.getByLabelText(/Album Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByText(/Release Date/i)).toBeInTheDocument();
    expect(screen.getByText(/Mock Date Picker/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Album/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByText(/Artwork/i)).toBeInTheDocument();
  });

  it('handles field changes', async () => {
    const user = userEvent.setup();
    render(<CreateAlbumForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Album Title/i);
    await user.type(nameInput, 'Nevermind');
    expect(mockOnChange).toHaveBeenCalledWith('name', 'N');

    const descInput = screen.getByLabelText(/Description/i);
    await user.type(descInput, 'Grunge');
    expect(mockOnChange).toHaveBeenCalledWith('description', 'G');
  });

  it('handles field blur', async () => {
    const user = userEvent.setup();
    render(<CreateAlbumForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Album Title/i);
    await user.click(nameInput);
    await user.tab();
    expect(mockOnBlur).toHaveBeenCalledWith('name');

    const descInput = screen.getByLabelText(/Description/i);
    await user.click(descInput);
    await user.tab();
    expect(mockOnBlur).toHaveBeenCalledWith('description');
  });

  it('handles release date changes', async () => {
    const user = userEvent.setup();
    render(<CreateAlbumForm {...defaultProps} />);

    const datePickerButton = screen.getByText(/Mock Date Picker/i);
    await user.click(datePickerButton);

    expect(mockOnChange).toHaveBeenCalledWith('releaseDate', expect.any(Date));

    await user.tab();
    expect(mockOnBlur).toHaveBeenCalledWith('releaseDate');
  });

  it('handles clearing the release date', async () => {
    const user = userEvent.setup();
    render(<CreateAlbumForm {...defaultProps} />);

    await user.click(screen.getByText(/Clear Date/i));

    expect(mockOnChange).toHaveBeenCalledWith('releaseDate', null);
  });

  it('displays validation errors', () => {
    mockGetFieldError.mockImplementation((field) => {
      if (field === 'name') return 'Title is required';
      return undefined;
    });

    render(<CreateAlbumForm {...defaultProps} />);
    expect(screen.getByText('Title is required')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<CreateAlbumForm {...defaultProps} isLoading={true} />);
    expect(screen.getByText(/Creating.../i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Creating.../i })).toBeDisabled();
  });

  it('disables submit button when form is invalid', () => {
    render(<CreateAlbumForm {...defaultProps} isValid={false} />);
    expect(screen.getByRole('button', { name: /Create Album/i })).toBeDisabled();
  });

  it('handles file selection and preview', async () => {
    const user = userEvent.setup();
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');

    render(<CreateAlbumForm {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['blob'], 'test.png', { type: 'image/png' });

    await user.upload(fileInput, file);

    expect(createObjectUrlSpy).toHaveBeenCalledWith(file);
    expect(mockOnFileSelect).toHaveBeenCalledWith(file);
    expect(screen.getByAltText('Cover Preview')).toHaveAttribute('src', 'mock-url');
    expect(screen.getByText('Change Cover')).toBeInTheDocument();
  });

  it('handles file removal', async () => {
    const user = userEvent.setup();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');

    render(<CreateAlbumForm {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['blob'], 'test.png', { type: 'image/png' });

    await user.upload(fileInput, file);

    const removeButton = screen.getByRole('button', { name: /Remove image/i });
    await user.click(removeButton);

    expect(screen.queryByAltText('Cover Preview')).not.toBeInTheDocument();
    expect(mockOnFileSelect).toHaveBeenLastCalledWith(null);
  });

  it('handles file input selection with no files', async () => {
    render(<CreateAlbumForm {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [] } });

    expect(mockOnFileSelect).toHaveBeenCalledWith(null);
  });

  it('triggers click on hidden file input when cover container is clicked', () => {
    render(<CreateAlbumForm {...defaultProps} />);
    const coverContainer = screen.getByText(/Upload Cover/i).closest('div');
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    fireEvent.click(coverContainer!);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('renders date picker with existing release date value', () => {
    const releaseDate = new Date('2022-06-15T00:00:00.000Z');
    render(
      <CreateAlbumForm
        {...defaultProps}
        formData={{
          ...defaultProps.formData,
          releaseDate,
        }}
      />,
    );

    const datePickerButton = screen.getByText(/Mock Date Picker/i);
    expect(datePickerButton).toHaveAttribute('data-selected-date', releaseDate.toISOString());
  });
});
