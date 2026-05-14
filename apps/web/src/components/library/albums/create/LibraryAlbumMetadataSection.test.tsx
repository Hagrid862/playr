import { LibraryAlbumMetadataSection } from '@/components/library/albums/create/LibraryAlbumMetadataSection';
import { LIBRARY_ALBUM_ARTIST_NONE_VALUE } from '@/components/library/albums/create/libraryAlbumArtistConstants';
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
  artistIds: ['a1'],
  genreIds: [],
  releaseDate: null,
};

describe('LibraryAlbumMetadataSection', () => {
  const onUpdate = vi.fn();
  const onArtistSelectionChange = vi.fn();
  const onRemoveArtistId = vi.fn();
  const onManualCoverFile = vi.fn();
  const onRemoveCover = vi.fn();

  const onGenreSelectionChange = vi.fn();
  const onRemoveGenreId = vi.fn();

  const testGenre = {
    id: 'g1',
    name: 'Rock',
    slug: 'rock',
    description: null,
    kind: 'system' as const,
    libraryId: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    deletedAt: null,
  };

  const genrePropsFor = (
    overrides?: Partial<{
      genres: (typeof testGenre)[];
      pendingGenres: { id: string; name: string }[];
      isLoadingGenres: boolean;
    }>,
  ) => ({
    genres: [testGenre],
    pendingGenres: [] as { id: string; name: string }[],
    isLoadingGenres: false,
    onGenreSelectionChange,
    onRemoveGenreId,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invokes noop blur handlers on album detail controls', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={baseForm}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
      />,
    );

    fireEvent.blur(screen.getByLabelText(/album title/i));
    fireEvent.blur(screen.getByLabelText(/description/i));
    fireEvent.blur(screen.getByRole('button', { name: /^artists$/i }));
    fireEvent.blur(screen.getByRole('combobox', { name: /album type/i }));
    fireEvent.blur(screen.getByRole('button', { name: /pick a date/i }));
  });

  it('renders album fields and artist select', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={baseForm}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
      />,
    );

    expect(screen.getByLabelText(/album title/i)).toHaveValue('Test album');
    expect(screen.getByText(/album details/i)).toBeInTheDocument();
  });

  it('opens genre picker, filters by search, and selects a genre', async () => {
    const user = userEvent.setup();
    const customGenre = {
      id: 'g2',
      name: 'Ambient',
      slug: 'ambient',
      description: null,
      kind: 'custom' as const,
      libraryId: 'lib-1',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      deletedAt: null,
    };
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={baseForm}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
        genres={[testGenre, customGenre]}
      />,
    );

    await user.click(screen.getByRole('button', { name: /genres \(optional\)/i }));
    expect(await screen.findByRole('option', { name: /create new genre/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /^no genres$/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/search genres/i), 'ambi');
    expect(screen.queryByRole('option', { name: /^rock$/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: /^ambient$/i }));
    expect(onGenreSelectionChange).toHaveBeenCalledWith('g2');
  });

  it('removes a selected genre via chip', async () => {
    const user = userEvent.setup();
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={{ ...baseForm, genreIds: ['g1'] }}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
      />,
    );

    await user.click(screen.getByLabelText(/remove rock/i));
    expect(onRemoveGenreId).toHaveBeenCalledWith('g1');
  });

  it('shows draft-only notice when every selected artist id is a local pending draft', async () => {
    const user = userEvent.setup();
    const localA = 'local:pending:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const localB = 'local:pending:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={{ ...baseForm, artistIds: [localA, localB] }}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        isLoadingArtists={false}
        pendingArtists={[
          { id: localA, name: 'Draft A' },
          { id: localB, name: 'Draft B' },
        ]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
      />,
    );

    expect(
      screen.getByText(/selected artists are drafts not in your library yet/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear all draft artists/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /clear all draft artists/i }));
    expect(onArtistSelectionChange).toHaveBeenCalledWith(LIBRARY_ALBUM_ARTIST_NONE_VALUE);
  });

  it('lists pending artist chips before library artists when both are selected', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={{ ...baseForm, artistIds: ['a1', 'local:pending:x'] }}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        isLoadingArtists={false}
        pendingArtists={[{ id: 'local:pending:x', name: 'Draft' }]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
      />,
    );

    const chipLabels = screen
      .getAllByRole('button', { name: /^Remove / })
      .map((el) => el.getAttribute('aria-label'));
    expect(chipLabels).toEqual(['Remove Draft (new)', 'Remove Alpha']);
  });

  it('lists pending artist chips before library artists when pending is listed first in form data', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={{ ...baseForm, artistIds: ['local:pending:x', 'a1'] }}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        isLoadingArtists={false}
        pendingArtists={[{ id: 'local:pending:x', name: 'Draft' }]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
      />,
    );

    const chipLabels = screen
      .getAllByRole('button', { name: /^Remove / })
      .map((el) => el.getAttribute('aria-label'));
    expect(chipLabels).toEqual(['Remove Draft (new)', 'Remove Alpha']);
  });

  it('uses the raw id as chip label when an artist id is not in the library list', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={{ ...baseForm, artistIds: ['not-in-artists'] }}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Remove not-in-artists' })).toBeInTheDocument();
  });

  it('uses the raw id as chip label when a genre id is not in the genres list', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={{ ...baseForm, artistIds: ['a1'], genreIds: ['not-in-genres'] }}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Remove not-in-genres' })).toBeInTheDocument();
  });

  it('removes a pending artist via chip', async () => {
    const user = userEvent.setup();
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={{ ...baseForm, artistIds: ['local:pending:x'] }}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        isLoadingArtists={false}
        pendingArtists={[{ id: 'local:pending:x', name: 'Draft' }]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /remove draft/i }));
    expect(onRemoveArtistId).toHaveBeenCalledWith('local:pending:x');
  });

  it('shows add-artist hint when the library has no server artists', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={{ ...baseForm, artistIds: [] }}
        artists={[]}
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
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
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
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
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
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
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
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
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
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
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
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
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
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
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
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
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl="blob:http://local/cover"
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
      />,
    );

    expect(screen.getByAltText('Cover preview')).toBeInTheDocument();
  });

  it('shows artist picker loading state while artists load', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={{ ...baseForm, artistIds: [] }}
        artists={[]}
        pendingArtists={[]}
        isLoadingArtists={true}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
      />,
    );

    const trigger = screen.getByLabelText(/^artists$/i);
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveTextContent(/loading/i);
  });

  it('shows empty artist placeholder when none selected', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={{ ...baseForm, artistIds: [] }}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        pendingArtists={[]}
        isLoadingArtists={false}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
      />,
    );

    const trigger = screen.getByLabelText(/^artists$/i);
    expect(trigger).toHaveTextContent(/no artists/i);
  });

  it('shows preview image and remove when coverPreviewUrl is set', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={{ ...baseForm, name: 'My LP' }}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl="blob:http://local/cover"
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
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
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl="blob:http://local/cover"
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^remove$/i }));
    expect(onRemoveCover).toHaveBeenCalled();
  });

  it('updates description through onUpdate', async () => {
    const user = userEvent.setup();
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={baseForm}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
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
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
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
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
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
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
      />,
    );

    const trigger = screen.getByRole('button', { name: /pick a date/i });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByText('15'));

    expect(onUpdate).toHaveBeenCalledWith('releaseDate', expect.any(Date));
  });

  it('clears release date when the calendar toggles the selected day off', async () => {
    const user = userEvent.setup();
    const selected = new Date(2026, 4, 15);
    customRender(
      <TooltipProvider>
        <LibraryAlbumMetadataSection
          formData={{ ...baseForm, releaseDate: selected }}
          artists={[{ id: 'a1', name: 'Alpha' }]}
          isLoadingArtists={false}
          pendingArtists={[]}
          coverPreviewUrl={null}
          onUpdate={onUpdate}
          onArtistSelectionChange={onArtistSelectionChange}
          onRemoveArtistId={onRemoveArtistId}
          onManualCoverFile={onManualCoverFile}
          onRemoveCover={onRemoveCover}
          {...genrePropsFor()}
        />
      </TooltipProvider>,
    );

    await user.click(screen.getByRole('button', { name: /May.*15|May 15/ }));
    await user.click(screen.getByText('15'));

    expect(onUpdate).toHaveBeenCalledWith('releaseDate', null);
  });

  it('clears the cover file input when preview URL becomes null', () => {
    const { rerender } = customRender(
      <TooltipProvider>
        <LibraryAlbumMetadataSection
          formData={baseForm}
          artists={[{ id: 'a1', name: 'Alpha' }]}
          isLoadingArtists={false}
          pendingArtists={[]}
          coverPreviewUrl="blob:x"
          onUpdate={onUpdate}
          onArtistSelectionChange={onArtistSelectionChange}
          onRemoveArtistId={onRemoveArtistId}
          onManualCoverFile={onManualCoverFile}
          onRemoveCover={onRemoveCover}
          {...genrePropsFor()}
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
          isLoadingArtists={false}
          pendingArtists={[]}
          coverPreviewUrl={null}
          onUpdate={onUpdate}
          onArtistSelectionChange={onArtistSelectionChange}
          onRemoveArtistId={onRemoveArtistId}
          onManualCoverFile={onManualCoverFile}
          onRemoveCover={onRemoveCover}
          {...genrePropsFor()}
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
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
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
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
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
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl="blob:http://local/bg"
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
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
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor()}
      />,
    );

    const input = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
    allowCoverInputFilesMutation(input);
    const png = new File(['x'], 'a.png', { type: 'image/png' });
    await user.upload(input, png);

    expect(onManualCoverFile).toHaveBeenCalledWith(png);
  });

  it('orders genre chips with pending genres before existing picks', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={{
          ...baseForm,
          artistIds: [],
          genreIds: ['g1', 'local:pending:abc123'],
        }}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor({
          pendingGenres: [{ id: 'local:pending:abc123', name: 'Fresh Genre' }],
        })}
      />,
    );

    expect(screen.getByRole('button', { name: 'Remove Fresh Genre (new)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Rock' })).toBeInTheDocument();
  });

  it('orders pending before server when the pending id appears first in genreIds', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={{
          ...baseForm,
          artistIds: [],
          genreIds: ['local:pending:abc123', 'g1'],
        }}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor({
          pendingGenres: [{ id: 'local:pending:abc123', name: 'Fresh Genre' }],
        })}
      />,
    );

    expect(screen.getByRole('button', { name: 'Remove Fresh Genre (new)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Rock' })).toBeInTheDocument();
  });

  it('renders multiple pending genre chips without reordering when both are new', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={{
          ...baseForm,
          artistIds: [],
          genreIds: ['local:pending:first', 'local:pending:second'],
        }}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor({
          pendingGenres: [
            { id: 'local:pending:first', name: 'Alpha New' },
            { id: 'local:pending:second', name: 'Beta New' },
          ],
        })}
      />,
    );

    expect(screen.getByRole('button', { name: 'Remove Alpha New (new)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Beta New (new)' })).toBeInTheDocument();
  });

  it('renders chips for two library genres without pending reordering', () => {
    const jazz = {
      id: 'g2',
      name: 'Jazz',
      slug: 'jazz',
      description: null,
      kind: 'system' as const,
      libraryId: null,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      deletedAt: null,
    };
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={{
          ...baseForm,
          artistIds: [],
          genreIds: ['g1', 'g2'],
        }}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor({ genres: [testGenre, jazz] })}
      />,
    );

    expect(screen.getByRole('button', { name: 'Remove Rock' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Jazz' })).toBeInTheDocument();
  });

  it('uses the empty-genres placeholder when the library has no genres', () => {
    renderWithTooltip(
      <LibraryAlbumMetadataSection
        formData={baseForm}
        artists={[{ id: 'a1', name: 'Alpha' }]}
        isLoadingArtists={false}
        pendingArtists={[]}
        coverPreviewUrl={null}
        onUpdate={onUpdate}
        onArtistSelectionChange={onArtistSelectionChange}
        onRemoveArtistId={onRemoveArtistId}
        onManualCoverFile={onManualCoverFile}
        onRemoveCover={onRemoveCover}
        {...genrePropsFor({ genres: [] })}
      />,
    );

    expect(screen.getByRole('button', { name: /genres \(optional\)/i })).toHaveTextContent(
      /No genres or create new/i,
    );
  });
});
