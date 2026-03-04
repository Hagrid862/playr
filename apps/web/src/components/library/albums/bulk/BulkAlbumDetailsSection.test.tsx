import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AlbumType } from '@repo/db';
import { BulkAlbumDetailsSection } from './BulkAlbumDetailsSection';

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
  }: {
    label: string;
    onChange: (v: string) => void;
    onBlur: () => void;
    value: string;
  }) => (
    <div>
      <label>{label}</label>
      <input
        data-testid={`field-${label.toLowerCase().replace(/\s/g, '-')}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </div>
  ),
  TextAreaField: ({
    label,
    onChange,
    onBlur,
    value,
  }: {
    label: string;
    onChange: (v: string) => void;
    onBlur: () => void;
    value: string;
  }) => (
    <div>
      <label>{label}</label>
      <textarea
        data-testid="field-description"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </div>
  ),
  SelectField: ({
    label,
    placeholder,
    value,
    options,
    onChange,
    onBlur,
  }: {
    label: string;
    placeholder: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
    onBlur: () => void;
  }) => (
    <div>
      <label>{label}</label>
      <select
        data-testid={`select-${label.toLowerCase()}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  ),
  DatePickerField: ({
    label,
    onChange,
    onBlur,
    value,
  }: {
    label: string;
    onChange: (date: Date | null) => void;
    onBlur: () => void;
    value?: Date;
  }) => (
    <div>
      <label>{label}</label>
      <button
        data-testid="date-picker-set"
        onClick={() => onChange(new Date('2022-01-01'))}
      >
        Set Date
      </button>
      <button data-testid="date-picker-clear" onClick={() => onChange(null)}>
        Clear Date
      </button>
      <span data-testid="date-value">{value?.toISOString() ?? 'none'}</span>
      <input data-testid="date-picker-blur" onBlur={onBlur} />
    </div>
  ),
}));

