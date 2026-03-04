import { AlbumType, FileBucket, ImageUploadStatus, Visibility } from '@repo/db';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditAlbumForm } from './EditAlbumForm';
import { ZodAlbum } from '@repo/contracts';

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
        <input value={value || ''} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
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
        <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
      </label>
      {error && <span>{error}</span>}
    </div>
  ),
  SelectField: ({
    label,
    onChange,
    onBlur,
    value,
    error,
    options,
  }: {
    label: string;
    onChange: (v: string) => void;
    onBlur: () => void;
    value: string;
    error?: string;
    options: { value: string; label: string }[];
  }) => (
    <div>
      <label>
        {label}
        <select value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
          <option value="invalid_type">Invalid</option>
        </select>
      </label>
      {error && <span>{error}</span>}
    </div>
  ),
  DatePickerField: ({
    label,
    onChange,
    onBlur,
    error,
  }: {
    label: string;
    onChange: (v: Date | null) => void;
    onBlur: () => void;
    error?: string;
  }) => (
    <div>
      <label>{label}</label>
      <button onClick={() => onChange(new Date('2022-01-01'))} onBlur={onBlur}>
        Mock Date Picker
      </button>
      <button onClick={() => onChange(null)}>Clear Date</button>
      {error && <span>{error}</span>}
    </div>
  ),
}));

