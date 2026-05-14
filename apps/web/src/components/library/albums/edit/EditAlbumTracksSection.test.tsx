import { checkLibraryArtistNameAvailability } from '@/hooks/api/library-artists/requests/checkLibraryArtistNameAvailability';
import { EditAlbumTracksSection } from '@/components/library/albums/edit/EditAlbumTracksSection';
import type { EditAlbumTracksController } from '@/components/library/albums/edit/useEditAlbumTracks';
import type { ZodGenreInfer, ZodTrack } from '@repo/contracts';
import { GenreKind } from '@repo/db';
import { GetLibraryArtistNameAvailabilityResponseSchema } from '@repo/contracts';
import { Visibility } from '@repo/db';
import { artistBuilder, trackBuilder } from '@repo/testing/builders';
import { customRender } from '@repo/testing/web';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/api/library-artists/useLibraryArtists', () => ({
  useLibraryArtists: () => ({ isLoading: false, data: null }),
}));

const libraryStoreState = vi.hoisted(() => ({
  privateArtists: [{ id: 'a1', name: 'Alpha' }] as { id: string; name: string }[],
}));

vi.mock('@/stores/library.store', () => ({
  useLibraryStore: (
    selector?: (s: { privateArtists: { id: string; name: string }[] }) => unknown,
  ) => {
    return selector
      ? selector({ privateArtists: libraryStoreState.privateArtists })
      : libraryStoreState;
  },
}));

/** Modal Add artist stays clickable with empty name; other buttons keep real `disabled`. */
vi.mock('@/components/ui/button', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui/button')>();
  return {
    ...actual,
    Button: ({ disabled, onClick, children, ...rest }: ComponentProps<'button'>) => {
      const isAddOrChecking = children === 'Add artist' || children === 'Checking…';
      const isChecking = children === 'Checking…';
      const resolvedDisabled = isAddOrChecking ? isChecking : disabled;
      return (
        <button type="button" {...rest} disabled={resolvedDisabled} onClick={onClick}>
          {children}
        </button>
      );
    },
  };
});

const availability = (available: boolean) =>
  GetLibraryArtistNameAvailabilityResponseSchema.parse({
    success: true,
    data: { available },
    error: null,
    meta: { timestamp: 't', requestId: 'r', path: '/p' },
  });

vi.mock('@/hooks/api/library-artists/requests/checkLibraryArtistNameAvailability', () => ({
  checkLibraryArtistNameAvailability: vi.fn(),
}));

const emptyPayload = {
  pendingArtistsToCreate: [],
  existingUpdates: [],
  deleteIds: [],
  newTracks: [],
};

function createTracksMock(
  overrides: Partial<EditAlbumTracksController> = {},
): EditAlbumTracksController {
  return {
    sortedExisting: [],
    sortedExistingActive: [],
    tracksMarkedForDeletion: [],
    pendingDeleteIds: new Set(),
    draftById: {},
    updateDraft: vi.fn(),
    isDirty: () => false,
    scheduleTrackDelete: vi.fn(),
    undoTrackDelete: vi.fn(),
    stagedTracks: [],
    addAudioFiles: vi.fn(),
    updateStagedTrack: vi.fn(),
    removeStagedTrack: vi.fn(),
    clearStagedTracks: vi.fn(),
    isScanningMetadata: false,
    defaultArtistIds: ['a1'],
    pendingArtists: [],
    registerPendingArtist: vi.fn(() => 'local:pending:test'),
    removePendingArtist: vi.fn(),
    prepareTracksSubmit: vi.fn(() => ({ ok: true as const, payload: emptyPayload })),
    hasTrackDraftChanges: false,
    updateAllTracksGenres: vi.fn(),
    ...overrides,
  };
}

const sampleTrack: ZodTrack = {
  ...trackBuilder({
    id: 'tr-9',
    title: 'Existing',
    trackNumber: 1,
    diskNumber: 1,
  }),
  visibility: Visibility.private,
  artists: [artistBuilder({ id: 'a1', name: 'Alpha' })],
  updatedAt: new Date('2024-01-01'),
} as ZodTrack;