describe('BulkAlbumDetailsSection', () => {
  const mockOnUpdate = vi.fn();

  const defaultFormData = {
    name: 'Nevermind',
    description: 'Grunge album',
    type: AlbumType.album,
    artistId: 'artist-1',
    releaseDate: new Date('1991-09-24') as Date | null,
  };

  const defaultArtists = [
    { id: 'artist-1', name: 'Nirvana' },
    { id: 'artist-2', name: 'Foo Fighters' },
  ];

  beforeEach(() => {
    mockOnUpdate.mockClear();
  });

  it('renders with provided formData', () => {
    render(
      <BulkAlbumDetailsSection
        formData={defaultFormData}
        artists={defaultArtists}
        isLoadingArtists={false}
        onUpdate={mockOnUpdate}
      />,
    );

    expect(screen.getByText('Album details')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Nevermind')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Grunge album')).toBeInTheDocument();
    expect(screen.getByTestId('select-artist')).toHaveValue('artist-1');
  });

  it('shows Loading... placeholder when isLoadingArtists', () => {
    render(
      <BulkAlbumDetailsSection
        formData={defaultFormData}
        artists={[]}
        isLoadingArtists={true}
        onUpdate={mockOnUpdate}
      />,
    );

    const artistSelect = screen.getByTestId('select-artist');
    expect(artistSelect).toHaveTextContent('Loading...');
  });

  it('shows No artists yet placeholder when artists list is empty and not loading', () => {
    render(
      <BulkAlbumDetailsSection
        formData={defaultFormData}
        artists={[]}
        isLoadingArtists={false}
        onUpdate={mockOnUpdate}
      />,
    );

    const artistSelect = screen.getByTestId('select-artist');
    expect(artistSelect).toHaveTextContent('No artists yet');
  });

  it('shows Create an artist link when artists list is empty and not loading', () => {
    render(
      <BulkAlbumDetailsSection
        formData={defaultFormData}
        artists={[]}
        isLoadingArtists={false}
        onUpdate={mockOnUpdate}
      />,
    );

    const link = screen.getByRole('link', { name: /Create an artist/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/app/library/albums/create');
    expect(screen.getByText(/first to add albums\./)).toBeInTheDocument();
  });

  it('does not show Create an artist link when loading artists', () => {
    render(
      <BulkAlbumDetailsSection
        formData={defaultFormData}
        artists={[]}
        isLoadingArtists={true}
        onUpdate={mockOnUpdate}
      />,
    );

    expect(screen.queryByRole('link', { name: /Create an artist/i })).not.toBeInTheDocument();
  });

  it('does not show Create an artist link when artists exist', () => {
    render(
      <BulkAlbumDetailsSection
        formData={defaultFormData}
        artists={defaultArtists}
        isLoadingArtists={false}
        onUpdate={mockOnUpdate}
      />,
    );

    expect(screen.queryByRole('link', { name: /Create an artist/i })).not.toBeInTheDocument();
  });

  it('calls onUpdate when album name changes', () => {
    render(
      <BulkAlbumDetailsSection
        formData={defaultFormData}
        artists={defaultArtists}
        isLoadingArtists={false}
        onUpdate={mockOnUpdate}
      />,
    );

    const nameInput = screen.getByDisplayValue('Nevermind');
    fireEvent.change(nameInput, { target: { value: 'In Utero' } });

    expect(mockOnUpdate).toHaveBeenCalledWith('name', 'In Utero');
  });

  it('calls onUpdate when artist is selected', () => {
    render(
      <BulkAlbumDetailsSection
        formData={{ ...defaultFormData, artistId: '' }}
        artists={defaultArtists}
        isLoadingArtists={false}
        onUpdate={mockOnUpdate}
      />,
    );

    const artistSelect = screen.getByTestId('select-artist');
    fireEvent.change(artistSelect, { target: { value: 'artist-2' } });

    expect(mockOnUpdate).toHaveBeenCalledWith('artistId', 'artist-2');
  });

  it('calls onUpdate when album type changes', () => {
    render(
      <BulkAlbumDetailsSection
        formData={defaultFormData}
        artists={defaultArtists}
        isLoadingArtists={false}
        onUpdate={mockOnUpdate}
      />,
    );

    const typeSelect = screen.getByTestId('select-album type');
    fireEvent.change(typeSelect, { target: { value: AlbumType.ep } });

    expect(mockOnUpdate).toHaveBeenCalledWith('type', AlbumType.ep);
  });

  it('calls onUpdate when release date is set', async () => {
    const user = userEvent.setup();
    render(
      <BulkAlbumDetailsSection
        formData={{ ...defaultFormData, releaseDate: null }}
        artists={defaultArtists}
        isLoadingArtists={false}
        onUpdate={mockOnUpdate}
      />,
    );

    await user.click(screen.getByTestId('date-picker-set'));

    expect(mockOnUpdate).toHaveBeenCalledWith('releaseDate', expect.any(Date));
  });

  it('calls onUpdate when release date is cleared', async () => {
    const user = userEvent.setup();
    render(
      <BulkAlbumDetailsSection
        formData={defaultFormData}
        artists={defaultArtists}
        isLoadingArtists={false}
        onUpdate={mockOnUpdate}
      />,
    );

    await user.click(screen.getByTestId('date-picker-clear'));

    expect(mockOnUpdate).toHaveBeenCalledWith('releaseDate', null);
  });

  it('calls onUpdate when description changes', () => {
    render(
      <BulkAlbumDetailsSection
        formData={defaultFormData}
        artists={defaultArtists}
        isLoadingArtists={false}
        onUpdate={mockOnUpdate}
      />,
    );

    const descInput = screen.getByTestId('field-description');
    fireEvent.change(descInput, { target: { value: 'New description' } });

    expect(mockOnUpdate).toHaveBeenCalledWith('description', 'New description');
  });

  it('renders empty description as empty string', () => {
    render(
      <BulkAlbumDetailsSection
        formData={{ ...defaultFormData, description: '' }}
        artists={defaultArtists}
        isLoadingArtists={false}
        onUpdate={mockOnUpdate}
      />,
    );

    expect(screen.getByTestId('field-description')).toHaveValue('');
  });

  it('invokes onBlur handlers without error', () => {
    render(
      <BulkAlbumDetailsSection
        formData={defaultFormData}
        artists={defaultArtists}
        isLoadingArtists={false}
        onUpdate={mockOnUpdate}
      />,
    );

    fireEvent.blur(screen.getByTestId('field-album-name'));
    fireEvent.blur(screen.getByTestId('select-artist'));
    fireEvent.blur(screen.getByTestId('select-album type'));
    fireEvent.blur(screen.getByTestId('date-picker-blur'));
    fireEvent.blur(screen.getByTestId('field-description'));
  });
});
