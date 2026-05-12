import type { UpdateLibraryAlbumRequest, ZodAlbum } from '@repo/contracts';
import { albumBuilder } from '@repo/testing/builders';
import { customRender } from '@repo/testing/web';
import { useLibraryGenres } from '@/hooks/api/library-genres/useLibraryGenres';
import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditAlbumForm } from './EditAlbumForm';
import type { EditAlbumTracksSubmitPayload } from './useEditAlbumTracks';
import { useEditAlbumForm, useEditAlbumForm as useEditAlbumFormMock } from './useEditAlbumForm';

type UseEditAlbumFormReturn = ReturnType<typeof useEditAlbumForm>;

const createLibraryGenreHoisted = vi.hoisted(() => ({
  mutateAsync: vi.fn().mockResolvedValue({ data: { id: 'resolved-genre-id' } }),
}));

const createLibraryArtistHoisted = vi.hoisted(() => ({
  mutateAsync: vi.fn().mockResolvedValue({ data: { id: 'resolved-artist-id' } }),
}));

const useEditAlbumTracksState = vi.hoisted(() => ({
  pendingArtists: [] as { id: string; name: string }[],
}));

const hoistedMocks = vi.hoisted(() => {
  const emptyTracksPayload = {
    pendingArtistsToCreate: [] as { localId: string; name: string }[],
    existingUpdates: [] as { trackId: string; data: Record<string, unknown> }[],
    deleteIds: [] as string[],
    newTracks: [] as unknown[],
  };

  const genreIdsStateRef = { current: [] as string[] };
  const artistIdsStateRef = { current: [] as string[] };
  const trackGenreCallbackMock = vi.fn();
  const updateAllTracksGenresMock = vi.fn();
  const updateAllTracksArtistsMock = vi.fn();

  const createMockTanStackForm = () => {
    const listeners = new Set<() => void>();
    let storeState: { values: { genreIds: string[]; artistIds: string[] } } = {
      values: {
        genreIds: [...genreIdsStateRef.current],
        artistIds: [...artistIdsStateRef.current],
      },
    };

    const notifyStoreListeners = () => {
      for (const listener of listeners) listener();
    };

    const syncStoreState = () => {
      storeState = {
        values: {
          genreIds: [...genreIdsStateRef.current],
          artistIds: [...artistIdsStateRef.current],
        },
      };
    };

    const store = {
      get state() {
        return storeState;
      },
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return {
          unsubscribe: () => {
            listeners.delete(listener);
          },
        };
      },
    };

    return {
      handleSubmit: vi.fn(),
      getFieldValue: vi.fn((name: string) => {
        if (name === 'genreIds') return genreIdsStateRef.current;
        if (name === 'artistIds') return artistIdsStateRef.current;
        return undefined;
      }),
      setFieldValue: vi.fn((name: string, value: unknown) => {
        if (name === 'genreIds') {
          genreIdsStateRef.current = value as string[];
          syncStoreState();
          notifyStoreListeners();
        } else if (name === 'artistIds') {
          artistIdsStateRef.current = value as string[];
          syncStoreState();
          notifyStoreListeners();
        }
      }),
      store,
    };
  };

  let stableForm: ReturnType<typeof createMockTanStackForm> | null = null;

  const getStableMockForm = () => {
    if (!stableForm) stableForm = createMockTanStackForm();
    return stableForm;
  };

  const resetStableMockForm = () => {
    stableForm = null;
    genreIdsStateRef.current = [];
    artistIdsStateRef.current = [];
  };

  const cloneFormReference = () => ({ ...getStableMockForm() });

  const buildDefaultUseEditAlbumFormReturn = (album: ZodAlbum) => {
    const form = getStableMockForm();
    return {
      form,
      coverInputRef: { current: null },
      currentCoverUrl: album.cover?.url,
      handleFiles: vi.fn(),
      handleRemoveCover: vi.fn(),
      isFormatModalOpen: false,
      setIsFormatModalOpen: vi.fn(),
      isMultipleFilesModalOpen: false,
      setIsMultipleFilesModalOpen: vi.fn(),
      handleCoverSelect: vi.fn(),
    };
  };

  return {
    emptyTracksPayload,
    createMockTanStackForm,
    resetStableMockForm,
    getStableMockForm,
    buildDefaultUseEditAlbumFormReturn,
    cloneFormReference,
    genreIdsStateRef,
    artistIdsStateRef,
    trackGenreCallbackMock,
    updateAllTracksGenresMock,
    updateAllTracksArtistsMock,
  };
});

