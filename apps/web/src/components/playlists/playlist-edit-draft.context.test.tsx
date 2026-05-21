import { customRender } from '@repo/testing/web';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaylistEditDraftProvider, usePlaylistEditDraft } from './playlist-edit-draft.context';
import { PlaylistSystemRole } from '@repo/db';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-error';

// Mock mutations
const updatePlaylistMock = vi.fn();
const uploadCoverMock = vi.fn();
const deleteCoverMock = vi.fn();
const reorderTracksMock = vi.fn();

// Mock query hooks
const useLibraryPlaylistDetailMock = vi.fn();
const useLibraryPlaylistsMock = vi.fn();

vi.mock('@/hooks/api/library-playlists/useLibraryPlaylistMutations', () => ({
  useUpdateLibraryPlaylist: () => ({ mutateAsync: updatePlaylistMock }),
  useUploadLibraryPlaylistCover: () => ({ mutateAsync: uploadCoverMock }),
  useDeleteLibraryPlaylistCover: () => ({ mutateAsync: deleteCoverMock }),
  useReorderPlaylistTracks: () => ({ mutateAsync: reorderTracksMock }),
}));

vi.mock('@/hooks/api/library-playlists/useLibraryPlaylistDetail', () => ({
  useLibraryPlaylistDetail: (playlistId: string, options: any) =>
    useLibraryPlaylistDetailMock(playlistId, options),
}));

vi.mock('@/hooks/api/library-playlists/useLibraryPlaylists', () => ({
  useLibraryPlaylists: () => useLibraryPlaylistsMock(),
}));

// Mock useNavigate
const navigateMock = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}));

// Mock Toast
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function ConsumerComponent({
  draftNameOverride,
  omitInputRef = false,
}: {
  draftNameOverride?: string;
  omitInputRef?: boolean;
}) {
  const {
    playlistId,
    detail: _detail,
    isLoading,
    isSaving,
    initialSnapshot,
    draftName,
    setDraftName,
    titleError,
    setTitleError,
    coverFile: _coverFile,
    setCoverFile,
    removeCover,
    scheduleRemoveCover,
    undoRemoveCover,
    coverInputRef,
    draftTrackIds,
    reorderTracksFromDragEnd,
    orderedTrackRows,
    isDirty,
    save,
    cancel,
    handleBackRequest,
  } = usePlaylistEditDraft();

  return (
    <div>
      <div data-testid="playlistId">{playlistId}</div>
      <div data-testid="draftName">{draftName}</div>
      <div data-testid="isDirty">{isDirty ? 'yes' : 'no'}</div>
      <div data-testid="titleError">{titleError || 'none'}</div>
      <div data-testid="isSaving">{isSaving ? 'yes' : 'no'}</div>
      <div data-testid="removeCover">{removeCover ? 'yes' : 'no'}</div>
      <div data-testid="isLoading">{isLoading ? 'yes' : 'no'}</div>
      <div data-testid="hasInitialSnapshot">{initialSnapshot ? 'yes' : 'no'}</div>
      <div data-testid="trackRows-count">{orderedTrackRows.length}</div>
      <div data-testid="draftTrackIds">{draftTrackIds.join(',')}</div>

      <button
        data-testid="btn-set-name"
        onClick={() => setDraftName(draftNameOverride || 'Updated Playlist')}
      >
        Set Name
      </button>
      <button data-testid="btn-set-name-empty" onClick={() => setDraftName('')}>
        Set Name Empty
      </button>
      <button
        data-testid="btn-set-cover"
        onClick={() => setCoverFile(new File(['file-content'], 'cover.png', { type: 'image/png' }))}
      >
        Set Cover File
      </button>
      <button data-testid="btn-clear-cover" onClick={() => setCoverFile(null)}>
        Clear Cover File
      </button>
      <button data-testid="btn-remove-cover" onClick={() => scheduleRemoveCover()}>
        Remove Cover
      </button>
      <button data-testid="btn-undo-remove" onClick={() => undoRemoveCover()}>
        Undo Remove
      </button>
      <button data-testid="btn-title-error" onClick={() => setTitleError('Manual Title Error')}>
        Set Title Error
      </button>
      <button
        data-testid="btn-mutate-snapshot-tracks"
        onClick={() => {
          if (initialSnapshot) {
            initialSnapshot.trackIds.push('mutated-track');
          }
        }}
      >
        Mutate Snapshot Tracks
      </button>

      <button
        data-testid="btn-reorder-valid"
        onClick={() =>
          reorderTracksFromDragEnd({
            active: { id: 'track-2' },
            over: { id: 'track-1' },
          } as any)
        }
      >
        Reorder Valid
      </button>
      <button
        data-testid="btn-reorder-same"
        onClick={() =>
          reorderTracksFromDragEnd({
            active: { id: 'track-1' },
            over: { id: 'track-1' },
          } as any)
        }
      >
        Reorder Same
      </button>
      <button
        data-testid="btn-reorder-no-over"
        onClick={() =>
          reorderTracksFromDragEnd({
            active: { id: 'track-1' },
            over: null,
          } as any)
        }
      >
        Reorder No Over
      </button>
      <button
        data-testid="btn-reorder-missing"
        onClick={() =>
          reorderTracksFromDragEnd({
            active: { id: 'track-missing' },
            over: { id: 'track-1' },
          } as any)
        }
      >
        Reorder Missing
      </button>

      <button data-testid="btn-save" onClick={() => void save()}>
        Save
      </button>
      <button data-testid="btn-cancel" onClick={() => cancel()}>
        Cancel
      </button>
      <button data-testid="btn-back" onClick={() => handleBackRequest()}>
        Back
      </button>

      {!omitInputRef && <input type="file" ref={coverInputRef} data-testid="cover-input" />}
    </div>
  );
}

