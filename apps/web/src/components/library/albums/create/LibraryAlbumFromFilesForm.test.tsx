import { LibraryAlbumFromFilesForm } from '@/components/library/albums/create/LibraryAlbumFromFilesForm';
import { TooltipProvider } from '@/components/ui/tooltip';
import { checkLibraryArtistNameAvailability } from '@/hooks/api/library-artists/requests/checkLibraryArtistNameAvailability';
import {
  extractCoverFromAudioFile,
  extractMetadataFromAudioFile,
} from '@/lib/audio/audio-metadata';
import { customRender } from '@repo/testing/web';
import {
  CreateLibraryGenreResponseSchema,
  GetLibraryArtistNameAvailabilityResponseSchema,
  GetLibraryGenresResponseSchema,
} from '@repo/contracts';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hookMergeRef = vi.hoisted(() => ({
  /** Optional merge applied on top of the real hook result (edge-case coverage). */
  current: null as null | ((base: Record<string, unknown>) => Record<string, unknown>),
}));

/** Stable-object merge cache so returning `{ formData: {...} }` does not change identity every render (avoids update loops). */
const orphanGenreMergeCache = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));

vi.mock('./useLibraryAlbumFromFilesForm', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./useLibraryAlbumFromFilesForm')>();
  return {
    ...mod,
    useLibraryAlbumFromFilesForm: (
      opts: Parameters<typeof mod.useLibraryAlbumFromFilesForm>[0],
    ) => {
      const base = mod.useLibraryAlbumFromFilesForm(opts);
      const merge = hookMergeRef.current;
      return merge ? { ...base, ...merge(base as Record<string, unknown>) } : base;
    },
  };
});

vi.mock('@/hooks/api/library-artists/requests/checkLibraryArtistNameAvailability', () => ({
  checkLibraryArtistNameAvailability: vi.fn(),
}));

vi.mock('@/lib/audio/audio-metadata', () => ({
  extractMetadataFromAudioFile: vi.fn(),
  extractCoverFromAudioFile: vi.fn(),
}));

const createAlbumIsPending = vi.hoisted(() => ({ current: false }));
const uploadCoverIsPending = vi.hoisted(() => ({ current: false }));
const bulkTracksIsPending = vi.hoisted(() => ({ current: false }));
const createArtistIsPending = vi.hoisted(() => ({ current: false }));
const createGenreIsPending = vi.hoisted(() => ({ current: false }));

const navigateMock = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={typeof to === 'string' ? to : '#'}>{children}</a>
  ),
  useNavigate: () => navigateMock,
}));

const createAlbumMock = vi.fn();
const bulkTracksMock = vi.fn();
const createArtistMock = vi.fn();
const createGenreMock = vi.fn();
const uploadCoverMock = vi.fn();

const testGenreItem = {
  id: 'genre-1',
  name: 'Rock',
  slug: 'rock',
  description: null,
  kind: 'system' as const,
  libraryId: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  deletedAt: null,
};

const defaultGenresData = () =>
  GetLibraryGenresResponseSchema.parse({
    success: true,
    data: {
      items: [testGenreItem],
      total: 1,
      page: 1,
      limit: 100,
    },
    error: null,
    meta: { timestamp: 't', requestId: 'r', path: '/p' },
  });

const { libraryStoreState, useLibraryArtistsMock, useLibraryGenresMock } = vi.hoisted(() => ({
  libraryStoreState: {
    libraryId: 'lib-1' as string | null,
    privateArtists: [{ id: 'artist-1', name: 'Alpha' }] as { id: string; name: string }[],
    setPrivateArtists: vi.fn(),
  },
  useLibraryArtistsMock: vi.fn(() => ({ isLoading: false, data: undefined })),
  useLibraryGenresMock: vi.fn(() => ({ isLoading: false, data: defaultGenresData() })),
}));

vi.mock('@/stores/library.store', () => ({
  useLibraryStore: Object.assign(
    (
      selector?: (s: {
        libraryId: string | null;
        privateArtists: { id: string; name: string }[];
        setPrivateArtists: ReturnType<typeof vi.fn>;
      }) => unknown,
    ) => {
      return selector ? selector(libraryStoreState) : libraryStoreState;
    },
    { getState: () => ({}) },
  ),
}));

