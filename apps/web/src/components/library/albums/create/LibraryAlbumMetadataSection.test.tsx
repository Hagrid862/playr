import { LibraryAlbumMetadataSection } from '@/components/library/albums/create/LibraryAlbumMetadataSection';
import type { LibraryAlbumFromFilesFormData } from '@/components/library/albums/create/useLibraryAlbumFromFilesForm';
import { TooltipProvider } from '@/components/ui/tooltip';
import { customRender } from '@repo/testing/web';
import { AlbumType } from '@repo/db';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

function renderWithTooltip(ui: ReactElement) {
  return customRender(<TooltipProvider>{ui}</TooltipProvider>);
}

function allowCoverInputFilesMutation(input: HTMLInputElement) {
  let files: FileList | null = null;
  Object.defineProperty(input, 'files', {
    configurable: true,
    get() {
      return files;
    },
    set(v: FileList | null) {
      files = v;
    },
  });
}

const baseForm: LibraryAlbumFromFilesFormData = {
  name: 'Test album',
  description: '',
  type: 'album',
  artistId: 'a1',
  releaseDate: null,
};

describe('LibraryAlbumMetadataSection', () => {
  const onUpdate = vi.fn();
  const onArtistIdChange = vi.fn();
  const onClearStagedArtist = vi.fn();
  const onManualCoverFile = vi.fn();
  const onRemoveCover = vi.fn();

  const artistOptions = [
    { value: '__create_new_artist__', label: '+ Create new artist…' },
    { value: 'a1', label: 'Alpha' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invokes noop blur handlers on album detail controls', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={baseForm}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        artistSelectOptions={artistOptions}
        isLoadingArtists={false}
        isStagedNewArtistSelected={false}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    fireEvent.blur(screen.getByLabelText(/album title/i));
    fireEvent.blur(screen.getByLabelText(/description/i));
    fireEvent.blur(screen.getByRole('combobox', { name: /artist/i }));
    fireEvent.blur(screen.getByRole('combobox', { name: /album type/i }));
    fireEvent.blur(screen.getByRole('button', { name: /pick a date/i }));
  });

  it('renders album fields and artist select', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={baseForm}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        artistSelectOptions={artistOptions}
        isLoadingArtists={false}
        isStagedNewArtistSelected={false}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    expect(screen.getByLabelText(/album title/i)).toHaveValue('Test album');
    expect(screen.getByText(/album details/i)).toBeInTheDocument();
  });

  it('shows staged-artist readonly row with clear action', async () => {
    const user = userEvent.setup();
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={{ ...baseForm, artistId: 'local:pending:x' }}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        artistSelectOptions={artistOptions}
        isLoadingArtists={false}
        isStagedNewArtistSelected
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    expect(screen.getByLabelText(/remove draft artist/i)).toBeInTheDocument();
    fireEvent.blur(screen.getByRole('combobox', { name: /artist/i }));
    await user.click(screen.getByLabelText(/remove draft artist/i));
    expect(onClearStagedArtist).toHaveBeenCalled();
  });

  it('shows add-artist hint when the library has no server artists', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={{ ...baseForm, artistId: '' }}
        artists={[]}
        artistSelectOptions={[artistOptions[0]]}
        isLoadingArtists={false}
        isStagedNewArtistSelected={false}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    expect(screen.getByText(/add an artist separately/i)).toBeInTheDocument();
  });

  it('opens invalid format dialog when a non-image is applied to the cover tile', async () => {
    const user = userEvent.setup();
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={baseForm}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        artistSelectOptions={artistOptions}
        isLoadingArtists={false}
        isStagedNewArtistSelected={false}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    const input = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
    const bad = new File(['x'], 'x.pdf', { type: 'application/pdf' });
    const dt = new DataTransfer();
    dt.items.add(bad);
    fireEvent.change(input, { target: { files: dt.files } });

    expect(
      await screen.findByRole('heading', { name: /invalid file format/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^ok$/i }));
  });

  it('opens too-many-files dialog when multiple images are dropped', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={baseForm}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        artistSelectOptions={artistOptions}
        isLoadingArtists={false}
        isStagedNewArtistSelected={false}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    const tile = screen.getByRole('button', { name: /upload cover/i });
    const f1 = new File(['a'], 'a.png', { type: 'image/png' });
    const f2 = new File(['b'], 'b.png', { type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(f1);
    dt.items.add(f2);

    fireEvent.drop(tile, { dataTransfer: dt });

    expect(screen.getByText(/too many files/i)).toBeInTheDocument();
  });

  it('closes the too-many-files dialog with OK', async () => {
    const user = userEvent.setup();
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={baseForm}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        artistSelectOptions={artistOptions}
        isLoadingArtists={false}
        isStagedNewArtistSelected={false}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    const tile = screen.getByRole('button', { name: /upload cover/i });
    const f1 = new File(['a'], 'a.png', { type: 'image/png' });
    const f2 = new File(['b'], 'b.png', { type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(f1);
    dt.items.add(f2);
    fireEvent.drop(tile, { dataTransfer: dt });

    await user.click(screen.getByRole('button', { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByText(/too many files/i)).not.toBeInTheDocument();
    });
  });

  it('does nothing on cover drop with no files', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={baseForm}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        artistSelectOptions={artistOptions}
        isLoadingArtists={false}
        isStagedNewArtistSelected={false}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    const tile = screen.getByRole('button', { name: /upload cover/i });
    fireEvent.drop(tile, { dataTransfer: new DataTransfer() });

    expect(onManualCoverFile).not.toHaveBeenCalled();
  });

  it('passes null to onManualCoverFile when drop lists one slot but no first file', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={baseForm}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        artistSelectOptions={artistOptions}
        isLoadingArtists={false}
        isStagedNewArtistSelected={false}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    const tile = screen.getByRole('button', { name: /upload cover/i });
    const files = {
      length: 1,
      item: (i: number) => (i === 0 ? null : null),
      [Symbol.iterator]: function* () {
        /* empty */
      },
    } as FileList;
    fireEvent.drop(tile, {
      dataTransfer: { files },
    });

    expect(onManualCoverFile).toHaveBeenCalledWith(null);
  });

  it('calls onManualCoverFile(null) when the cover input has no file', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={baseForm}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        artistSelectOptions={artistOptions}
        isLoadingArtists={false}
        isStagedNewArtistSelected={false}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    const input = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: new DataTransfer().files } });

    expect(onManualCoverFile).toHaveBeenCalledWith(null);
  });

  it('opens the hidden cover input on Space and Enter', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={baseForm}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        artistSelectOptions={artistOptions}
        isLoadingArtists={false}
        isStagedNewArtistSelected={false}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    const input = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {});
    const tile = screen.getByRole('button', { name: /upload cover/i });

    fireEvent.keyDown(tile, { key: ' ' });
    fireEvent.keyDown(tile, { key: 'Enter' });
    fireEvent.keyDown(tile, { key: 'Tab' });

    expect(clickSpy).toHaveBeenCalledTimes(2);
    clickSpy.mockRestore();
  });

  it('uses fallback alt text when cover is set but album title is empty', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={{ ...baseForm, name: '' }}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        artistSelectOptions={artistOptions}
        isLoadingArtists={false}
        isStagedNewArtistSelected={false}
        coverPreviewUrl="blob:http://local/cover"
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    expect(screen.getByAltText('Cover preview')).toBeInTheDocument();
  });

  it('shows staged artist placeholder Loading while artists load and selection is empty', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={{ ...baseForm, artistId: '' }}
        artists={[]}
        artistSelectOptions={[artistOptions[0]]}
        isLoadingArtists
        isStagedNewArtistSelected
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    expect(screen.getByLabelText(/remove draft artist/i)).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows staged Create or select artist when no server artists and selection is empty', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={{ ...baseForm, artistId: '' }}
        artists={[]}
        artistSelectOptions={[artistOptions[0]]}
        isLoadingArtists={false}
        isStagedNewArtistSelected
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    expect(screen.getByText('Create or select artist')).toBeInTheDocument();
  });

  it('shows staged Select artist placeholder when server artists exist and selection is empty', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={{ ...baseForm, artistId: '' }}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        artistSelectOptions={artistOptions}
        isLoadingArtists={false}
        isStagedNewArtistSelected
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    expect(screen.getByText('Select artist')).toBeInTheDocument();
  });

  it('shows preview image and remove when coverPreviewUrl is set', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={{ ...baseForm, name: 'My LP' }}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        artistSelectOptions={artistOptions}
        isLoadingArtists={false}
        isStagedNewArtistSelected={false}
        coverPreviewUrl="blob:http://local/cover"
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    expect(screen.getByAltText('My LP')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^remove$/i })).toBeInTheDocument();
    expect(screen.getByText(/change cover/i)).toBeInTheDocument();
  });

  it('invokes onRemoveCover from the remove button', async () => {
    const user = userEvent.setup();
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={baseForm}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        artistSelectOptions={artistOptions}
        isLoadingArtists={false}
        isStagedNewArtistSelected={false}
        coverPreviewUrl="blob:http://local/cover"
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^remove$/i }));
    expect(onRemoveCover).toHaveBeenCalled();
  });

  it('shows loading placeholder on artist select while loading', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={{ ...baseForm, artistId: '' }}
        artists={[]}
        artistSelectOptions={[artistOptions[0]]}
        isLoadingArtists
        isStagedNewArtistSelected={false}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    expect(screen.getByRole('combobox', { name: /artist/i })).toHaveTextContent(/loading/i);
  });

  it('updates description through onUpdate', async () => {
    const user = userEvent.setup();
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={baseForm}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        artistSelectOptions={artistOptions}
        isLoadingArtists={false}
        isStagedNewArtistSelected={false}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    await user.type(screen.getByLabelText(/description/i), 'Hi');
    expect(onUpdate).toHaveBeenCalled();
    const descriptionValues = onUpdate.mock.calls
      .filter((c) => c[0] === 'description')
      .map((c) => c[1] as string);
    expect(descriptionValues.join('')).toBe('Hi');
  });

  it('updates album title through onUpdate', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={baseForm}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        artistSelectOptions={artistOptions}
        isLoadingArtists={false}
        isStagedNewArtistSelected={false}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    const title = screen.getByLabelText(/album title/i) as HTMLInputElement;
    fireEvent.change(title, { target: { value: 'Renamed LP' } });

    expect(onUpdate).toHaveBeenCalledWith('name', 'Renamed LP');
  });

  it('updates album type through onUpdate', async () => {
    const user = userEvent.setup();
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={baseForm}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        artistSelectOptions={artistOptions}
        isLoadingArtists={false}
        isStagedNewArtistSelected={false}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    await user.click(screen.getByRole('combobox', { name: /album type/i }));
    await user.click(screen.getByRole('option', { name: /^Compilation$/i }));

    expect(onUpdate).toHaveBeenCalledWith('type', AlbumType.compilation);
  });

  it('updates release date through onUpdate', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={baseForm}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        artistSelectOptions={artistOptions}
        isLoadingArtists={false}
        isStagedNewArtistSelected={false}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    const trigger = screen.getByRole('button', { name: /pick a date/i });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByText('15'));

    expect(onUpdate).toHaveBeenCalledWith('releaseDate', expect.any(Date));
  });

  it('clears the cover file input when preview URL becomes null', () => {
    const { rerender } = customRender(
      <TooltipProvider>
        <LibraryAlbumMetadataSection
          formData={baseForm}
          artists={[{ id: 'a1', name: 'Alpha' }]}
          artistSelectOptions={artistOptions}
          isLoadingArtists={false}
          isStagedNewArtistSelected={false}
          coverPreviewUrl="blob:x"
          onUpdate={onUpdate}
          onArtistIdChange={onArtistIdChange}
          onClearStagedArtist={onClearStagedArtist}
          onManualCoverFile={onManualCoverFile}
          onRemoveCover={onRemoveCover}
        />
      </TooltipProvider>,
    );

    const input = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
    let storedValue = '';
    Object.defineProperty(input, 'value', {
      configurable: true,
      get() {
        return storedValue;
      },
      set(v: string) {
        storedValue = v;
      },
    });
    storedValue = 'C:\\fakepath\\x.png';

    rerender(
      <TooltipProvider>
        <LibraryAlbumMetadataSection
          formData={baseForm}
          artists={[{ id: 'a1', name: 'Alpha' }]}
          artistSelectOptions={artistOptions}
          isLoadingArtists={false}
          isStagedNewArtistSelected={false}
          coverPreviewUrl={null}
          onUpdate={onUpdate}
          onArtistIdChange={onArtistIdChange}
          onClearStagedArtist={onClearStagedArtist}
          onManualCoverFile={onManualCoverFile}
          onRemoveCover={onRemoveCover}
        />
      </TooltipProvider>,
    );

    expect(storedValue).toBe('');
  });

  it('invokes drag handlers on the cover tile without throwing', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={baseForm}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        artistSelectOptions={artistOptions}
        isLoadingArtists={false}
        isStagedNewArtistSelected={false}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    const input = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
    allowCoverInputFilesMutation(input);

    const tile = screen.getByRole('button', { name: /upload cover/i });
    const png = new File(['x'], 'drop.png', { type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(png);

    fireEvent.dragOver(tile);
    fireEvent.drop(tile, { dataTransfer: dt });

    expect(onManualCoverFile).toHaveBeenCalledWith(png);
  });

  it('opens the file dialog when the cover tile is clicked', async () => {
    const user = userEvent.setup();
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={baseForm}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        artistSelectOptions={artistOptions}
        isLoadingArtists={false}
        isStagedNewArtistSelected={false}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    const input = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {});
    await user.click(screen.getByRole('button', { name: /upload cover/i }));
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('shows blur backdrop when coverPreviewUrl is set', () => {
    const { container } = renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={baseForm}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        artistSelectOptions={artistOptions}
        isLoadingArtists={false}
        isStagedNewArtistSelected={false}
        coverPreviewUrl="blob:http://local/bg"
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    expect(container.querySelector('img[aria-hidden="true"]')).toBeTruthy();
  });

  it('applies an image file through the hidden input', async () => {
    const user = userEvent.setup();
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={baseForm}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        artistSelectOptions={artistOptions}
        isLoadingArtists={false}
        isStagedNewArtistSelected={false}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistIdChange={onArtistIdChange}
        onClearStagedArtist={onClearStagedArtist}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
      />,
    );

    const input = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
    allowCoverInputFilesMutation(input);
    const png = new File(['x'], 'a.png', { type: 'image/png' });
    await user.upload(input, png);

    expect(onManualCoverFile).toHaveBeenCalledWith(png);
  });
});