const stagedSample = {
  id: 'st-1',
  file: new File(['x'], 'new.mp3', { type: 'audio/mp3' }),
  title: 'New',
  trackNumber: 1,
  diskNumber: 1,
  explicit: false,
  artistIds: ['a1'] as string[],
  genreIds: [] as string[],
};

function sampleGenre(overrides: Partial<ZodGenreInfer> = {}): ZodGenreInfer {
  return {
    id: 'g-rock',
    name: 'Rock',
    slug: 'rock',
    description: null,
    kind: GenreKind.system,
    libraryId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe('EditAlbumTracksSection', () => {
  let tracks: EditAlbumTracksController;

  beforeEach(() => {
    vi.clearAllMocks();
    libraryStoreState.privateArtists = [artistBuilder({ id: 'a1', name: 'Alpha' })];
    vi.mocked(checkLibraryArtistNameAvailability).mockResolvedValue(availability(true));
    tracks = createTracksMock();
  });

  it('renders audio upload area and empty tracks message', () => {
    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={vi.fn()}
      />,
    );
    expect(screen.getByText('Audio files')).toBeInTheDocument();
    expect(screen.getByText(/Click here or drop audio files/i)).toBeInTheDocument();
    expect(screen.getByText('No tracks on this album yet.')).toBeInTheDocument();
  });

  it('shows empty-artist helper when no library artists and no tracks', () => {
    libraryStoreState.privateArtists = [];
    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/Load library artists or add a new artist from a track/i),
    ).toBeInTheDocument();
    expect(screen.getByText('No tracks on this album yet.')).toBeInTheDocument();
  });

  it('lists existing active tracks and supports delete scheduling', async () => {
    const user = userEvent.setup();
    const scheduleTrackDelete = vi.fn();
    tracks = {
      ...createTracksMock(),
      sortedExistingActive: [sampleTrack],
      draftById: {
        'tr-9': {
          title: 'Existing',
          trackNumber: 1,
          diskNumber: 1,
          explicit: false,
          artistIds: ['a1'],
          genreIds: [],
        },
      },
      updateDraft: vi.fn(),
      scheduleTrackDelete,
    };

    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={vi.fn()}
      />,
    );

    expect(screen.getByText('Album tracks (1)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /remove track on save/i }));
    expect(scheduleTrackDelete).toHaveBeenCalledWith('tr-9');
  });

  it('updates existing track drafts via fields, explicit checkbox, numbers, and artists picker', async () => {
    const user = userEvent.setup();
    const updateDraft = vi.fn();
    tracks = {
      ...createTracksMock(),
      sortedExistingActive: [sampleTrack],
      draftById: {
        'tr-9': {
          title: 'Existing',
          trackNumber: 1,
          diskNumber: 1,
          explicit: false,
          artistIds: ['a1'],
          genreIds: [],
        },
      },
      updateDraft,
    };

    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={vi.fn()}
      />,
    );

    const titleInput = screen.getByLabelText(/track title/i);
    fireEvent.change(titleInput, { target: { value: 'Renamed' } });
    expect(updateDraft).toHaveBeenCalledWith('tr-9', expect.objectContaining({ title: 'Renamed' }));
    fireEvent.blur(titleInput);

    const diskInputs = screen.getAllByLabelText(/^disk no/i);
    const trackNoInputs = screen.getAllByLabelText(/^track no/i);
    expect(diskInputs.length).toBeGreaterThanOrEqual(1);
    const diskInput = diskInputs[0]!;
    const trackNoInput = trackNoInputs[0]!;

    fireEvent.change(diskInput, { target: { value: '3' } });
    expect(updateDraft).toHaveBeenCalledWith('tr-9', expect.objectContaining({ diskNumber: 3 }));

    fireEvent.change(trackNoInput, { target: { value: '9' } });
    expect(updateDraft).toHaveBeenCalledWith('tr-9', expect.objectContaining({ trackNumber: 9 }));

    fireEvent.change(trackNoInput, { target: { value: 'not-a-number' } });
    expect(updateDraft).toHaveBeenCalledWith('tr-9', expect.objectContaining({ trackNumber: 1 }));
    fireEvent.blur(trackNoInput);

    fireEvent.change(diskInput, { target: { value: '' } });
    fireEvent.blur(diskInput);
    expect(updateDraft).toHaveBeenCalledWith('tr-9', expect.objectContaining({ diskNumber: 1 }));

    await user.click(screen.getAllByRole('checkbox', { name: /explicit content/i })[0]!);
    expect(updateDraft).toHaveBeenCalledWith('tr-9', expect.objectContaining({ explicit: true }));

    await user.click(screen.getByRole('button', { name: /1 artist/i }));
    const alphaCheckbox = await screen.findByRole('checkbox', { name: /^alpha$/i });
    await user.click(alphaCheckbox);
    expect(updateDraft).toHaveBeenCalledWith('tr-9', expect.objectContaining({ artistIds: [] }));
  });

  it('confirms new artist from existing track and updates draft artist ids', async () => {
    const user = userEvent.setup();
    const updateDraft = vi.fn();
    const registerPendingArtist = vi.fn(() => 'local:pending:fixed');
    tracks = {
      ...createTracksMock(),
      registerPendingArtist,
      sortedExistingActive: [sampleTrack],
      draftById: {
        'tr-9': {
          title: 'Existing',
          trackNumber: 1,
          diskNumber: 1,
          explicit: false,
          artistIds: ['a1'],
          genreIds: [],
        },
      },
      updateDraft,
    };

    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /1 artist/i }));
    await user.click(screen.getByRole('button', { name: /\+ create new artist/i }));

    await user.type(screen.getByLabelText(/artist name/i), 'Modal Artist');
    await user.click(screen.getByRole('button', { name: /^add artist$/i }));

    await waitFor(() => {
      expect(registerPendingArtist).toHaveBeenCalledWith('Modal Artist');
      expect(updateDraft).toHaveBeenCalledWith('tr-9', {
        artistIds: ['a1', 'local:pending:fixed'],
      });
    });
  });

  it('does not render an existing track card when draft is missing for that id', () => {
    tracks = {
      ...createTracksMock(),
      sortedExistingActive: [sampleTrack],
      draftById: {},
    };

    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={vi.fn()}
      />,
    );

    expect(screen.getByText('Album tracks (1)')).toBeInTheDocument();
    expect(screen.queryByLabelText(/track title/i)).not.toBeInTheDocument();
  });

  it('shows staged tracks section when uploads exist', () => {
    tracks = {
      ...createTracksMock(),
      stagedTracks: [stagedSample],
    };

    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={vi.fn()}
      />,
    );

    expect(screen.getByText(/New tracks \(1\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear staged/i })).toBeInTheDocument();
  });

  it('updates staged tracks via fields and picker', async () => {
    const user = userEvent.setup();
    const updateStagedTrack = vi.fn();
    tracks = {
      ...createTracksMock(),
      stagedTracks: [stagedSample],
      updateStagedTrack,
    };

    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={vi.fn()}
      />,
    );

    const stagedTitle = screen.getByLabelText(/track title/i);
    fireEvent.change(stagedTitle, {
      target: { value: 'Staged Title' },
    });
    expect(updateStagedTrack).toHaveBeenCalledWith(
      'st-1',
      expect.objectContaining({ title: 'Staged Title' }),
    );
    fireEvent.blur(stagedTitle);

    const diskInput = screen.getByLabelText(/^disk no/i);
    const trackNoInput = screen.getByLabelText(/^track no/i);
    fireEvent.change(diskInput, { target: { value: '2' } });
    fireEvent.change(trackNoInput, { target: { value: '5' } });
    fireEvent.blur(diskInput);
    fireEvent.blur(trackNoInput);
    fireEvent.change(diskInput, { target: { value: '' } });
    fireEvent.change(trackNoInput, { target: { value: '' } });
    fireEvent.blur(diskInput);
    fireEvent.blur(trackNoInput);

    await user.click(screen.getByRole('checkbox', { name: /explicit content/i }));

    await user.click(screen.getByRole('button', { name: /1 artist/i }));
    await user.click(await screen.findByRole('checkbox', { name: /^alpha$/i }));

    expect(updateStagedTrack).toHaveBeenCalledWith(
      'st-1',
      expect.objectContaining({ diskNumber: 2 }),
    );
    expect(updateStagedTrack).toHaveBeenCalledWith(
      'st-1',
      expect.objectContaining({ trackNumber: 5 }),
    );
    expect(updateStagedTrack).toHaveBeenCalledWith(
      'st-1',
      expect.objectContaining({ diskNumber: 1 }),
    );
    expect(updateStagedTrack).toHaveBeenCalledWith(
      'st-1',
      expect.objectContaining({ trackNumber: 1 }),
    );
    expect(updateStagedTrack).toHaveBeenCalledWith(
      'st-1',
      expect.objectContaining({ explicit: true }),
    );
    expect(updateStagedTrack).toHaveBeenCalledWith(
      'st-1',
      expect.objectContaining({ artistIds: [] }),
    );
  });

  it('disables staged actions while metadata is scanning', () => {
    tracks = {
      ...createTracksMock(),
      isScanningMetadata: true,
      stagedTracks: [
        {
          ...stagedSample,
          title: 'Scan',
          file: new File(['x'], 'scan.mp3', { type: 'audio/mp3' }),
        },
      ],
    };

    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={vi.fn()}
      />,
    );

    expect(screen.getByText(/Scanning metadata/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove staged track/i })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /explicit content/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /1 artist/i })).toBeDisabled();
  });

  it('clears staged tracks and removes a single staged track', async () => {
    const user = userEvent.setup();
    const clearStagedTracks = vi.fn();
    const removeStagedTrack = vi.fn();
    tracks = {
      ...createTracksMock(),
      stagedTracks: [stagedSample],
      clearStagedTracks,
      removeStagedTrack,
    };

    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /clear staged/i }));
    expect(clearStagedTracks).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /remove staged track/i }));
    expect(removeStagedTrack).toHaveBeenCalledWith('st-1');
  });

  it('confirms new artist from staged track and merges artist ids', async () => {
    const user = userEvent.setup();
    const updateStagedTrack = vi.fn();
    const registerPendingArtist = vi.fn(() => 'local:pending:staged');
    tracks = {
      ...createTracksMock(),
      registerPendingArtist,
      stagedTracks: [stagedSample],
      updateStagedTrack,
    };

    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /1 artist/i }));
    await user.click(screen.getByRole('button', { name: /\+ create new artist/i }));

    await user.type(screen.getByLabelText(/artist name/i), 'Staged Modal');
    await user.click(screen.getByRole('button', { name: /^add artist$/i }));

    await waitFor(() => {
      expect(registerPendingArtist).toHaveBeenCalledWith('Staged Modal');
      expect(updateStagedTrack).toHaveBeenCalledWith('st-1', {
        artistIds: ['a1', 'local:pending:staged'],
      });
    });
  });

  it('create-artist from staged track merges ids when artistIds is undefined', async () => {
    const user = userEvent.setup();
    const updateStagedTrack = vi.fn();
    const registerPendingArtist = vi.fn(() => 'local:pending:no-ids');
    const stagedWithoutArtistIds = {
      ...stagedSample,
      artistIds: undefined as unknown as string[],
    };
    tracks = {
      ...createTracksMock(),
      registerPendingArtist,
      stagedTracks: [stagedWithoutArtistIds],
      updateStagedTrack,
    };

    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /select artists/i }));
    await user.click(screen.getByRole('button', { name: /\+ create new artist/i }));

    await user.type(screen.getByLabelText(/artist name/i), 'Only Pending');
    await user.click(screen.getByRole('button', { name: /^add artist$/i }));

    await waitFor(() => {
      expect(updateStagedTrack).toHaveBeenCalledWith('st-1', {
        artistIds: ['local:pending:no-ids'],
      });
    });
  });

  it('shows pending artists chips when hook reports pending adds', () => {
    tracks = {
      ...createTracksMock(),
      pendingArtists: [{ id: 'local:pending:x', name: 'Soon' }],
    };

    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={vi.fn()}
      />,
    );

    expect(screen.getByText('Soon')).toBeInTheDocument();
  });

  it('removes a pending artist chip', async () => {
    const user = userEvent.setup();
    const removePendingArtist = vi.fn();
    tracks = {
      ...createTracksMock(),
      pendingArtists: [{ id: 'local:pending:x', name: 'Soon' }],
      removePendingArtist,
    };

    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /remove soon/i }));
    expect(removePendingArtist).toHaveBeenCalledWith('local:pending:x');
  });

  it('shows metadata scanning row when scanning staged uploads', () => {
    tracks = {
      ...createTracksMock(),
      isScanningMetadata: true,
      stagedTracks: [
        {
          id: 'st-1',
          file: new File(['x'], 'scan.mp3', { type: 'audio/mp3' }),
          title: 'Scan',
          trackNumber: 1,
          diskNumber: 1,
          explicit: false,
          artistIds: ['a1'],
        },
      ],
    };

    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={vi.fn()}
      />,
    );
    expect(screen.getByText(/Scanning metadata/i)).toBeInTheDocument();
  });

  it('renders removal-on-save list with undo', async () => {
    const user = userEvent.setup();
    const undoTrackDelete = vi.fn();
    tracks = {
      ...createTracksMock(),
      tracksMarkedForDeletion: [sampleTrack],
      sortedExistingActive: [],
      undoTrackDelete,
    };

    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(undoTrackDelete).toHaveBeenCalledWith('tr-9');
  });

  it('opens the new-artist dialog from the track artist picker', async () => {
    const user = userEvent.setup();
    tracks = {
      ...createTracksMock(),
      sortedExistingActive: [sampleTrack],
      draftById: {
        'tr-9': {
          title: 'Existing',
          trackNumber: 1,
          diskNumber: 1,
          explicit: false,
          artistIds: ['a1'],
          genreIds: [],
        },
      },
    };

    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /1 artist/i }));
    await user.click(screen.getByRole('button', { name: /\+ create new artist/i }));

    expect(screen.getByRole('heading', { name: /new artist/i })).toBeInTheDocument();
  });

  it('clears genres on an existing track via picker “No genres”', async () => {
    const user = userEvent.setup();
    const updateDraft = vi.fn();
    tracks = {
      ...createTracksMock(),
      sortedExistingActive: [sampleTrack],
      draftById: {
        'tr-9': {
          title: 'Existing',
          trackNumber: 1,
          diskNumber: 1,
          explicit: false,
          artistIds: ['a1'],
          genreIds: ['g-rock'],
        },
      },
      updateDraft,
    };

    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[sampleGenre()]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText(/^Track Genres$/i));
    await user.click(screen.getByRole('option', { name: /^No genres$/i }));

    expect(updateDraft).toHaveBeenCalledWith('tr-9', { genreIds: [] });
  });

  it('toggles a genre off on an existing track', async () => {
    const user = userEvent.setup();
    const updateDraft = vi.fn();
    tracks = {
      ...createTracksMock(),
      sortedExistingActive: [sampleTrack],
      draftById: {
        'tr-9': {
          title: 'Existing',
          trackNumber: 1,
          diskNumber: 1,
          explicit: false,
          artistIds: ['a1'],
          genreIds: ['g-rock'],
        },
      },
      updateDraft,
    };

    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[sampleGenre()]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText(/^Track Genres$/i));
    await user.click(screen.getByRole('option', { name: /^Rock$/i }));

    expect(updateDraft).toHaveBeenCalledWith('tr-9', { genreIds: [] });
  });

  it('appends a pending genre id when creating from an existing track picker', async () => {
    const user = userEvent.setup();
    const updateDraft = vi.fn();
    const onRequestCreateGenre = vi.fn((onCreated: (id: string) => void) => {
      onCreated('brand-new-genre');
    });

    tracks = {
      ...createTracksMock(),
      sortedExistingActive: [sampleTrack],
      draftById: {
        'tr-9': {
          title: 'Existing',
          trackNumber: 1,
          diskNumber: 1,
          explicit: false,
          artistIds: ['a1'],
          genreIds: [],
        },
      },
      updateDraft,
    };

    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[sampleGenre()]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={onRequestCreateGenre}
      />,
    );

    await user.click(screen.getByLabelText(/^Track Genres$/i));
    await user.click(screen.getByRole('option', { name: /create new genre/i }));

    expect(onRequestCreateGenre).toHaveBeenCalled();
    expect(updateDraft).toHaveBeenCalledWith('tr-9', { genreIds: ['brand-new-genre'] });
  });

  it('clears staged track genres via picker “No genres”', async () => {
    const user = userEvent.setup();
    const updateStagedTrack = vi.fn();
    tracks = {
      ...createTracksMock(),
      stagedTracks: [{ ...stagedSample, genreIds: ['g-rock'] }],
      updateStagedTrack,
    };

    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[sampleGenre()]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText(/^Track Genres$/i));
    await user.click(screen.getByRole('option', { name: /^No genres$/i }));

    expect(updateStagedTrack).toHaveBeenCalledWith('st-1', { genreIds: [] });
  });

  it('toggles a staged track genre off', async () => {
    const user = userEvent.setup();
    const updateStagedTrack = vi.fn();
    tracks = {
      ...createTracksMock(),
      stagedTracks: [{ ...stagedSample, genreIds: ['g-rock'] }],
      updateStagedTrack,
    };

    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[sampleGenre()]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText(/^Track Genres$/i));
    await user.click(screen.getByRole('option', { name: /^Rock$/i }));

    expect(updateStagedTrack).toHaveBeenCalledWith('st-1', { genreIds: [] });
  });

  it('adds a genre id on a staged track via create-genre callback', async () => {
    const user = userEvent.setup();
    const updateStagedTrack = vi.fn();
    const onRequestCreateGenre = vi.fn((onCreated: (id: string) => void) => {
      onCreated('new-g');
    });

    tracks = {
      ...createTracksMock(),
      stagedTracks: [{ ...stagedSample, genreIds: [] }],
      updateStagedTrack,
    };

    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[sampleGenre()]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={onRequestCreateGenre}
      />,
    );

    await user.click(screen.getByLabelText(/^Track Genres$/i));
    await user.click(screen.getByRole('option', { name: /create new genre/i }));

    expect(updateStagedTrack).toHaveBeenCalledWith('st-1', { genreIds: ['new-g'] });
  });

  it('adds a library genre to an existing track that had no genres selected', async () => {
    const user = userEvent.setup();
    const updateDraft = vi.fn();
    tracks = {
      ...createTracksMock(),
      sortedExistingActive: [sampleTrack],
      draftById: {
        'tr-9': {
          title: 'Existing',
          trackNumber: 1,
          diskNumber: 1,
          explicit: false,
          artistIds: ['a1'],
          genreIds: [],
        },
      },
      updateDraft,
    };

    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[sampleGenre()]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText(/^Track Genres$/i));
    await user.click(screen.getByRole('option', { name: /^Rock$/i }));

    expect(updateDraft).toHaveBeenCalledWith('tr-9', { genreIds: ['g-rock'] });
  });

  it('uses staged genreIds fallback when appending a created genre', async () => {
    const user = userEvent.setup();
    const updateStagedTrack = vi.fn();
    const onRequestCreateGenre = vi.fn((onCreated: (id: string) => void) => {
      onCreated('from-parent');
    });

    tracks = {
      ...createTracksMock(),
      stagedTracks: [{ ...stagedSample, genreIds: undefined as unknown as string[] }],
      updateStagedTrack,
    };

    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[sampleGenre()]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={onRequestCreateGenre}
      />,
    );

    await user.click(screen.getByLabelText(/^Track Genres$/i));
    await user.click(screen.getByRole('option', { name: /create new genre/i }));

    expect(updateStagedTrack).toHaveBeenCalledWith('st-1', { genreIds: ['from-parent'] });
  });

  it('toggles genres on a staged track when genreIds was undefined', async () => {
    const user = userEvent.setup();
    const updateStagedTrack = vi.fn();

    tracks = {
      ...createTracksMock(),
      stagedTracks: [{ ...stagedSample, genreIds: undefined as unknown as string[] }],
      updateStagedTrack,
    };

    customRender(
      <EditAlbumTracksSection
        tracks={tracks}
        genres={[sampleGenre()]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onRequestCreateGenre={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText(/^Track Genres$/i));
    await user.click(screen.getByRole('option', { name: /^Rock$/i }));

    expect(updateStagedTrack).toHaveBeenCalledWith('st-1', { genreIds: ['g-rock'] });
  });
});