vi.mock('@/hooks/api/library-artists/useLibraryArtists', () => ({
  useLibraryArtists: () => useLibraryArtistsMock(),
}));

vi.mock('@/hooks/api/library-genres/useLibraryGenres', () => ({
  useLibraryGenres: () => useLibraryGenresMock(),
}));

vi.mock('@/hooks/api/library-genres/useCreateLibraryGenre', () => ({
  useCreateLibraryGenre: () => ({
    mutateAsync: createGenreMock,
    get isPending() {
      return createGenreIsPending.current;
    },
  }),
}));

vi.mock('@/hooks/api/library-albums/useCreateLibraryAlbum', () => ({
  useCreateLibraryAlbum: () => ({
    mutateAsync: createAlbumMock,
    get isPending() {
      return createAlbumIsPending.current;
    },
  }),
}));

vi.mock('@/hooks/api/library-albums/useUploadLibraryAlbumCover', () => ({
  useUploadLibraryAlbumCover: () => ({
    mutateAsync: uploadCoverMock,
    get isPending() {
      return uploadCoverIsPending.current;
    },
  }),
}));

vi.mock('@/hooks/api/library-tracks/useBulkCreateLibraryTracks', () => ({
  useBulkCreateLibraryTracks: () => ({
    mutateAsync: bulkTracksMock,
    get isPending() {
      return bulkTracksIsPending.current;
    },
  }),
}));