const {
  createMockTanStackForm,
  resetStableMockForm,
  getStableMockForm,
  buildDefaultUseEditAlbumFormReturn,
  cloneFormReference,
  genreIdsStateRef,
  artistIdsStateRef,
  trackGenreCallbackMock,
  updateAllTracksGenresMock,
  updateAllTracksArtistsMock,
} = hoistedMocks;

vi.mock('@phosphor-icons/react', () => ({
  CircleNotchIcon: () => null,
  FloppyDiskIcon: () => null,
  XIcon: () => null,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...rest}>{children}</button>
  ),
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

vi.mock('@/components/ui/GlobalDropzone', () => ({
  GlobalDropzone: ({ children, className }: { children?: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock('@/hooks/api/library-genres/useLibraryGenres', () => ({
  useLibraryGenres: vi.fn(() => ({
    data: {
      success: true as const,
      data: { items: [] as const, total: 0, page: 1, limit: 100 },
      error: null,
      meta: { timestamp: '', requestId: '', path: '' },
    },
    isLoading: false,
  })),
}));

vi.mock('@/hooks/api/library-genres/useCreateLibraryGenre', () => ({
  useCreateLibraryGenre: vi.fn(() => ({
    mutateAsync: createLibraryGenreHoisted.mutateAsync,
  })),
}));

vi.mock('@/hooks/api/library-artists/useCreateLibraryArtist', () => ({
  useCreateLibraryArtist: vi.fn(() => ({
    mutateAsync: createLibraryArtistHoisted.mutateAsync,
  })),
}));

vi.mock('../create/CreateLibraryGenreNameModal', () => ({
  CreateLibraryGenreNameModal: ({
    open,
    onOpenChange,
    onConfirm,
    pendingGenreNames,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (name: string) => void;
    pendingGenreNames: string[];
  }) => (
    <>
      <span data-testid="pending-genre-count">{pendingGenreNames.length}</span>
      {open ? (
        <div data-testid="create-genre-modal">
          <button type="button" onClick={() => onOpenChange(true)}>
            emit-open-true
          </button>
          <button type="button" onClick={() => onConfirm('Fresh Genre')}>
            confirm-new-genre-name
          </button>
          <button type="button" onClick={() => onOpenChange(false)}>
            close-genre-modal
          </button>
        </div>
      ) : null}
    </>
  ),
}));

vi.mock('../create/CreateLibraryArtistNameModal', () => ({
  CreateLibraryArtistNameModal: ({
    open,
    onOpenChange,
    onConfirm,
    pendingArtistNames,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (name: string) => void;
    pendingArtistNames: string[];
  }) => (
    <>
      <span data-testid="pending-artist-names">{pendingArtistNames.join('|')}</span>
      {open ? (
        <div data-testid="create-artist-modal">
          <button type="button" onClick={() => onConfirm('Fresh Artist')}>
            confirm-new-artist-name
          </button>
          <button type="button" onClick={() => onOpenChange(false)}>
            close-artist-modal
          </button>
        </div>
      ) : null}
    </>
  ),
}));

vi.mock('./useEditAlbumTracks', () => ({
  useEditAlbumTracks: vi.fn(() => ({
    prepareTracksSubmit: () => ({ ok: true as const, payload: hoistedMocks.emptyTracksPayload }),
    updateAllTracksGenres: hoistedMocks.updateAllTracksGenresMock,
    updateAllTracksArtists: hoistedMocks.updateAllTracksArtistsMock,
    get pendingArtists() {
      return useEditAlbumTracksState.pendingArtists;
    },
  })),
}));

vi.mock('./useEditAlbumForm', () => ({
  useEditAlbumForm: vi.fn(),
}));

vi.mock('./EditAlbumHero', () => ({
  EditAlbumHero: ({
    onCoverClick,
    onRemoveCover,
    currentCoverUrl,
  }: {
    onCoverClick: () => void;
    onRemoveCover: () => void;
    currentCoverUrl?: string | null;
  }) => (
    <div>
      <button onClick={onCoverClick}>Upload Cover</button>
      <button onClick={onRemoveCover}>Remove Cover</button>
      {currentCoverUrl && <img src={currentCoverUrl} alt="Cover Preview" />}
    </div>
  ),
}));

vi.mock('./EditAlbumMetadata', () => ({
  EditAlbumMetadata: ({
    onGenreSelect,
    onArtistSelect,
    onRemoveArtistId,
  }: {
    onGenreSelect: (value: string) => void;
    onArtistSelect: (value: string) => void;
    onRemoveArtistId: (id: string) => void;
  }) => (
    <div>
      <div>Metadata Fields</div>
      <button
        type="button"
        onClick={() => onGenreSelect('__create_new_genre__')}
        aria-label="test-metadata-create-genre"
      >
        test-metadata-create-genre
      </button>
      <button
        type="button"
        onClick={() => onGenreSelect('__no_genre__')}
        aria-label="test-metadata-clear-genres"
      >
        test-metadata-clear-genres
      </button>
      <button
        type="button"
        onClick={() => onGenreSelect('g-existing')}
        aria-label="test-metadata-toggle-existing"
      >
        test-metadata-toggle-existing
      </button>
      <button
        type="button"
        onClick={() => onArtistSelect('__create_new_artist__')}
        aria-label="test-metadata-create-artist"
      >
        test-metadata-create-artist
      </button>
      <button
        type="button"
        onClick={() => onArtistSelect('__no_artists__')}
        aria-label="test-metadata-clear-artists"
      >
        test-metadata-clear-artists
      </button>
      <button
        type="button"
        onClick={() => onArtistSelect('artist-existing')}
        aria-label="test-metadata-toggle-existing-artist"
      >
        test-metadata-toggle-existing-artist
      </button>
      <button
        type="button"
        onClick={() => onRemoveArtistId('artist-existing')}
        aria-label="test-metadata-remove-artist-chip"
      >
        test-metadata-remove-artist-chip
      </button>
    </div>
  ),
}));

vi.mock('./EditAlbumModals', () => ({
  EditAlbumModals: () => <div>Modals</div>,
}));

vi.mock('./EditAlbumTracksSection', () => ({
  EditAlbumTracksSection: ({
    onRequestCreateGenre,
  }: {
    onRequestCreateGenre: (onCreated: (genreId: string) => void) => void;
  }) => (
    <div data-testid="edit-album-tracks">
      Tracks column
      <button
        type="button"
        aria-label="request-genre-with-callback"
        onClick={() =>
          onRequestCreateGenre((gid) => {
            hoistedMocks.trackGenreCallbackMock(gid);
          })
        }
      >
        request-genre-with-callback
      </button>
    </div>
  ),
}));

describe('EditAlbumForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    album: { ...albumBuilder(), cover: null },
    isLoading: false,
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    resetStableMockForm();
    vi.clearAllMocks();
    createLibraryGenreHoisted.mutateAsync.mockResolvedValue({ data: { id: 'resolved-genre-id' } });
    vi.mocked(useEditAlbumFormMock).mockImplementation(
      ({ album }: { album: ZodAlbum }) =>
        buildDefaultUseEditAlbumFormReturn(album) as unknown as UseEditAlbumFormReturn,
    );
  });

  it('hides the cover file input when _testHideCoverInput is enabled', () => {
    customRender(<EditAlbumForm {...defaultProps} _testHideCoverInput />);
    expect(document.querySelector('input[accept="image/*"]')).toBeNull();
  });

  it('renders correctly', () => {
    customRender(<EditAlbumForm {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Save changes/i })).toBeInTheDocument();
    expect(screen.getByText('Metadata Fields')).toBeInTheDocument();
    expect(screen.getByTestId('edit-album-tracks')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    customRender(<EditAlbumForm {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    customRender(<EditAlbumForm {...defaultProps} isLoading={true} />);
    expect(screen.getByText(/Saving.../i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Saving.../i })).toBeDisabled();
  });

  it('triggers submit on form submission', async () => {
    const user = userEvent.setup();
    const mockForm = createMockTanStackForm();
    vi.mocked(useEditAlbumFormMock).mockReturnValue({
      form: mockForm,
      coverInputRef: { current: null },
      currentCoverUrl: null,
      handleFiles: vi.fn(),
      handleRemoveCover: vi.fn(),
      isFormatModalOpen: false,
      setIsFormatModalOpen: vi.fn(),
      isMultipleFilesModalOpen: false,
      setIsMultipleFilesModalOpen: vi.fn(),
      handleCoverSelect: vi.fn(),
    } as unknown as UseEditAlbumFormReturn);

    customRender(<EditAlbumForm {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /Save changes/i }));
    expect(mockForm.handleSubmit).toHaveBeenCalled();
  });

  it('handles cover selection via hidden input', async () => {
    const user = userEvent.setup();
    const mockHandleCoverSelect = vi.fn();

    vi.mocked(useEditAlbumFormMock).mockReturnValue({
      form: createMockTanStackForm(),
      coverInputRef: { current: null },
      currentCoverUrl: null,
      handleFiles: vi.fn(),
      handleRemoveCover: vi.fn(),
      isFormatModalOpen: false,
      setIsFormatModalOpen: vi.fn(),
      isMultipleFilesModalOpen: false,
      setIsMultipleFilesModalOpen: vi.fn(),
      handleCoverSelect: mockHandleCoverSelect,
    } as unknown as UseEditAlbumFormReturn);

    customRender(<EditAlbumForm {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['image'], 'test.png', { type: 'image/png' });

    await user.upload(fileInput, file);

    expect(mockHandleCoverSelect).toHaveBeenCalledWith(file);
  });

  it('ignores cover selection when file array is empty', async () => {
    const mockHandleCoverSelect = vi.fn();

    vi.mocked(useEditAlbumFormMock).mockReturnValue({
      form: createMockTanStackForm(),
      coverInputRef: { current: null },
      currentCoverUrl: null,
      handleFiles: vi.fn(),
      handleRemoveCover: vi.fn(),
      isFormatModalOpen: false,
      setIsFormatModalOpen: vi.fn(),
      isMultipleFilesModalOpen: false,
      setIsMultipleFilesModalOpen: vi.fn(),
      handleCoverSelect: mockHandleCoverSelect,
    } as unknown as UseEditAlbumFormReturn);

    customRender(<EditAlbumForm {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [] } });

    expect(mockHandleCoverSelect).not.toHaveBeenCalled();
  });

  it('calls coverInputRef.current.click() when onCoverClick is triggered', async () => {
    const user = userEvent.setup();

    vi.mocked(useEditAlbumFormMock).mockReturnValue({
      form: createMockTanStackForm(),
      coverInputRef: { current: { click: vi.fn() } },
      currentCoverUrl: null,
      handleFiles: vi.fn(),
      handleRemoveCover: vi.fn(),
      isFormatModalOpen: false,
      setIsFormatModalOpen: vi.fn(),
      isMultipleFilesModalOpen: false,
      setIsMultipleFilesModalOpen: vi.fn(),
      handleCoverSelect: vi.fn(),
    } as unknown as UseEditAlbumFormReturn);

    customRender(<EditAlbumForm {...defaultProps} />);

    // Get the input to verify click was called on it
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    await user.click(screen.getByText('Upload Cover'));

    expect(clickSpy).toHaveBeenCalled();
  });

  describe('genre flows', () => {
    it('opens create-genre modal when metadata selects create', async () => {
      const user = userEvent.setup();
      customRender(<EditAlbumForm {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: /test-metadata-create-genre/i }));
      expect(screen.getByTestId('create-genre-modal')).toBeInTheDocument();
    });

    it('confirms a new genre from metadata and syncs track genres', async () => {
      const user = userEvent.setup();
      customRender(<EditAlbumForm {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: /test-metadata-create-genre/i }));
      await user.click(screen.getByRole('button', { name: /confirm-new-genre-name/i }));

      expect(genreIdsStateRef.current.length).toBe(1);
      expect(updateAllTracksGenresMock).toHaveBeenCalledWith([], genreIdsStateRef.current);
    });

    it('clears genres when metadata selects none', async () => {
      const user = userEvent.setup();
      genreIdsStateRef.current = ['x'];
      customRender(<EditAlbumForm {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: /test-metadata-clear-genres/i }));
      expect(genreIdsStateRef.current).toEqual([]);
      expect(updateAllTracksGenresMock).toHaveBeenCalledWith(['x'], []);
    });

    it('toggles off an existing genre id', async () => {
      const user = userEvent.setup();
      genreIdsStateRef.current = ['g-existing'];
      customRender(<EditAlbumForm {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: /^test-metadata-toggle-existing$/i }));
      expect(genreIdsStateRef.current).toEqual([]);
      expect(updateAllTracksGenresMock).toHaveBeenCalledWith(['g-existing'], []);
    });

    it('adds a genre id when not previously selected', async () => {
      const user = userEvent.setup();
      genreIdsStateRef.current = [];
      customRender(<EditAlbumForm {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: /^test-metadata-toggle-existing$/i }));
      expect(genreIdsStateRef.current).toEqual(['g-existing']);
      expect(updateAllTracksGenresMock).toHaveBeenCalledWith([], ['g-existing']);
    });

    it('invokes track creation callback when confirming from tracks-request flow', async () => {
      const user = userEvent.setup();
      customRender(<EditAlbumForm {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: /request-genre-with-callback/i }));
      await user.click(screen.getByRole('button', { name: /confirm-new-genre-name/i }));

      expect(trackGenreCallbackMock).toHaveBeenCalledTimes(1);
      expect(String(trackGenreCallbackMock.mock.calls[0]?.[0])).toMatch(/^local:pending:/);
      expect(updateAllTracksGenresMock).not.toHaveBeenCalled();
    });

    it('clears active genre-creation callback when modal closes so metadata confirm uses album path', async () => {
      const user = userEvent.setup();
      customRender(<EditAlbumForm {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /request-genre-with-callback/i }));
      await user.click(screen.getByRole('button', { name: /close-genre-modal/i }));

      updateAllTracksGenresMock.mockClear();
      await user.click(screen.getByRole('button', { name: /test-metadata-create-genre/i }));
      await user.click(screen.getByRole('button', { name: /confirm-new-genre-name/i }));

      expect(trackGenreCallbackMock).not.toHaveBeenCalled();
      expect(updateAllTracksGenresMock).toHaveBeenCalled();
    });

    it('drops pending genre chips when genre ids no longer include pending ids', async () => {
      const user = userEvent.setup();
      const { rerender } = customRender(<EditAlbumForm {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /test-metadata-create-genre/i }));
      await user.click(screen.getByRole('button', { name: /confirm-new-genre-name/i }));

      expect(screen.getByTestId('pending-genre-count')).toHaveTextContent('1');

      await act(async () => {
        getStableMockForm().setFieldValue('genreIds', []);
      });

      vi.mocked(useEditAlbumFormMock).mockReturnValue({
        ...buildDefaultUseEditAlbumFormReturn(defaultProps.album),
        form: cloneFormReference() as unknown as UseEditAlbumFormReturn['form'],
      });

      rerender(<EditAlbumForm {...defaultProps} />);

      expect(screen.getByTestId('pending-genre-count')).toHaveTextContent('0');
    });

    it('handles modal onOpenChange(true) without clearing active callbacks', async () => {
      const user = userEvent.setup();
      customRender(<EditAlbumForm {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: /test-metadata-create-genre/i }));
      await user.click(screen.getByRole('button', { name: /^emit-open-true$/i }));
      expect(screen.getByTestId('create-genre-modal')).toBeInTheDocument();
    });

    it('does not call createLibraryGenre when submit has no pending local genre ids', async () => {
      vi.mocked(useEditAlbumFormMock).mockImplementation(
        (props: Parameters<typeof useEditAlbumFormMock>[0]) => {
          const base = buildDefaultUseEditAlbumFormReturn(props.album);
          return {
            ...base,
            form: {
              ...base.form,
              handleSubmit: vi.fn(async () => {
                await props.onSubmit(
                  {
                    name: props.album.name,
                    description: props.album.description ?? '',
                    type: props.album.type,
                    releaseDate: props.album.releaseDate ?? null,
                    coverId: props.album.coverId ?? undefined,
                    genreIds: ['existing-server-genre'],
                  } as UpdateLibraryAlbumRequest,
                  hoistedMocks.emptyTracksPayload as unknown as EditAlbumTracksSubmitPayload,
                  undefined,
                  false,
                );
              }),
            },
          } as unknown as UseEditAlbumFormReturn;
        },
      );

      const user = userEvent.setup();
      customRender(<EditAlbumForm {...defaultProps} />);

      createLibraryGenreHoisted.mutateAsync.mockClear();
      mockOnSubmit.mockClear();

      await user.click(screen.getByRole('button', { name: /Save changes/i }));

      expect(createLibraryGenreHoisted.mutateAsync).not.toHaveBeenCalled();
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit.mock.calls[0]?.[0]).toMatchObject({
        genreIds: ['existing-server-genre'],
      });
    });

    it('resolves pending genres before calling onSubmit', async () => {
      const uuidSpy = vi
        .spyOn(crypto, 'randomUUID')
        .mockReturnValue('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
      const LOCAL = 'local:pending:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

      vi.mocked(useEditAlbumFormMock).mockImplementation(
        (props: Parameters<typeof useEditAlbumFormMock>[0]) => {
          const base = buildDefaultUseEditAlbumFormReturn(props.album);
          return {
            ...base,
            form: {
              ...base.form,
              handleSubmit: vi.fn(async () => {
                await props.onSubmit(
                  {
                    name: props.album.name,
                    description: props.album.description ?? '',
                    type: props.album.type,
                    releaseDate: props.album.releaseDate ?? null,
                    coverId: props.album.coverId ?? undefined,
                    genreIds: [LOCAL],
                  } as UpdateLibraryAlbumRequest,
                  hoistedMocks.emptyTracksPayload as unknown as EditAlbumTracksSubmitPayload,
                  undefined,
                  false,
                );
              }),
            },
          } as unknown as UseEditAlbumFormReturn;
        },
      );

      const user = userEvent.setup();
      try {
        customRender(<EditAlbumForm {...defaultProps} />);

        await user.click(screen.getByRole('button', { name: /test-metadata-create-genre/i }));
        await user.click(screen.getByRole('button', { name: /confirm-new-genre-name/i }));

        createLibraryGenreHoisted.mutateAsync.mockClear();
        mockOnSubmit.mockClear();

        await user.click(screen.getByRole('button', { name: /Save changes/i }));

        expect(createLibraryGenreHoisted.mutateAsync).toHaveBeenCalledWith({ name: 'Fresh Genre' });
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
        expect(mockOnSubmit.mock.calls[0]?.[0]).toMatchObject({
          genreIds: ['resolved-genre-id'],
        });
        expect(mockOnSubmit.mock.calls[0]?.[4]).toMatchObject({
          pendingGenres: [{ id: LOCAL, name: 'Fresh Genre' }],
        });
      } finally {
        uuidSpy.mockRestore();
      }
    });

    it('uses an empty genres list when the hook returns no items payload', () => {
      vi.mocked(useLibraryGenres).mockReturnValueOnce({
        data: {
          success: true,
          data: {
            items: undefined as unknown as [],
            total: 0,
            page: 1,
            limit: 100,
          },
          error: null,
          meta: { timestamp: '', requestId: '', path: '' },
        },
        isLoading: false,
      } as unknown as ReturnType<typeof useLibraryGenres>);

      customRender(<EditAlbumForm {...defaultProps} />);
      expect(screen.getByText('Metadata Fields')).toBeInTheDocument();
    });
  });

  describe('artist flows', () => {
    it('opens create-artist modal when metadata selects create', async () => {
      const user = userEvent.setup();
      customRender(<EditAlbumForm {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: /test-metadata-create-artist/i }));
      expect(screen.getByTestId('create-artist-modal')).toBeInTheDocument();
    });

    it('confirms a new artist from metadata and syncs track artists', async () => {
      const user = userEvent.setup();
      const uuidSpy = vi
        .spyOn(crypto, 'randomUUID')
        .mockReturnValue('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
      const LOCAL = 'local:pending:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      try {
        customRender(<EditAlbumForm {...defaultProps} />);
        await user.click(screen.getByRole('button', { name: /test-metadata-create-artist/i }));
        await user.click(screen.getByRole('button', { name: /confirm-new-artist-name/i }));

        expect(artistIdsStateRef.current).toEqual([LOCAL]);
        expect(updateAllTracksArtistsMock).toHaveBeenCalledWith([], [LOCAL]);
        expect(screen.getByTestId('pending-artist-names')).toHaveTextContent('Fresh Artist');
      } finally {
        uuidSpy.mockRestore();
      }
    });

    it('clears artists when metadata selects none', async () => {
      const user = userEvent.setup();
      artistIdsStateRef.current = ['artist-x'];
      customRender(<EditAlbumForm {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: /test-metadata-clear-artists/i }));
      expect(artistIdsStateRef.current).toEqual([]);
      expect(updateAllTracksArtistsMock).toHaveBeenCalledWith(['artist-x'], []);
    });

    it('toggles off an existing artist id', async () => {
      const user = userEvent.setup();
      artistIdsStateRef.current = ['artist-existing'];
      customRender(<EditAlbumForm {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: /test-metadata-toggle-existing-artist/i }));
      expect(artistIdsStateRef.current).toEqual([]);
      expect(updateAllTracksArtistsMock).toHaveBeenCalledWith(['artist-existing'], []);
    });

    it('adds an artist id when not previously selected', async () => {
      const user = userEvent.setup();
      artistIdsStateRef.current = [];
      customRender(<EditAlbumForm {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: /test-metadata-toggle-existing-artist/i }));
      expect(artistIdsStateRef.current).toEqual(['artist-existing']);
      expect(updateAllTracksArtistsMock).toHaveBeenCalledWith([], ['artist-existing']);
    });

    it('removes a staged artist via chip handler', async () => {
      const user = userEvent.setup();
      artistIdsStateRef.current = ['artist-existing', 'keep-me'];
      customRender(<EditAlbumForm {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: /test-metadata-remove-artist-chip/i }));
      expect(artistIdsStateRef.current).toEqual(['keep-me']);
      expect(updateAllTracksArtistsMock).toHaveBeenCalledWith(
        ['artist-existing', 'keep-me'],
        ['keep-me'],
      );
    });

    it('drops pending artist names when artist ids no longer include pending ids', async () => {
      const user = userEvent.setup();
      const uuidSpy = vi
        .spyOn(crypto, 'randomUUID')
        .mockReturnValue('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
      try {
        const { rerender } = customRender(<EditAlbumForm {...defaultProps} />);
        await user.click(screen.getByRole('button', { name: /test-metadata-create-artist/i }));
        await user.click(screen.getByRole('button', { name: /confirm-new-artist-name/i }));

        expect(screen.getByTestId('pending-artist-names')).toHaveTextContent('Fresh Artist');

        await act(async () => {
          getStableMockForm().setFieldValue('artistIds', []);
        });

        vi.mocked(useEditAlbumFormMock).mockReturnValue({
          ...buildDefaultUseEditAlbumFormReturn(defaultProps.album),
          form: cloneFormReference() as unknown as UseEditAlbumFormReturn['form'],
        });

        rerender(<EditAlbumForm {...defaultProps} />);

        expect(screen.getByTestId('pending-artist-names')).toHaveTextContent('');
      } finally {
        uuidSpy.mockRestore();
      }
    });

    it('does not call createLibraryArtist when submit has no pending local artist ids', async () => {
      vi.mocked(useEditAlbumFormMock).mockImplementation(
        (props: Parameters<typeof useEditAlbumFormMock>[0]) => {
          const base = buildDefaultUseEditAlbumFormReturn(props.album);
          return {
            ...base,
            form: {
              ...base.form,
              handleSubmit: vi.fn(async () => {
                await props.onSubmit(
                  {
                    name: props.album.name,
                    description: props.album.description ?? '',
                    type: props.album.type,
                    releaseDate: props.album.releaseDate ?? null,
                    coverId: props.album.coverId ?? undefined,
                    genreIds: [],
                    artistIds: ['existing-server-artist'],
                  } as UpdateLibraryAlbumRequest,
                  hoistedMocks.emptyTracksPayload as unknown as EditAlbumTracksSubmitPayload,
                  undefined,
                  false,
                );
              }),
            },
          } as unknown as UseEditAlbumFormReturn;
        },
      );

      const user = userEvent.setup();
      customRender(<EditAlbumForm {...defaultProps} />);

      createLibraryArtistHoisted.mutateAsync.mockClear();
      mockOnSubmit.mockClear();

      await user.click(screen.getByRole('button', { name: /Save changes/i }));

      expect(createLibraryArtistHoisted.mutateAsync).not.toHaveBeenCalled();
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit.mock.calls[0]?.[0]).toMatchObject({
        artistIds: ['existing-server-artist'],
      });
    });

    it('filters visible pending album artists when submit values omit artistIds', async () => {
      const uuidSpy = vi
        .spyOn(crypto, 'randomUUID')
        .mockReturnValue('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

      vi.mocked(useEditAlbumFormMock).mockImplementation(
        (props: Parameters<typeof useEditAlbumFormMock>[0]) => {
          const base = buildDefaultUseEditAlbumFormReturn(props.album);
          return {
            ...base,
            form: {
              ...base.form,
              handleSubmit: vi.fn(async () => {
                await props.onSubmit(
                  {
                    name: props.album.name,
                    description: props.album.description ?? '',
                    type: props.album.type,
                    releaseDate: props.album.releaseDate ?? null,
                    coverId: props.album.coverId ?? undefined,
                    genreIds: [],
                  } as unknown as UpdateLibraryAlbumRequest,
                  hoistedMocks.emptyTracksPayload as unknown as EditAlbumTracksSubmitPayload,
                  undefined,
                  false,
                );
              }),
            },
          } as unknown as UseEditAlbumFormReturn;
        },
      );

      const user = userEvent.setup();
      try {
        customRender(<EditAlbumForm {...defaultProps} />);
        await user.click(screen.getByRole('button', { name: /test-metadata-create-artist/i }));
        await user.click(screen.getByRole('button', { name: /confirm-new-artist-name/i }));

        mockOnSubmit.mockClear();
        await user.click(screen.getByRole('button', { name: /Save changes/i }));

        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      } finally {
        uuidSpy.mockRestore();
      }
    });

    it('resolves pending artists before calling onSubmit', async () => {
      const uuidSpy = vi
        .spyOn(crypto, 'randomUUID')
        .mockReturnValue('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

      vi.mocked(useEditAlbumFormMock).mockImplementation(
        (props: Parameters<typeof useEditAlbumFormMock>[0]) => {
          const base = buildDefaultUseEditAlbumFormReturn(props.album);
          return {
            ...base,
            form: {
              ...base.form,
              handleSubmit: vi.fn(async () => {
                await props.onSubmit(
                  {
                    name: props.album.name,
                    description: props.album.description ?? '',
                    type: props.album.type,
                    releaseDate: props.album.releaseDate ?? null,
                    coverId: props.album.coverId ?? undefined,
                    genreIds: [],
                    artistIds: [...artistIdsStateRef.current],
                  } as UpdateLibraryAlbumRequest,
                  hoistedMocks.emptyTracksPayload as unknown as EditAlbumTracksSubmitPayload,
                  undefined,
                  false,
                );
              }),
            },
          } as unknown as UseEditAlbumFormReturn;
        },
      );

      const user = userEvent.setup();
      try {
        customRender(<EditAlbumForm {...defaultProps} />);
        await user.click(screen.getByRole('button', { name: /test-metadata-create-artist/i }));
        await user.click(screen.getByRole('button', { name: /confirm-new-artist-name/i }));

        createLibraryArtistHoisted.mutateAsync.mockClear();
        mockOnSubmit.mockClear();

        await user.click(screen.getByRole('button', { name: /Save changes/i }));

        expect(createLibraryArtistHoisted.mutateAsync).toHaveBeenCalledWith({ name: 'Fresh Artist' });
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
        expect(mockOnSubmit.mock.calls[0]?.[0]).toMatchObject({
          artistIds: ['resolved-artist-id'],
        });
      } finally {
        uuidSpy.mockRestore();
      }
    });
  });
});
