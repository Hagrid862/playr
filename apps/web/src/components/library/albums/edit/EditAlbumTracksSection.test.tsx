import { EditAlbumTracksSection } from '@/components/library/albums/edit/EditAlbumTracksSection';
import type { EditAlbumTracksController } from '@/components/library/albums/edit/useEditAlbumTracks';
import { artistBuilder } from '@repo/testing/builders';
import { customRender } from '@repo/testing/web';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/api/library-artists/useLibraryArtists', () => ({
  useLibraryArtists: () => ({ isLoading: false, data: null }),
}));

vi.mock('@/stores/library.store', () => ({
  useLibraryStore: (selector: (s: { privateArtists: { id: string; name: string }[] }) => unknown) =>
    selector({ privateArtists: [artistBuilder({ id: 'a1', name: 'Alpha' })] }),
}));

const emptyPayload = {
  pendingArtistsToCreate: [],
  existingUpdates: [],
  deleteIds: [],
  newTracks: [],
};

function createTracksMock(): EditAlbumTracksController {
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
  };
}

describe('EditAlbumTracksSection', () => {
  let tracks: EditAlbumTracksController;

  beforeEach(() => {
    vi.clearAllMocks();
    tracks = createTracksMock();
  });

  it('renders audio upload area and empty tracks message', () => {
    customRender(<EditAlbumTracksSection tracks={tracks} />);
    expect(screen.getByText('Audio files')).toBeInTheDocument();
    expect(screen.getByText(/Click here or drop audio files/i)).toBeInTheDocument();
    expect(screen.getByText('No tracks on this album yet.')).toBeInTheDocument();
  });
});
