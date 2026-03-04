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

    const removeButton = screen.getByRole('button', { name: /Remove/i });
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

  it('renders type-specific labels when type is ep', () => {
    render(<CreateAlbumForm {...defaultProps} type="ep" />);
    expect(screen.getByLabelText(/Ep Title/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Ep/i })).toBeInTheDocument();
  });

  it('renders type-specific labels when type is single', () => {
    render(<CreateAlbumForm {...defaultProps} type="single" />);
    expect(screen.getByLabelText(/Single Title/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Single/i })).toBeInTheDocument();
  });

  it('does not set dragging when dragenter has no items', () => {
    render(<CreateAlbumForm {...defaultProps} />);
    fireEvent.dragEnter(window, { dataTransfer: { items: [], files: [] } });
    expect(screen.queryByText(/Drop cover image here/i)).not.toBeInTheDocument();
  });

  it('handles drop with no files', () => {
    render(<CreateAlbumForm {...defaultProps} />);
    fireEvent.dragEnter(window, { dataTransfer: { items: [{}], files: [] } });
    expect(screen.getByText(/Drop cover image here/i)).toBeInTheDocument();
    fireEvent.drop(window, { dataTransfer: { files: [] } });
    expect(screen.queryByText(/Drop cover image here/i)).not.toBeInTheDocument();
  });

  it('handles dragover event', () => {
    render(<CreateAlbumForm {...defaultProps} />);
    fireEvent.dragOver(window, { dataTransfer: { items: [] } });
    expect(screen.getByLabelText(/Album Title/i)).toBeInTheDocument();
  });

  it('keeps drag overlay visible during nested drag events', () => {
    render(<CreateAlbumForm {...defaultProps} />);
    fireEvent.dragEnter(window, { dataTransfer: { items: [{}], files: [] } });
    fireEvent.dragEnter(window, { dataTransfer: { items: [{}], files: [] } });
    expect(screen.getByText(/Drop cover image here/i)).toBeInTheDocument();

    fireEvent.dragLeave(window, { dataTransfer: {} });
    expect(screen.getByText(/Drop cover image here/i)).toBeInTheDocument();

    fireEvent.dragLeave(window, { dataTransfer: {} });
    expect(screen.queryByText(/Drop cover image here/i)).not.toBeInTheDocument();
  });

  it('shows Invalid File Format dialog when dropping non-image file', () => {
    render(<CreateAlbumForm {...defaultProps} />);
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.drop(window, { dataTransfer: { files: [file] } });

    expect(screen.getByText(/Invalid File Format/i)).toBeInTheDocument();
    expect(screen.getByText(/not a supported image format/i)).toBeInTheDocument();
  });

  it('shows Too Many Files dialog when dropping multiple files', () => {
    render(<CreateAlbumForm {...defaultProps} />);
    const file1 = new File(['x'], 'a.png', { type: 'image/png' });
    const file2 = new File(['y'], 'b.png', { type: 'image/png' });
    fireEvent.drop(window, { dataTransfer: { files: [file1, file2] } });

    expect(screen.getByText(/Too Many Files/i)).toBeInTheDocument();
    expect(screen.getByText(/You can only upload one cover image at a time/i)).toBeInTheDocument();
  });

  it('hides drag overlay when drop occurs', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('dropped-url');
    render(<CreateAlbumForm {...defaultProps} />);
    fireEvent.dragEnter(window, { dataTransfer: { items: [{}], files: [] } });
    expect(screen.getByText(/Drop cover image here/i)).toBeInTheDocument();

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

    expect(screen.queryByText(/Drop cover image here/i)).not.toBeInTheDocument();
    expect(filesSetSpy).toHaveBeenCalled();
  });

  it('closes Too Many Files dialog when OK is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateAlbumForm {...defaultProps} />);
    fireEvent.drop(window, {
      dataTransfer: {
        files: [
          new File(['x'], 'a.png', { type: 'image/png' }),
          new File(['y'], 'b.png', { type: 'image/png' }),
        ],
      },
    });
    expect(screen.getByText(/Too Many Files/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^OK$/i }));
    expect(screen.queryByText(/Too Many Files/i)).not.toBeInTheDocument();
  });

  it('handles drop when file input ref is null', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('dropped-url');
    render(<CreateAlbumForm {...defaultProps} _testHideFileInput />);

    const file = new File(['x'], 'dropped.png', { type: 'image/png' });
    fireEvent.drop(window, { dataTransfer: { files: [file] } });

    expect(screen.getByAltText('Cover Preview')).toHaveAttribute('src', 'dropped-url');
    expect(mockOnFileSelect).toHaveBeenCalledWith(file);
  });

  it('closes Invalid File Format dialog when OK is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateAlbumForm {...defaultProps} />);
    fireEvent.drop(window, {
      dataTransfer: { files: [new File(['x'], 'doc.pdf', { type: 'application/pdf' })] },
    });
    expect(screen.getByText(/Invalid File Format/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^OK$/i }));
    expect(screen.queryByText(/Invalid File Format/i)).not.toBeInTheDocument();
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