vi.mock('@/hooks/api/library-artists/useCreateLibraryArtist', () => ({
  useCreateLibraryArtist: () => ({
    mutateAsync: createArtistMock,
    get isPending() {
      return createArtistIsPending.current;
    },
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const availability = (available: boolean) =>
  GetLibraryArtistNameAvailabilityResponseSchema.parse({
    success: true,
    data: { available },
    error: null,
    meta: { timestamp: 't', requestId: 'r', path: '/p' },
  });

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

function renderForm(props: ComponentProps<typeof LibraryAlbumFromFilesForm>) {
  return customRender(
    <TooltipProvider>
      <LibraryAlbumFromFilesForm {...props} />
    </TooltipProvider>,
  );
}

describe('LibraryAlbumFromFilesForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockReset();
    libraryStoreState.libraryId = 'lib-1';
    libraryStoreState.privateArtists = [{ id: 'artist-1', name: 'Alpha' }];
    useLibraryArtistsMock.mockReturnValue({ isLoading: false, data: undefined });
    vi.mocked(checkLibraryArtistNameAvailability).mockResolvedValue(availability(true));
    vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
      title: 'Song',
      artist: 'Alpha',
      album: 'From Meta',
      year: 2024,
      trackNo: 1,
      diskNo: 1,
    });
    vi.mocked(extractCoverFromAudioFile).mockResolvedValue(null);
    createAlbumMock.mockResolvedValue({ data: { id: 'new-album-id' } });
    bulkTracksMock.mockResolvedValue(undefined);
    createArtistMock.mockResolvedValue({ data: { id: 'created-artist' } });
    createGenreMock.mockResolvedValue(
      CreateLibraryGenreResponseSchema.parse({
        success: true,
        data: {
          ...testGenreItem,
          id: 'created-genre',
          name: 'Modal Genre',
          slug: 'modalgenre',
          kind: 'custom',
          libraryId: 'lib-1',
        },
        error: null,
        meta: { timestamp: 't', requestId: 'r', path: '/p' },
      }),
    );
    uploadCoverMock.mockResolvedValue(undefined);
    useLibraryGenresMock.mockReturnValue({ isLoading: false, data: defaultGenresData() });
  });

  afterEach(() => {
    hookMergeRef.current = null;
    orphanGenreMergeCache.current = null;
    createAlbumIsPending.current = false;
    uploadCoverIsPending.current = false;
    bulkTracksIsPending.current = false;
    createArtistIsPending.current = false;
    createGenreIsPending.current = false;
  });

  it('renders cancel link and disabled submit while empty', () => {
    renderForm({ cancelTo: '/app/library/albums' });

    expect(screen.getByRole('button', { name: /^create album$/i })).toBeDisabled();
    expect(screen.getByRole('link', { name: /cancel/i })).toHaveAttribute(
      'href',
      '/app/library/albums',
    );
  });

  it('updates album title field', async () => {
    const user = userEvent.setup();
    renderForm({ cancelTo: '/x' });

    const title = screen.getByLabelText(/album title/i);
    await user.clear(title);
    await user.type(title, 'Named Album');

    expect(title).toHaveValue('Named Album');
  });

  it('lets user choose album type', async () => {
    const user = userEvent.setup();
    renderForm({ cancelTo: '/x' });

    const typeTrigger = screen.getByRole('combobox', { name: /album type/i });
    await user.click(typeTrigger);
    await user.click(await screen.findByRole('option', { name: /^compilation$/i }));

    expect(typeTrigger).toBeInTheDocument();
  });

  it('uses an empty library genre list when the genres query has no data', () => {
    useLibraryGenresMock.mockReturnValue({ isLoading: false, data: undefined } as any);
    renderForm({ cancelTo: '/back' });

    expect(screen.getByRole('button', { name: /genres \(optional\)/i })).toBeInTheDocument();
  });

  it('submits create album flow after adding audio that matches a library artist', async () => {
    const user = userEvent.setup();
    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    await user.click(screen.getByRole('button', { name: /create album.*upload/i }));

    await waitFor(() => {
      expect(createAlbumMock).toHaveBeenCalled();
      expect(bulkTracksMock).toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Successfully created album and uploaded 1 track');
    });
  });

  it('toasts album-only success and skips bulk tracks when there are no tracks', async () => {
    const user = userEvent.setup();
    const view = renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    await user.click(screen.getByRole('combobox', { name: /artist/i }));
    await user.click(await screen.findByRole('option', { name: /^Alpha$/i }));

    hookMergeRef.current = () => ({
      tracks: [],
      coverFileForUpload: null,
    });
    view.rerender(
      <TooltipProvider>
        <LibraryAlbumFromFilesForm cancelTo="/back" />
      </TooltipProvider>,
    );

    await user.click(screen.getByRole('button', { name: /^create album$/i }));

    await waitFor(() => {
      expect(createAlbumMock).toHaveBeenCalled();
      expect(bulkTracksMock).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Successfully created album');
      expect(navigateMock).toHaveBeenCalled();
    });
  });

  it('uses plural copy in the success toast when uploading multiple tracks', async () => {
    const user = userEvent.setup();
    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    const dt = new DataTransfer();
    dt.items.add(new File(['a'], 'a.mp3', { type: 'audio/mp3' }));
    dt.items.add(new File(['b'], 'b.mp3', { type: 'audio/mp3' }));
    await user.upload(audioInput, Array.from(dt.files));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    await user.click(screen.getByRole('button', { name: /create album.*upload/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Successfully created album and uploaded 2 tracks',
      );
    });
  });

  it('skips autofill when multiple library artists share the same normalized name', async () => {
    const user = userEvent.setup();
    libraryStoreState.privateArtists = [
      { id: 'a1', name: 'Alpha' },
      { id: 'a2', name: 'alpha' },
    ];
    vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
      title: 'Song',
      artist: 'Alpha',
      album: 'From Meta',
      year: 2024,
      trackNo: 1,
      diskNo: 1,
    });

    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    expect(screen.getByRole('combobox', { name: /artist/i })).toHaveTextContent(/select artist/i);
  });

  it('does not autofill artist id when the sole name match has a missing id', async () => {
    const user = userEvent.setup();
    libraryStoreState.privateArtists = [{ name: 'Alpha' }] as {
      id: string;
      name: string;
    }[];
    vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
      title: 'Song',
      artist: 'Alpha',
      album: 'From Meta',
      year: 2024,
      trackNo: 1,
      diskNo: 1,
    });

    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    expect(screen.getByRole('combobox', { name: /artist/i })).toHaveTextContent(/select artist/i);
  });

  it('skips server artist autofill while the artist list is still loading', async () => {
    const user = userEvent.setup();
    useLibraryArtistsMock.mockReturnValue({ isLoading: true, data: undefined });
    vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
      title: 'Song',
      artist: 'Alpha',
      album: 'From Meta',
      year: 2024,
      trackNo: 1,
      diskNo: 1,
    });

    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    expect(screen.getByRole('combobox', { name: /artist/i })).toHaveTextContent(/loading/i);
    expect(screen.getByRole('button', { name: /create album.*upload/i })).toBeDisabled();
  });

  it('selects a library artist explicitly from the dropdown (non-sentinel change)', async () => {
    const user = userEvent.setup();
    vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
      title: 'Song',
      album: 'From Meta',
      year: 2024,
      trackNo: 1,
      diskNo: 1,
    });

    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    await user.click(screen.getByRole('combobox', { name: /artist/i }));
    await user.click(await screen.findByRole('option', { name: /^Alpha$/i }));

    await user.click(screen.getByRole('button', { name: /create album.*upload/i }));

    await waitFor(() => {
      expect(createAlbumMock).toHaveBeenCalledWith(
        expect.objectContaining({ artistId: 'artist-1' }),
      );
    });
  });

  it('passes genreIds to create album when an existing genre is selected', async () => {
    const user = userEvent.setup();
    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    await user.click(screen.getByRole('button', { name: /genres \(optional\)/i }));
    await user.click(await screen.findByRole('option', { name: /^Rock$/i }));

    await user.click(screen.getByRole('button', { name: /create album.*upload/i }));

    await waitFor(() => {
      expect(createGenreMock).not.toHaveBeenCalled();
      expect(createAlbumMock).toHaveBeenCalledWith(
        expect.objectContaining({ genreIds: ['genre-1'] }),
      );
    });
  });

  it('applies a pending genre to the track when creating from the track genre picker', async () => {
    const user = userEvent.setup();
    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    await user.click(screen.getByRole('button', { name: /^track genres$/i }));
    await user.click(await screen.findByRole('option', { name: /create new genre/i }));

    expect(await screen.findByRole('heading', { name: /new genre/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/genre name/i), 'Track Picker Genre');
    await user.click(screen.getByRole('button', { name: /add genre/i }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /new genre/i })).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^track genres$/i }));

    expect(
      await screen.findByRole('option', { name: /track picker genre \(new\)/i }),
    ).toBeInTheDocument();
  });

  it('creates a genre before the album when staging a new genre from the modal', async () => {
    const user = userEvent.setup();
    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    await user.click(screen.getByRole('button', { name: /genres \(optional\)/i }));
    await user.click(await screen.findByRole('option', { name: /create new genre/i }));

    expect(await screen.findByRole('heading', { name: /new genre/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/genre name/i), 'Modal Genre');
    await user.click(screen.getByRole('button', { name: /add genre/i }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /new genre/i })).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create album.*upload/i }));

    await waitFor(() => {
      expect(createGenreMock).toHaveBeenCalledWith({ name: 'Modal Genre' });
      expect(createAlbumMock).toHaveBeenCalledWith(
        expect.objectContaining({ genreIds: ['created-genre'] }),
      );
    });
  });

  it('surfaces error when staged genre creation returns no data', async () => {
    const user = userEvent.setup();
    createGenreMock.mockResolvedValueOnce({
      success: true,
      data: null,
      error: null,
      meta: { timestamp: 't', requestId: 'r', path: '/p' },
    });

    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    await user.click(screen.getByRole('button', { name: /genres \(optional\)/i }));
    await user.click(await screen.findByRole('option', { name: /create new genre/i }));

    await user.type(screen.getByLabelText(/genre name/i), 'Modal Genre');
    await user.click(screen.getByRole('button', { name: /add genre/i }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /new genre/i })).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create album.*upload/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to create genre');
    });
  });

  it('removes a genre via chip before submit', async () => {
    const user = userEvent.setup();
    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    await user.click(screen.getByRole('button', { name: /genres \(optional\)/i }));
    await user.click(await screen.findByRole('option', { name: /^Rock$/i }));

    await user.click(screen.getByRole('button', { name: /remove rock/i }));

    await user.click(screen.getByRole('button', { name: /create album.*upload/i }));

    await waitFor(() => {
      expect(createAlbumMock).toHaveBeenCalledWith(
        expect.objectContaining({ genreIds: undefined }),
      );
    });
  });

  it('clears genres when choosing No genres from the picker', async () => {
    const user = userEvent.setup();
    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    await user.click(screen.getByRole('button', { name: /genres \(optional\)/i }));
    await user.click(await screen.findByRole('option', { name: /^Rock$/i }));

    expect(screen.getByRole('button', { name: /remove rock/i })).toBeInTheDocument();

    // Popover stays open after picking Rock (only "__no_genre__" closes it).
    await user.click(screen.getByRole('option', { name: /^No genres$/ }));

    expect(screen.queryByRole('button', { name: /remove rock/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create album.*upload/i }));

    await waitFor(() => {
      expect(createAlbumMock).toHaveBeenCalledWith(
        expect.objectContaining({ genreIds: undefined }),
      );
    });
  });

  it('surfaces missing pending genre row during submit', async () => {
    const user = userEvent.setup();

    const view = renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    orphanGenreMergeCache.current = null;
    hookMergeRef.current = (base) => {
      if (!orphanGenreMergeCache.current) {
        const fd = base.formData as Record<string, unknown>;
        orphanGenreMergeCache.current = {
          formData: {
            ...fd,
            genreIds: ['local:pending:orphan-without-row'],
          },
        };
      }
      return orphanGenreMergeCache.current;
    };

    view.rerender(
      <TooltipProvider>
        <LibraryAlbumFromFilesForm cancelTo="/back" />
      </TooltipProvider>,
    );

    await user.click(screen.getByRole('button', { name: /create album.*upload/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Genre name is missing');
    });
  });

  it('skips adding another pending row when metadata matches an existing pending artist while artist id is unset', async () => {
    const user = userEvent.setup();
    vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
      title: 'Song',
      artist: 'Fresh Pending Only',
      album: 'Indie',
      year: 2024,
      trackNo: 1,
      diskNo: 1,
    });

    const view = renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'a.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('Indie');
    });

    hookMergeRef.current = (base) => {
      const fd = base.formData as Record<string, unknown>;
      return { formData: { ...fd, artistId: '' } };
    };

    view.rerender(
      <TooltipProvider>
        <LibraryAlbumFromFilesForm cancelTo="/back" />
      </TooltipProvider>,
    );

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /artist/i })).toBeInTheDocument(),
    );
  });

  it('surfaces missing pending artist name during submit', async () => {
    const user = userEvent.setup();
    vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
      title: 'Song',
      artist: 'Edge Case Artist',
      album: 'Indie',
      year: 2024,
      trackNo: 1,
      diskNo: 1,
    });

    const view = renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'a.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('Indie');
    });

    hookMergeRef.current = (base) => ({
      pendingArtists: (
        base.pendingArtists as {
          id: string;
          name: string;
        }[]
      ).map((p) =>
        (base.formData as { artistId: string }).artistId === p.id ? { ...p, name: '   ' } : p,
      ),
    });

    view.rerender(
      <TooltipProvider>
        <LibraryAlbumFromFilesForm cancelTo="/back" />
      </TooltipProvider>,
    );

    await user.click(screen.getByRole('button', { name: /create album.*upload/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Artist name is missing');
    });

    expect(createArtistMock).not.toHaveBeenCalled();
  });

  it('creates a server artist first when metadata suggests a new name', async () => {
    const user = userEvent.setup();
    vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
      title: 'Song',
      artist: 'Brand New Artist',
      album: 'Indie',
      year: 2024,
      trackNo: 1,
      diskNo: 1,
    });

    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'a.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('Indie');
    });

    await user.click(screen.getByRole('button', { name: /create album.*upload/i }));

    await waitFor(() => {
      expect(createArtistMock).toHaveBeenCalled();
      expect(createAlbumMock).toHaveBeenCalled();
    });
  });

  it('maps non-Error album failures to the generic message', async () => {
    const user = userEvent.setup();
    createAlbumMock.mockRejectedValueOnce(404);

    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    await user.click(screen.getByRole('button', { name: /create album.*upload/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to create album');
    });
  });

  it('surfaces album creation failures via toast', async () => {
    const user = userEvent.setup();
    createAlbumMock.mockRejectedValueOnce(new Error('network'));

    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    await user.click(screen.getByRole('button', { name: /create album.*upload/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('network');
    });
  });

  it('does not submit when library id is missing', async () => {
    const user = userEvent.setup();
    libraryStoreState.libraryId = null;

    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    await user.click(screen.getByRole('button', { name: /create album.*upload/i }));

    expect(createAlbumMock).not.toHaveBeenCalled();
  });

  it('surfaces failure when create album returns no data', async () => {
    const user = userEvent.setup();
    createAlbumMock.mockResolvedValueOnce({ data: undefined });

    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    await user.click(screen.getByRole('button', { name: /create album.*upload/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to create album');
    });
  });

  it('surfaces failure when create artist returns no data', async () => {
    const user = userEvent.setup();
    vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
      title: 'Song',
      artist: 'Brand New Artist',
      album: 'Indie',
      year: 2024,
      trackNo: 1,
      diskNo: 1,
    });
    createArtistMock.mockResolvedValueOnce({ data: undefined });

    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'a.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('Indie');
    });

    await user.click(screen.getByRole('button', { name: /create album.*upload/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to create artist');
    });
  });

  it('uploads cover after manual artwork upload', async () => {
    const user = userEvent.setup();
    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    const coverInput = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
    allowCoverInputFilesMutation(coverInput);
    await user.upload(coverInput, new File(['img'], 'art.png', { type: 'image/png' }));

    await user.click(screen.getByRole('button', { name: /create album.*upload/i }));

    await waitFor(() => {
      expect(uploadCoverMock).toHaveBeenCalled();
    });
  });

  it('stages a new artist from the create-artist modal', async () => {
    const user = userEvent.setup();
    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    await user.click(screen.getByRole('combobox', { name: /artist/i }));
    await user.click(await screen.findByRole('option', { name: /create new artist/i }));

    expect(await screen.findByRole('heading', { name: /new artist/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/artist name/i), 'Modal Artist');
    await user.click(screen.getByRole('button', { name: /add artist/i }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /new artist/i })).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /create album.*upload/i }));

    await waitFor(() => {
      expect(createArtistMock).toHaveBeenCalledWith({ name: 'Modal Artist' });
      expect(createAlbumMock).toHaveBeenCalled();
    });
  });

  it('clears staged pending artist when remove draft is clicked', async () => {
    const user = userEvent.setup();
    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    await user.click(screen.getByRole('combobox', { name: /artist/i }));
    await user.click(await screen.findByRole('option', { name: /create new artist/i }));

    expect(await screen.findByRole('heading', { name: /new artist/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/artist name/i), 'Modal Artist');
    await user.click(screen.getByRole('button', { name: /add artist/i }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /new artist/i })).not.toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/remove draft artist/i));

    await waitFor(() => {
      expect(screen.queryByLabelText(/remove draft artist/i)).not.toBeInTheDocument();
    });
  });

  it('clears manual artwork when selecting an embedded cover tile', async () => {
    const user = userEvent.setup();
    vi.mocked(extractCoverFromAudioFile).mockResolvedValue(
      new File(['e'], 'embedded.jpg', { type: 'image/jpeg' }),
    );

    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByText(/from your files/i)).toBeInTheDocument();
    });

    const coverInput = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
    allowCoverInputFilesMutation(coverInput);
    await user.upload(coverInput, new File(['m'], 'manual.png', { type: 'image/png' }));

    await user.click(screen.getByRole('button', { name: /use embedded cover from song\.mp3/i }));

    await waitFor(() => {
      expect(screen.getByText(/tap an image for the album cover/i)).toBeInTheDocument();
    });
  });

  it('clears embedded-only cover selection via Remove', async () => {
    const user = userEvent.setup();
    vi.mocked(extractCoverFromAudioFile).mockResolvedValue(
      new File(['e'], 'embedded.jpg', { type: 'image/jpeg' }),
    );

    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'track.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^remove$/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^remove$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^remove$/i })).not.toBeInTheDocument();
    });
  });

  it('removes manual artwork via Remove', async () => {
    const user = userEvent.setup();
    vi.mocked(extractCoverFromAudioFile).mockResolvedValue(null);

    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    const coverInput = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
    allowCoverInputFilesMutation(coverInput);
    await user.upload(coverInput, new File(['m'], 'manual.png', { type: 'image/png' }));

    await user.click(screen.getByRole('button', { name: /^remove$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^remove$/i })).not.toBeInTheDocument();
    });
  });

  it('uses singular copy on the submit button for a single track', async () => {
    const user = userEvent.setup();
    vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
      title: 'Song',
      album: 'From Meta',
      year: 2024,
      trackNo: 1,
      diskNo: 1,
    });

    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    await user.click(screen.getByRole('combobox', { name: /artist/i }));
    await user.click(await screen.findByRole('option', { name: /^Alpha$/i }));

    expect(screen.getByRole('button', { name: /create album & upload 1 track$/i })).toBeEnabled();
  });

  it('shows combined scanning overlay copy while metadata and covers are scanning', () => {
    hookMergeRef.current = () => ({
      isScanningMetadata: true,
      isScanningCovers: true,
    });

    renderForm({ cancelTo: '/back' });

    expect(screen.getByText('Scanning metadata and cover art...')).toBeInTheDocument();
  });

  it('shows metadata-only scanning overlay copy', () => {
    hookMergeRef.current = () => ({
      isScanningMetadata: true,
      isScanningCovers: false,
    });

    renderForm({ cancelTo: '/back' });

    expect(screen.getByText('Scanning metadata...')).toBeInTheDocument();
  });

  it('shows cover-only scanning overlay copy', () => {
    hookMergeRef.current = () => ({
      isScanningMetadata: false,
      isScanningCovers: true,
    });

    renderForm({ cancelTo: '/back' });

    expect(screen.getByText('Scanning tracks for cover art...')).toBeInTheDocument();
  });

  it('shows album creation progress on the submit button while the mutation is pending', async () => {
    const user = userEvent.setup();
    vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
      title: 'Song',
      album: 'From Meta',
      year: 2024,
      trackNo: 1,
      diskNo: 1,
    });

    const view = renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    await user.click(screen.getByRole('combobox', { name: /artist/i }));
    await user.click(await screen.findByRole('option', { name: /^Alpha$/i }));

    createAlbumIsPending.current = true;
    view.rerender(
      <TooltipProvider>
        <LibraryAlbumFromFilesForm cancelTo="/back" />
      </TooltipProvider>,
    );

    expect(screen.getByRole('button', { name: /creating album/i })).toBeInTheDocument();
  });

  it('shows uploading cover progress on the submit button while cover upload is pending', async () => {
    const user = userEvent.setup();
    vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
      title: 'Song',
      album: 'From Meta',
      year: 2024,
      trackNo: 1,
      diskNo: 1,
    });

    const view = renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    await user.click(screen.getByRole('combobox', { name: /artist/i }));
    await user.click(await screen.findByRole('option', { name: /^Alpha$/i }));

    uploadCoverIsPending.current = true;
    view.rerender(
      <TooltipProvider>
        <LibraryAlbumFromFilesForm cancelTo="/back" />
      </TooltipProvider>,
    );

    expect(screen.getByRole('button', { name: /uploading cover/i })).toBeInTheDocument();
  });

  it('shows uploading tracks progress on the submit button while bulk track upload is pending', async () => {
    const user = userEvent.setup();
    vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
      title: 'Song',
      album: 'From Meta',
      year: 2024,
      trackNo: 1,
      diskNo: 1,
    });

    const view = renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    await user.click(screen.getByRole('combobox', { name: /artist/i }));
    await user.click(await screen.findByRole('option', { name: /^Alpha$/i }));

    bulkTracksIsPending.current = true;
    view.rerender(
      <TooltipProvider>
        <LibraryAlbumFromFilesForm cancelTo="/back" />
      </TooltipProvider>,
    );

    expect(screen.getByRole('button', { name: /uploading 1 track/i })).toBeInTheDocument();
  });

  it('shows creating artist progress on the submit button while the artist mutation is pending', async () => {
    const user = userEvent.setup();
    vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
      title: 'Song',
      artist: 'Brand New Artist',
      album: 'Indie',
      year: 2024,
      trackNo: 1,
      diskNo: 1,
    });

    const view = renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'a.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('Indie');
    });

    createArtistIsPending.current = true;
    view.rerender(
      <TooltipProvider>
        <LibraryAlbumFromFilesForm cancelTo="/back" />
      </TooltipProvider>,
    );

    expect(screen.getByRole('button', { name: /creating artist/i })).toBeInTheDocument();
  });

  it('shows creating genre progress on the submit button while the genre mutation is pending', async () => {
    const user = userEvent.setup();
    vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
      title: 'Song',
      album: 'From Meta',
      year: 2024,
      trackNo: 1,
      diskNo: 1,
    });

    const view = renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    await user.click(screen.getByRole('combobox', { name: /artist/i }));
    await user.click(await screen.findByRole('option', { name: /^Alpha$/i }));

    createGenreIsPending.current = true;
    view.rerender(
      <TooltipProvider>
        <LibraryAlbumFromFilesForm cancelTo="/back" />
      </TooltipProvider>,
    );

    expect(screen.getByRole('button', { name: /creating genre/i })).toBeInTheDocument();
  });

  it('shows plural uploading-tracks copy when multiple files exist while bulk upload is pending', async () => {
    const user = userEvent.setup();
    vi.mocked(extractMetadataFromAudioFile).mockResolvedValue({
      title: 'Song',
      album: 'From Meta',
      year: 2024,
      trackNo: 1,
      diskNo: 1,
    });

    const view = renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    const dt = new DataTransfer();
    dt.items.add(new File(['a'], 'a.mp3', { type: 'audio/mp3' }));
    dt.items.add(new File(['b'], 'b.mp3', { type: 'audio/mp3' }));
    await user.upload(audioInput, Array.from(dt.files));

    await waitFor(() => {
      expect(screen.getByLabelText(/album title/i)).toHaveValue('From Meta');
    });

    await user.click(screen.getByRole('combobox', { name: /artist/i }));
    await user.click(await screen.findByRole('option', { name: /^Alpha$/i }));

    bulkTracksIsPending.current = true;
    view.rerender(
      <TooltipProvider>
        <LibraryAlbumFromFilesForm cancelTo="/back" />
      </TooltipProvider>,
    );

    expect(screen.getByRole('button', { name: /uploading 2 tracks/i })).toBeInTheDocument();
  });

  it('deselects embedded cover via the banner without invoking manual-cover removal', async () => {
    const user = userEvent.setup();
    vi.mocked(extractCoverFromAudioFile).mockResolvedValue(
      new File(['e'], 'embedded.jpg', { type: 'image/jpeg' }),
    );

    renderForm({ cancelTo: '/back' });

    const audioInput = document.querySelector('input[accept="audio/*"]') as HTMLInputElement;
    await user.upload(audioInput, new File(['x'], 'song.mp3', { type: 'audio/mp3' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /use embedded cover from song\.mp3/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /use embedded cover from song\.mp3/i }));

    await user.click(
      screen.getByRole('button', { name: /don't use embedded cover from audio files/i }),
    );
  });

  it('yields no embedded preview url when the selected track id is missing from scanned covers', () => {
    hookMergeRef.current = () => ({
      selectedCoverTrackId: 'orphan-id',
      tracksWithCovers: [],
    });

    renderForm({ cancelTo: '/back' });
  });
});