describe('PlaylistEditDraftProvider Context Suite', () => {
  const mockPlaylistDetail = {
    id: 'playlist-123',
    name: 'Chill Vibes',
    systemRole: null,
    cover: { url: 'https://example.com/chill.jpg' },
    tracks: [{ track: { id: 'track-1' } }, { track: { id: 'track-2' } }],
  };

  const mockLibraryPlaylists = {
    data: {
      items: [
        { id: 'playlist-123', name: 'Chill Vibes', systemRole: null },
        { id: 'playlist-456', name: 'Alternative Rocks', systemRole: null },
      ],
    },
  };

  const mockConfirm = vi.fn();
  const mockHistoryBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default hooks return mock values
    useLibraryPlaylistDetailMock.mockReturnValue({
      data: { data: mockPlaylistDetail },
      isLoading: false,
    });
    useLibraryPlaylistsMock.mockReturnValue({
      data: mockLibraryPlaylists,
    });

    // Mock window APIs
    vi.stubGlobal('confirm', mockConfirm);
    vi.stubGlobal('history', { back: mockHistoryBack });
    mockConfirm.mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws an error if usePlaylistEditDraft is used outside of the provider', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      customRender(<ConsumerComponent />);
    }).toThrow('usePlaylistEditDraft must be used within PlaylistEditDraftProvider');

    consoleErrorSpy.mockRestore();
  });

  it('renders initial state correctly from API detail data', () => {
    customRender(
      <PlaylistEditDraftProvider playlistId="playlist-123">
        <ConsumerComponent />
      </PlaylistEditDraftProvider>,
    );

    expect(screen.getByTestId('playlistId').textContent).toBe('playlist-123');
    expect(screen.getByTestId('draftName').textContent).toBe('Chill Vibes');
    expect(screen.getByTestId('isDirty').textContent).toBe('no');
    expect(screen.getByTestId('isLoading').textContent).toBe('no');
    expect(screen.getByTestId('hasInitialSnapshot').textContent).toBe('yes');
    expect(screen.getByTestId('trackRows-count').textContent).toBe('2');
    expect(screen.getByTestId('draftTrackIds').textContent).toBe('track-1,track-2');
  });

  it('handles loading state correctly', () => {
    useLibraryPlaylistDetailMock.mockReturnValueOnce({
      data: null,
      isLoading: true,
    });

    customRender(
      <PlaylistEditDraftProvider playlistId="playlist-123">
        <ConsumerComponent />
      </PlaylistEditDraftProvider>,
    );

    expect(screen.getByTestId('isLoading').textContent).toBe('yes');
    expect(screen.getByTestId('hasInitialSnapshot').textContent).toBe('no');
  });

  it('returns early and does not initialize snapshot if playlist has favorites system role', () => {
    const favDetail = {
      ...mockPlaylistDetail,
      systemRole: PlaylistSystemRole.favorites,
    };
    useLibraryPlaylistDetailMock.mockReturnValueOnce({
      data: { data: favDetail },
      isLoading: false,
    });

    customRender(
      <PlaylistEditDraftProvider playlistId="playlist-123">
        <ConsumerComponent />
      </PlaylistEditDraftProvider>,
    );

    expect(screen.getByTestId('hasInitialSnapshot').textContent).toBe('no');
  });

  it('sets manual title error correctly', () => {
    customRender(
      <PlaylistEditDraftProvider playlistId="playlist-123">
        <ConsumerComponent />
      </PlaylistEditDraftProvider>,
    );

    expect(screen.getByTestId('titleError').textContent).toBe('none');
    fireEvent.click(screen.getByTestId('btn-title-error'));
    expect(screen.getByTestId('titleError').textContent).toBe('Manual Title Error');
  });

  describe('isDirty state evaluation', () => {
    it('is dirty when name is changed (ignoring leading/trailing whitespace)', () => {
      customRender(
        <PlaylistEditDraftProvider playlistId="playlist-123">
          <ConsumerComponent />
        </PlaylistEditDraftProvider>,
      );

      expect(screen.getByTestId('isDirty').textContent).toBe('no');

      // Change name to something different
      fireEvent.click(screen.getByTestId('btn-set-name'));
      expect(screen.getByTestId('isDirty').textContent).toBe('yes');
      expect(screen.getByTestId('titleError').textContent).toBe('none'); // cleared title error
    });

    it('is dirty when cover file is added', () => {
      customRender(
        <PlaylistEditDraftProvider playlistId="playlist-123">
          <ConsumerComponent />
        </PlaylistEditDraftProvider>,
      );

      fireEvent.click(screen.getByTestId('btn-set-cover'));
      expect(screen.getByTestId('isDirty').textContent).toBe('yes');
      expect(screen.getByTestId('removeCover').textContent).toBe('no'); // coverFile falsifies removeCover

      // clear it
      fireEvent.click(screen.getByTestId('btn-clear-cover'));
      expect(screen.getByTestId('isDirty').textContent).toBe('no');
    });

    it('is dirty when cover removal is scheduled and the playlist has an initial cover', () => {
      customRender(
        <PlaylistEditDraftProvider playlistId="playlist-123">
          <ConsumerComponent />
        </PlaylistEditDraftProvider>,
      );

      const fileInput = screen.getByTestId('cover-input') as HTMLInputElement;
      Object.defineProperty(fileInput, 'value', { value: 'dummy-val', writable: true });

      fireEvent.click(screen.getByTestId('btn-remove-cover'));
      expect(screen.getByTestId('isDirty').textContent).toBe('yes');
      expect(screen.getByTestId('removeCover').textContent).toBe('yes');
      expect(fileInput.value).toBe(''); // cleared file input ref

      // Undo removal
      fireEvent.click(screen.getByTestId('btn-undo-remove'));
      expect(screen.getByTestId('isDirty').textContent).toBe('no');
      expect(screen.getByTestId('removeCover').textContent).toBe('no');
    });

    it('is NOT dirty when cover removal is scheduled but the playlist had no initial cover', () => {
      const detailNoCover = {
        ...mockPlaylistDetail,
        cover: null,
      };
      useLibraryPlaylistDetailMock.mockReturnValueOnce({
        data: { data: detailNoCover },
        isLoading: false,
      });

      customRender(
        <PlaylistEditDraftProvider playlistId="playlist-123">
          <ConsumerComponent />
        </PlaylistEditDraftProvider>,
      );

      fireEvent.click(screen.getByTestId('btn-remove-cover'));
      expect(screen.getByTestId('isDirty').textContent).toBe('no');
    });

    it('is dirty when track count or track order changes', () => {
      customRender(
        <PlaylistEditDraftProvider playlistId="playlist-123">
          <ConsumerComponent />
        </PlaylistEditDraftProvider>,
      );

      expect(screen.getByTestId('isDirty').textContent).toBe('no');

      // Reorder tracks
      fireEvent.click(screen.getByTestId('btn-reorder-valid'));
      expect(screen.getByTestId('isDirty').textContent).toBe('yes');
      expect(screen.getByTestId('trackRows-count').textContent).toBe('2');
      expect(screen.getByTestId('draftTrackIds').textContent).toBe('track-2,track-1');
    });
  });

  describe('reorderTracksFromDragEnd validation', () => {
    it('ignores if over element is null', () => {
      customRender(
        <PlaylistEditDraftProvider playlistId="playlist-123">
          <ConsumerComponent />
        </PlaylistEditDraftProvider>,
      );

      fireEvent.click(screen.getByTestId('btn-reorder-no-over'));
      expect(screen.getByTestId('draftTrackIds').textContent).toBe('track-1,track-2');
    });

    it('ignores if active and over are identical', () => {
      customRender(
        <PlaylistEditDraftProvider playlistId="playlist-123">
          <ConsumerComponent />
        </PlaylistEditDraftProvider>,
      );

      fireEvent.click(screen.getByTestId('btn-reorder-same'));
      expect(screen.getByTestId('draftTrackIds').textContent).toBe('track-1,track-2');
    });

    it('ignores if active ID is missing in draftTrackIds', () => {
      customRender(
        <PlaylistEditDraftProvider playlistId="playlist-123">
          <ConsumerComponent />
        </PlaylistEditDraftProvider>,
      );

      fireEvent.click(screen.getByTestId('btn-reorder-missing'));
      expect(screen.getByTestId('draftTrackIds').textContent).toBe('track-1,track-2');
    });
  });

  describe('Save functionality', () => {
    it('shows error toast when trying to save with an empty name', async () => {
      customRender(
        <PlaylistEditDraftProvider playlistId="playlist-123">
          <ConsumerComponent />
        </PlaylistEditDraftProvider>,
      );

      fireEvent.click(screen.getByTestId('btn-set-name-empty'));
      fireEvent.click(screen.getByTestId('btn-save'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Enter a playlist name');
      });
    });

    it('validates and blocks save if playlist name is already taken by a different custom playlist', async () => {
      customRender(
        <PlaylistEditDraftProvider playlistId="playlist-123">
          <ConsumerComponent draftNameOverride="Alternative Rocks" />
        </PlaylistEditDraftProvider>,
      );

      fireEvent.click(screen.getByTestId('btn-set-name'));
      fireEvent.click(screen.getByTestId('btn-save'));

      await waitFor(() => {
        expect(screen.getByTestId('titleError').textContent).toBe(
          'This playlist name is already taken',
        );
      });
    });

    it('handles successful save with modified name, deleted cover, and reordered tracks', async () => {
      updatePlaylistMock.mockResolvedValueOnce({});
      deleteCoverMock.mockResolvedValueOnce({});
      reorderTracksMock.mockResolvedValueOnce({});

      customRender(
        <PlaylistEditDraftProvider playlistId="playlist-123">
          <ConsumerComponent />
        </PlaylistEditDraftProvider>,
      );

      // Change name
      fireEvent.click(screen.getByTestId('btn-set-name'));
      // Remove cover
      fireEvent.click(screen.getByTestId('btn-remove-cover'));
      // Reorder tracks
      fireEvent.click(screen.getByTestId('btn-reorder-valid'));

      fireEvent.click(screen.getByTestId('btn-save'));

      await waitFor(() => {
        expect(updatePlaylistMock).toHaveBeenCalledWith({
          playlistId: 'playlist-123',
          body: { name: 'Updated Playlist' },
        });
        expect(deleteCoverMock).toHaveBeenCalledWith('playlist-123');
        expect(reorderTracksMock).toHaveBeenCalledWith({
          playlistId: 'playlist-123',
          body: { orderedTrackIds: ['track-2', 'track-1'] },
        });
        expect(toast.success).toHaveBeenCalledWith('Playlist updated');
        expect(navigateMock).toHaveBeenCalledWith({
          to: '/app/playlists/$playlistId',
          params: { playlistId: 'playlist-123' },
        });
      });
    });

    it('handles successful save with uploaded cover file', async () => {
      uploadCoverMock.mockResolvedValueOnce({});

      customRender(
        <PlaylistEditDraftProvider playlistId="playlist-123">
          <ConsumerComponent />
        </PlaylistEditDraftProvider>,
      );

      // Set cover file (dirty)
      fireEvent.click(screen.getByTestId('btn-set-cover'));

      fireEvent.click(screen.getByTestId('btn-save'));

      await waitFor(() => {
        expect(uploadCoverMock).toHaveBeenCalledWith({
          playlistId: 'playlist-123',
          file: expect.any(File),
        });
        expect(toast.success).toHaveBeenCalledWith('Playlist updated');
      });
    });

    it('handles 409 ApiError exception on save gracefully', async () => {
      updatePlaylistMock.mockRejectedValueOnce(
        new ApiError(409, 'Conflict', { error: { message: 'Server Conflict Name' } }),
      );

      customRender(
        <PlaylistEditDraftProvider playlistId="playlist-123">
          <ConsumerComponent />
        </PlaylistEditDraftProvider>,
      );

      fireEvent.click(screen.getByTestId('btn-set-name'));
      fireEvent.click(screen.getByTestId('btn-save'));

      await waitFor(() => {
        expect(screen.getByTestId('titleError').textContent).toBe('Server Conflict Name');
      });
    });

    it('handles generic exception on save gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      updatePlaylistMock.mockRejectedValueOnce(new Error('Random Server Crash'));

      customRender(
        <PlaylistEditDraftProvider playlistId="playlist-123">
          <ConsumerComponent />
        </PlaylistEditDraftProvider>,
      );

      fireEvent.click(screen.getByTestId('btn-set-name'));
      fireEvent.click(screen.getByTestId('btn-save'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Could not update playlist');
        expect(consoleErrorSpy).toHaveBeenCalled();
      });
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Cancel functionality', () => {
    it('navigates immediately if form is not dirty', () => {
      customRender(
        <PlaylistEditDraftProvider playlistId="playlist-123">
          <ConsumerComponent />
        </PlaylistEditDraftProvider>,
      );

      fireEvent.click(screen.getByTestId('btn-cancel'));
      expect(navigateMock).toHaveBeenCalledWith({
        to: '/app/playlists/$playlistId',
        params: { playlistId: 'playlist-123' },
      });
    });

    it('asks for confirmation when dirty, and navigates on yes', () => {
      mockConfirm.mockReturnValueOnce(true);

      customRender(
        <PlaylistEditDraftProvider playlistId="playlist-123">
          <ConsumerComponent />
        </PlaylistEditDraftProvider>,
      );

      fireEvent.click(screen.getByTestId('btn-set-name'));
      fireEvent.click(screen.getByTestId('btn-cancel'));

      expect(mockConfirm).toHaveBeenCalledWith('Discard unsaved changes?');
      expect(navigateMock).toHaveBeenCalledWith({
        to: '/app/playlists/$playlistId',
        params: { playlistId: 'playlist-123' },
      });
    });

    it('asks for confirmation when dirty, and does nothing on no', () => {
      mockConfirm.mockReturnValueOnce(false);

      customRender(
        <PlaylistEditDraftProvider playlistId="playlist-123">
          <ConsumerComponent />
        </PlaylistEditDraftProvider>,
      );

      fireEvent.click(screen.getByTestId('btn-set-name'));
      fireEvent.click(screen.getByTestId('btn-cancel'));

      expect(mockConfirm).toHaveBeenCalledWith('Discard unsaved changes?');
      expect(navigateMock).not.toHaveBeenCalled();
    });
  });

  describe('BackRequest functionality', () => {
    it('navigates back immediately if not dirty', () => {
      customRender(
        <PlaylistEditDraftProvider playlistId="playlist-123">
          <ConsumerComponent />
        </PlaylistEditDraftProvider>,
      );

      fireEvent.click(screen.getByTestId('btn-back'));
      expect(mockHistoryBack).toHaveBeenCalled();
    });

    it('asks for confirmation when dirty, and goes back on yes', () => {
      mockConfirm.mockReturnValueOnce(true);

      customRender(
        <PlaylistEditDraftProvider playlistId="playlist-123">
          <ConsumerComponent />
        </PlaylistEditDraftProvider>,
      );

      fireEvent.click(screen.getByTestId('btn-set-name'));
      fireEvent.click(screen.getByTestId('btn-back'));

      expect(mockConfirm).toHaveBeenCalledWith('Discard unsaved changes?');
      expect(mockHistoryBack).toHaveBeenCalled();
    });

    it('asks for confirmation when dirty, and does nothing on no', () => {
      mockConfirm.mockReturnValueOnce(false);

      customRender(
        <PlaylistEditDraftProvider playlistId="playlist-123">
          <ConsumerComponent />
        </PlaylistEditDraftProvider>,
      );

      fireEvent.click(screen.getByTestId('btn-set-name'));
      fireEvent.click(screen.getByTestId('btn-back'));

      expect(mockConfirm).toHaveBeenCalledWith('Discard unsaved changes?');
      expect(mockHistoryBack).not.toHaveBeenCalled();
    });
  });

  describe('Additional coverage edge-cases', () => {
    describe('Unbound coverInputRef scenarios (null ref)', () => {
      it('initializes snapshot and clears new cover selection without error when ref is null', () => {
        customRender(
          <PlaylistEditDraftProvider playlistId="playlist-123">
            <ConsumerComponent omitInputRef={true} />
          </PlaylistEditDraftProvider>,
        );

        expect(screen.getByTestId('hasInitialSnapshot').textContent).toBe('yes');

        // Trigger cover removal when coverInputRef is null
        fireEvent.click(screen.getByTestId('btn-remove-cover'));
        expect(screen.getByTestId('removeCover').textContent).toBe('yes');
      });
    });

    describe('Save edge-cases', () => {
      it('handles successful save when there are no dirty changes at all', async () => {
        customRender(
          <PlaylistEditDraftProvider playlistId="playlist-123">
            <ConsumerComponent />
          </PlaylistEditDraftProvider>,
        );

        fireEvent.click(screen.getByTestId('btn-save'));

        await waitFor(() => {
          expect(updatePlaylistMock).not.toHaveBeenCalled();
          expect(deleteCoverMock).not.toHaveBeenCalled();
          expect(uploadCoverMock).not.toHaveBeenCalled();
          expect(reorderTracksMock).not.toHaveBeenCalled();
          expect(toast.success).toHaveBeenCalledWith('Playlist updated');
          expect(navigateMock).toHaveBeenCalledWith({
            to: '/app/playlists/$playlistId',
            params: { playlistId: 'playlist-123' },
          });
        });
      });

      it('handles save successfully when playlistsResponse is undefined', async () => {
        useLibraryPlaylistsMock.mockReturnValueOnce({
          data: undefined,
        });

        customRender(
          <PlaylistEditDraftProvider playlistId="playlist-123">
            <ConsumerComponent />
          </PlaylistEditDraftProvider>,
        );

        fireEvent.click(screen.getByTestId('btn-save'));

        await waitFor(() => {
          expect(toast.success).toHaveBeenCalledWith('Playlist updated');
        });
      });

      it('returns early on save if initialSnapshot is null', async () => {
        useLibraryPlaylistDetailMock.mockReturnValueOnce({
          data: null,
          isLoading: true,
        });

        customRender(
          <PlaylistEditDraftProvider playlistId="playlist-123">
            <ConsumerComponent />
          </PlaylistEditDraftProvider>,
        );

        fireEvent.click(screen.getByTestId('btn-save'));

        await waitFor(() => {
          expect(updatePlaylistMock).not.toHaveBeenCalled();
          expect(toast.success).not.toHaveBeenCalled();
        });
      });

      it('does not trigger duplicate validation if the duplicate playlist is a system role favorites playlist', async () => {
        useLibraryPlaylistsMock.mockReturnValue({
          data: {
            data: {
              items: [
                { id: 'playlist-123', name: 'Chill Vibes', systemRole: null },
                {
                  id: 'playlist-favorites',
                  name: 'Alternative Rocks',
                  systemRole: PlaylistSystemRole.favorites,
                },
              ],
            },
          },
        });

        customRender(
          <PlaylistEditDraftProvider playlistId="playlist-123">
            <ConsumerComponent draftNameOverride="Alternative Rocks" />
          </PlaylistEditDraftProvider>,
        );

        fireEvent.click(screen.getByTestId('btn-set-name'));
        fireEvent.click(screen.getByTestId('btn-save'));

        await waitFor(() => {
          expect(screen.getByTestId('titleError').textContent).toBe('none');
          expect(toast.success).toHaveBeenCalledWith('Playlist updated');
        });
      });
    });

    describe('Track length dirty evaluation', () => {
      it('evaluates isDirty as true when draftTrackIds length differs from initialSnapshot trackIds length', () => {
        customRender(
          <PlaylistEditDraftProvider playlistId="playlist-123">
            <ConsumerComponent />
          </PlaylistEditDraftProvider>,
        );

        expect(screen.getByTestId('isDirty').textContent).toBe('no');

        // Mutate the initialSnapshot trackIds array to change its length
        fireEvent.click(screen.getByTestId('btn-mutate-snapshot-tracks'));
        // Trigger a reorder to update the draftTrackIds reference and force useMemo re-evaluation
        fireEvent.click(screen.getByTestId('btn-reorder-valid'));

        expect(screen.getByTestId('isDirty').textContent).toBe('yes');
      });
    });

    describe('Save playlistsResponse shapes', () => {
      it('handles save successfully when playlistsResponse is undefined', async () => {
        useLibraryPlaylistsMock.mockReturnValue({ data: undefined });

        customRender(
          <PlaylistEditDraftProvider playlistId="playlist-123">
            <ConsumerComponent />
          </PlaylistEditDraftProvider>,
        );

        fireEvent.click(screen.getByTestId('btn-save'));

        await waitFor(() => {
          expect(toast.success).toHaveBeenCalledWith('Playlist updated');
        });
      });

      it('handles save successfully when playlistsResponse.data is undefined', async () => {
        useLibraryPlaylistsMock.mockReturnValue({
          data: undefined,
        });

        customRender(
          <PlaylistEditDraftProvider playlistId="playlist-123">
            <ConsumerComponent />
          </PlaylistEditDraftProvider>,
        );

        fireEvent.click(screen.getByTestId('btn-save'));

        await waitFor(() => {
          expect(toast.success).toHaveBeenCalledWith('Playlist updated');
        });
      });

      it('handles save successfully when playlistsResponse.data.items is undefined', async () => {
        useLibraryPlaylistsMock.mockReturnValue({
          data: {
            data: {
              items: undefined,
            },
          },
        } as any);

        customRender(
          <PlaylistEditDraftProvider playlistId="playlist-123">
            <ConsumerComponent />
          </PlaylistEditDraftProvider>,
        );

        fireEvent.click(screen.getByTestId('btn-save'));

        await waitFor(() => {
          expect(toast.success).toHaveBeenCalledWith('Playlist updated');
        });
      });
    });
  });
});
