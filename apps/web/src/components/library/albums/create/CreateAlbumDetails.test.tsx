import { AlbumType } from '@repo/db';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateAlbumDetails } from './CreateAlbumDetails';

vi.mock('@/components/form', () => ({
  TextField: (props: {
    label: string;
    onChange: (v: string) => void;
    onBlur: () => void;
    value: string;
    error?: string;
  }) => (
    <div>
      <label>
        {props.label}
        <input
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          onBlur={props.onBlur}
        />
      </label>
      {props.error && <div data-testid="error-message">{props.error}</div>}
    </div>
  ),
  TextAreaField: (props: {
    label: string;
    onChange: (v: string) => void;
    onBlur: () => void;
    value: string;
    error?: string;
  }) => (
    <div>
      <label>
        {props.label}
        <textarea
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          onBlur={props.onBlur}
        />
      </label>
      {props.error && <div data-testid="error-message">{props.error}</div>}
    </div>
  ),
  DatePickerField: (props: {
    label: string;
    onChange: (v: Date | null) => void;
    onBlur: () => void;
    value?: Date;
    error?: string;
  }) => (
    <div>
      <label>
        {props.label}
        <button
          onClick={() => props.onChange(new Date('2022-01-01'))}
          onBlur={props.onBlur}
          data-selected-date={props.value?.toISOString() ?? ''}
        >
          Mock Date Picker
        </button>
      </label>
      <button onClick={() => props.onChange(null)}>Clear Date</button>
      {props.error && <div data-testid="error-message">{props.error}</div>}
    </div>
  ),
}));

describe('CreateAlbumDetails', () => {
  const mockOnChange = vi.fn();
  const mockOnBlur = vi.fn();
  const mockGetFieldError = vi.fn();
  const mockOnCoverClick = vi.fn();
  const mockOnRemoveImage = vi.fn();

  const defaultFormData = {
    name: '',
    description: '',
    type: AlbumType.album,
    artistId: '123',
    releaseDate: null,
  };

  const defaultProps = {
    formData: defaultFormData,
    type: AlbumType.album,
    typeLabel: 'Album',
    previewUrl: null,
    getFieldError: mockGetFieldError,
    onChange: mockOnChange,
    onBlur: mockOnBlur,
    onCoverClick: mockOnCoverClick,
    onRemoveImage: mockOnRemoveImage,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<CreateAlbumDetails {...defaultProps} />);

    expect(screen.getByLabelText(/Album Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Release Date/i)).toBeInTheDocument();
    expect(screen.getByText(/Upload Cover/i)).toBeInTheDocument();
  });

  it('handles field changes', async () => {
    const user = userEvent.setup();
    render(<CreateAlbumDetails {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Album Title/i);
    await user.type(nameInput, 'Nevermind');
    expect(mockOnChange).toHaveBeenCalledWith('name', 'N');
  });

  it('handles field blur', async () => {
    const user = userEvent.setup();
    render(<CreateAlbumDetails {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Album Title/i);
    await user.click(nameInput);
    await user.tab();
    expect(mockOnBlur).toHaveBeenCalledWith('name');
  });

  it('handles release date changes', async () => {
    const user = userEvent.setup();
    render(<CreateAlbumDetails {...defaultProps} />);

    const datePickerButton = screen.getByText(/Mock Date Picker/i);
    await user.click(datePickerButton);

    expect(mockOnChange).toHaveBeenCalledWith('releaseDate', expect.any(Date));
  });

  it('handles release date clearing', async () => {
    const user = userEvent.setup();
    render(<CreateAlbumDetails {...defaultProps} />);

    const clearDateButton = screen.getByText(/Clear Date/i);
    await user.click(clearDateButton);

    expect(mockOnChange).toHaveBeenCalledWith('releaseDate', null);
  });

  it('renders existing release date', () => {
    const formDataWithDate = {
      ...defaultFormData,
      releaseDate: new Date('2023-01-01'),
    };
    render(<CreateAlbumDetails {...defaultProps} formData={formDataWithDate} />);
    expect(screen.getByLabelText(/Release Date/i)).toBeInTheDocument();
  });

  it('displays validation errors', () => {
    mockGetFieldError.mockImplementation((field) =>
      field === 'name' ? 'Title is required' : undefined,
    );
    render(<CreateAlbumDetails {...defaultProps} />);
    expect(screen.getByText('Title is required')).toBeInTheDocument();
  });

  it('handles field changes for description', async () => {
    const user = userEvent.setup();
    render(<CreateAlbumDetails {...defaultProps} />);

    const descInput = screen.getByLabelText(/Description/i);
    await user.type(descInput, 'A great album');
    expect(mockOnChange).toHaveBeenCalledWith('description', 'A');
  });

  it('handles field blur for description', async () => {
    const user = userEvent.setup();
    render(<CreateAlbumDetails {...defaultProps} />);

    const descInput = screen.getByLabelText(/Description/i);
    await user.click(descInput);
    await user.tab();
    expect(mockOnBlur).toHaveBeenCalledWith('description');
  });

  it('handles field blur for release date', async () => {
    const user = userEvent.setup();
    render(<CreateAlbumDetails {...defaultProps} />);

    const datePickerButton = screen.getByText(/Mock Date Picker/i);
    await user.click(datePickerButton);
    await user.tab();
    expect(mockOnBlur).toHaveBeenCalledWith('releaseDate');
  });

  it('shows preview and remove button when previewUrl is provided', () => {
    render(<CreateAlbumDetails {...defaultProps} previewUrl="mock-url" />);
    expect(screen.getByAltText(/Cover Preview/i)).toHaveAttribute('src', 'mock-url');
    expect(screen.getByRole('button', { name: /Remove/i })).toBeInTheDocument();
  });

  it('calls onCoverClick when upload area is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateAlbumDetails {...defaultProps} />);
    await user.click(screen.getByText(/Upload Cover/i));
    expect(mockOnCoverClick).toHaveBeenCalled();
  });

  it('calls onRemoveImage when remove button is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateAlbumDetails {...defaultProps} previewUrl="mock-url" />);
    await user.click(screen.getByRole('button', { name: /Remove/i }));
    expect(mockOnRemoveImage).toHaveBeenCalled();
  });
});
