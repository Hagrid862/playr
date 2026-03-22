import { AlbumType } from '@repo/db';
import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BulkAlbumDetailsSection } from './BulkAlbumDetailsSection';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('@/components/form', () => ({
  TextField: (props: {
    label: string;
    onChange: (v: string) => void;
    onBlur: () => void;
    value: string;
  }) => (
    <div>
      <label>{props.label}</label>
      <input
        data-testid={`field-${props.label.toLowerCase().replace(/\s/g, '-')}`}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        onBlur={props.onBlur}
      />
    </div>
  ),
  TextAreaField: (props: {
    label: string;
    onChange: (v: string) => void;
    onBlur: () => void;
    value: string;
  }) => (
    <div>
      <label>{props.label}</label>
      <textarea
        data-testid="field-description"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        onBlur={props.onBlur}
      />
    </div>
  ),
  SelectField: (props: {
    label: string;
    placeholder: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
    onBlur: () => void;
  }) => (
    <div>
      <label>{props.label}</label>
      <select
        data-testid={`select-${props.label.toLowerCase()}`}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        onBlur={props.onBlur}
      >
        <option value="">{props.placeholder}</option>
        {props.options.map((o: { value: string; label: string }) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  ),
  DatePickerField: (props: {
    label: string;
    onChange: (date: Date | null) => void;
    onBlur: () => void;
    value?: Date;
  }) => (
    <div>
      <label>{props.label}</label>
      <button data-testid="date-picker-set" onClick={() => props.onChange(new Date('2022-01-01'))}>
        Set Date
      </button>
      <button data-testid="date-picker-clear" onClick={() => props.onChange(null)}>
        Clear Date
      </button>
      <span data-testid="date-value">{props.value?.toISOString() ?? 'none'}</span>
      <input data-testid="date-picker-blur" onBlur={props.onBlur} />
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
    releaseDate: new Date('1991-09-24'),
  };

  const defaultArtists: { id: string; name: string }[] = [
    { id: 'artist-1', name: 'Nirvana' },
    { id: 'artist-2', name: 'Foo Fighters' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with provided formData', () => {
    customRender(
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
    customRender(
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
    customRender(
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
    customRender(
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
    customRender(
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
    customRender(
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
    customRender(
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
    customRender(
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
    customRender(
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
    customRender(
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
    customRender(
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
    customRender(
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
    customRender(
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
    customRender(
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