describe('EditAlbumForm', () => {
  const mockAlbum: ZodAlbum = {
    id: 'album-1',
    name: 'Original Name',
    description: 'Original Description',
    type: AlbumType.album,
    releaseDate: new Date('2020-01-01'),
    totalTracks: 10,
    totalDuration: 3000,
    coverId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    visibility: Visibility.public,
    cover: null,
  };

  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    album: mockAlbum,
    isLoading: false,
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with initial values', () => {
    render(<EditAlbumForm {...defaultProps} />);

    expect(screen.getByLabelText(/Album Title/i)).toHaveValue('Original Name');
    expect(screen.getByLabelText(/Description/i)).toHaveValue('Original Description');
    expect(screen.getByLabelText(/Album Type/i)).toHaveValue(AlbumType.album);
    expect(screen.getByText(/Release Date/i)).toBeInTheDocument();
    expect(screen.getByText(/Mock Date Picker/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('handles field changes and local validation', async () => {
    const user = userEvent.setup();
    render(<EditAlbumForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Album Title/i);
    await user.clear(nameInput);
    await user.tab();

    expect(await screen.findByText(/Album name cannot be empty/i)).toBeInTheDocument();

    await user.type(nameInput, 'New Name');
    expect(nameInput).toHaveValue('New Name');
  });

  it('handles description length validation', async () => {
    const user = userEvent.setup();
    render(<EditAlbumForm {...defaultProps} />);

    const descInput = screen.getByLabelText(/Description/i);
    // Triggering long text change
    fireEvent.change(descInput, { target: { value: 'a'.repeat(2050) } });
    await user.tab();

    expect(
      await screen.findByText(/Description must be 2048 characters or less/i),
    ).toBeInTheDocument();
  });

  it('handles cover selection and preview', async () => {
    const user = userEvent.setup();
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');

    render(<EditAlbumForm {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['blob'], 'test.png', { type: 'image/png' });

    await user.upload(fileInput, file);

    expect(createObjectUrlSpy).toHaveBeenCalledWith(file);
    // The image has alt={album.name} which is "Original Name"
    const previews = screen.getAllByAltText('Original Name');
    expect(previews[0]).toHaveAttribute('src', 'mock-url');
    expect(screen.getByText('Change Cover')).toBeInTheDocument();
  });

  it('handles cover removal', async () => {
    const user = userEvent.setup();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');

    render(<EditAlbumForm {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['blob'], 'test.png', { type: 'image/png' });

    await user.upload(fileInput, file);

    const removeButton = screen.getByRole('button', { name: /Remove/i });
    await user.click(removeButton);

    expect(screen.queryByText(/Remove/i)).not.toBeInTheDocument();
    expect(fileInput.value).toBe('');
  });

  it('handles file change with no selection', async () => {
    render(<EditAlbumForm {...defaultProps} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [] } });
    // Should reset or stay undefined
    expect(screen.queryByText(/Remove/i)).not.toBeInTheDocument();
  });

  it('calls onSubmit with isCoverRemoved when cover is removed before submit', async () => {
    const user = userEvent.setup();
    const albumWithCover: ZodAlbum = {
      ...mockAlbum,
      coverId: 'cover-123',
      cover: {
        id: 'img-1',
        url: 'https://existing.com/cover.jpg',
        key: 'key-1',
        alt: 'alt-1',
        bucket: FileBucket.public,
        mimeType: 'image/jpeg',
        uploadStatus: ImageUploadStatus.uploaded,
        blurhash: null,
        reportId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    };
    render(<EditAlbumForm {...defaultProps} album={albumWithCover} />);

    const removeButton = screen.getByRole('button', { name: /Remove/i });
    await user.click(removeButton);

    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ coverId: null }),
        undefined,
        true,
      );
    });
  });

  it('calls onSubmit with form values and selected cover', async () => {
    const user = userEvent.setup();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');

    render(<EditAlbumForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Album Title/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Album');

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['blob'], 'new-cover.png', { type: 'image/png' });
    await user.upload(fileInput, file);

    const submitButton = screen.getByRole('button', { name: /Save Changes/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Album',
        }),
        file,
        false,
      );
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<EditAlbumForm {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<EditAlbumForm {...defaultProps} isLoading={true} />);

    expect(screen.getByText(/Saving.../i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Saving.../i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
  });

  it('displays server errors', () => {
    render(
      <EditAlbumForm
        {...defaultProps}
        serverErrors={{ name: 'Server Name Error', description: 'Server Desc Error' }}
      />,
    );

    expect(screen.getByText('Server Name Error')).toBeInTheDocument();
    expect(screen.getByText('Server Desc Error')).toBeInTheDocument();
  });

  it('displays existing cover if available', () => {
    const albumWithCover: ZodAlbum = {
      ...mockAlbum,
      cover: {
        id: 'img-1',
        url: 'https://existing-url.com/img.jpg',
        key: 'key-1',
        alt: 'alt-1',
        bucket: FileBucket.public,
        mimeType: 'image/jpeg',
        uploadStatus: ImageUploadStatus.uploaded,
        blurhash: null,
        reportId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    };
    render(<EditAlbumForm {...defaultProps} album={albumWithCover} />);

    const img = screen.getAllByAltText('Original Name')[0];
    expect(img).toHaveAttribute('src', 'https://existing-url.com/img.jpg');
  });

  it('triggers file selection when cover container is clicked', () => {
    render(<EditAlbumForm {...defaultProps} />);
    const coverContainer = screen.getByText(/Upload Cover/i).closest('div');
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    fireEvent.click(coverContainer!);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('updates type and release date', async () => {
    const user = userEvent.setup();
    render(<EditAlbumForm {...defaultProps} />);

    const typeSelect = screen.getByLabelText(/Album Type/i);
    await user.selectOptions(typeSelect, AlbumType.single);
    expect(typeSelect).toHaveValue(AlbumType.single);

    const datePickerButton = screen.getByText(/Mock Date Picker/i);
    await user.click(datePickerButton);

    // Clear date branch
    await user.click(screen.getByText(/Clear Date/i));

    const submitButton = screen.getByRole('button', { name: /Save Changes/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AlbumType.single,
          releaseDate: null,
        }),
        undefined,
        false,
      );
    });
  });

  it('does not update type when an invalid value is selected', async () => {
    const user = userEvent.setup();
    render(<EditAlbumForm {...defaultProps} />);

    const typeSelect = screen.getByLabelText(/Album Type/i);
    await user.selectOptions(typeSelect, 'invalid_type');

    // Type should remain unchanged since 'invalid_type' is not in AlbumType
    expect(typeSelect).toHaveValue(AlbumType.album);
  });

  it('renders with null description', () => {
    const albumNoDescription: ZodAlbum = {
      ...mockAlbum,
      description: null,
    };
    render(<EditAlbumForm {...defaultProps} album={albumNoDescription} />);

    expect(screen.getByLabelText(/Description/i)).toHaveValue('');
  });

  it('renders with null releaseDate', () => {
    const albumNoDate: ZodAlbum = {
      ...mockAlbum,
      releaseDate: null,
    };
    render(<EditAlbumForm {...defaultProps} album={albumNoDate} />);

    expect(screen.getByText(/Mock Date Picker/i)).toBeInTheDocument();
  });

  it('does not set dragging when dragenter has no items', () => {
    render(<EditAlbumForm {...defaultProps} />);
    fireEvent.dragEnter(window, { dataTransfer: { items: [], files: [] } });
    expect(screen.queryByText(/Drop cover image here/i)).not.toBeInTheDocument();
  });

  it('does not set dragging when dragenter has undefined dataTransfer', () => {
    render(<EditAlbumForm {...defaultProps} />);
    fireEvent.dragEnter(window, { dataTransfer: undefined } as unknown as DragEvent);
    expect(screen.queryByText(/Drop cover image here/i)).not.toBeInTheDocument();
  });


  it('handles drop with undefined dataTransfer', () => {
    render(<EditAlbumForm {...defaultProps} />);
    fireEvent.dragEnter(window, { dataTransfer: { items: [{}], files: [] } });
    fireEvent.drop(window, { dataTransfer: undefined } as unknown as DragEvent);
    expect(screen.queryByText(/Drop cover image here/i)).not.toBeInTheDocument();
  });

  it('handles drop with no files', () => {
    render(<EditAlbumForm {...defaultProps} />);
    fireEvent.dragEnter(window, { dataTransfer: { items: [{}], files: [] } });
    expect(screen.getByText(/Drop cover image here/i)).toBeInTheDocument();
    fireEvent.drop(window, { dataTransfer: { files: [] } });
    expect(screen.queryByText(/Drop cover image here/i)).not.toBeInTheDocument();
  });

  it('handles dragover event', () => {
    render(<EditAlbumForm {...defaultProps} />);
    fireEvent.dragOver(window, { dataTransfer: { items: [] } });
    expect(screen.getByLabelText(/Album Title/i)).toBeInTheDocument();
  });

  it('keeps drag overlay visible during nested drag events', () => {
    render(<EditAlbumForm {...defaultProps} />);
    fireEvent.dragEnter(window, { dataTransfer: { items: [{}], files: [] } });
    fireEvent.dragEnter(window, { dataTransfer: { items: [{}], files: [] } });
    expect(screen.getByText(/Drop cover image here/i)).toBeInTheDocument();

    fireEvent.dragLeave(window, { dataTransfer: {} });
    expect(screen.getByText(/Drop cover image here/i)).toBeInTheDocument();

    fireEvent.dragLeave(window, { dataTransfer: {} });
    expect(screen.queryByText(/Drop cover image here/i)).not.toBeInTheDocument();
  });

  it('shows Invalid File Format dialog when dropping non-image file', () => {
    render(<EditAlbumForm {...defaultProps} />);
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.drop(window, { dataTransfer: { files: [file] } });

    expect(screen.getByText(/Invalid File Format/i)).toBeInTheDocument();
  });

  it('shows Too Many Files dialog when dropping multiple files', () => {
    render(<EditAlbumForm {...defaultProps} />);
    const file1 = new File(['x'], 'a.png', { type: 'image/png' });
    const file2 = new File(['y'], 'b.png', { type: 'image/png' });
    fireEvent.drop(window, { dataTransfer: { files: [file1, file2] } });

    expect(screen.getByText(/Too Many Files/i)).toBeInTheDocument();
  });

  it('hides drag overlay when drop occurs', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('dropped-url');
    render(<EditAlbumForm {...defaultProps} />);
    fireEvent.dragEnter(window, { dataTransfer: { items: [{}], files: [] } });
    expect(screen.getByText(/Drop cover image here/i)).toBeInTheDocument();

    const coverInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const filesDescriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'files',
    ) as PropertyDescriptor;
    const filesSetSpy = vi.fn();
    Object.defineProperty(coverInput, 'files', {
      ...filesDescriptor,
      set: filesSetSpy,
      configurable: true,
    });

    const file = new File(['x'], 'dropped.png', { type: 'image/png' });
    fireEvent.drop(window, { dataTransfer: { files: [file] } });

    expect(screen.queryByText(/Drop cover image here/i)).not.toBeInTheDocument();
    expect(filesSetSpy).toHaveBeenCalled();
  });

  it('handles drop when cover input ref is null', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url');
    render(<EditAlbumForm {...defaultProps} _testHideCoverInput />);

    const file = new File(['x'], 'dropped.png', { type: 'image/png' });
    fireEvent.drop(window, { dataTransfer: { files: [file] } });

    const images = screen.getAllByAltText('Original Name');
    expect(images.some((img) => img.getAttribute('src') === 'mock-url')).toBe(true);
  });

  it('closes Too Many Files dialog when Close is clicked', async () => {
    const user = userEvent.setup();
    render(<EditAlbumForm {...defaultProps} />);
    fireEvent.drop(window, {
      dataTransfer: {
        files: [
          new File(['x'], 'a.png', { type: 'image/png' }),
          new File(['y'], 'b.png', { type: 'image/png' }),
        ],
      },
    });
    expect(screen.getByText(/Too Many Files/i)).toBeInTheDocument();
    const dialogs = screen.getAllByRole('dialog');
    const tooManyDialog = dialogs.find((d) => d.textContent?.includes('Too Many Files'));
    const closeButtons = within(tooManyDialog!).getAllByRole('button', { name: /Close/i });
    await user.click(closeButtons[closeButtons.length - 1]);
    expect(screen.queryByText(/Too Many Files/i)).not.toBeInTheDocument();
  });

  it('closes Invalid File Format dialog when Close is clicked', async () => {
    const user = userEvent.setup();
    render(<EditAlbumForm {...defaultProps} />);
    fireEvent.drop(window, {
      dataTransfer: { files: [new File(['x'], 'doc.pdf', { type: 'application/pdf' })] },
    });
    expect(screen.getByText(/Invalid File Format/i)).toBeInTheDocument();
    const dialogs = screen.getAllByRole('dialog');
    const formatDialog = dialogs.find((d) => d.textContent?.includes('Invalid File Format'));
    const closeButtons = within(formatDialog!).getAllByRole('button', { name: /Close/i });
    await user.click(closeButtons[closeButtons.length - 1]);
    expect(screen.queryByText(/Invalid File Format/i)).not.toBeInTheDocument();
  });

  it('renders with coverId but no cover object', () => {
    const albumWithIdOnly: ZodAlbum = {
      ...mockAlbum,
      coverId: 'cover-123',
      cover: null,
    };
    render(<EditAlbumForm {...defaultProps} album={albumWithIdOnly} />);

    expect(screen.getByText(/Upload Cover/i)).toBeInTheDocument();
  });
});
