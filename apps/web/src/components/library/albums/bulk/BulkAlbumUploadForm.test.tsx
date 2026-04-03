import { useBulkAlbumUploadForm } from '@/hooks/forms/useBulkAlbumUploadForm';
import type { BulkTrackItem } from '@/lib/types/library';
import type { LibraryState } from '@/stores/library.store';
import { useLibraryStore } from '@/stores/library.store';
import type { ZodArtist } from '@repo/contracts';
import { AlbumType } from '@repo/db';
import { artistBuilder } from '@repo/testing/builders';
import { customRender } from '@repo/testing/web';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BulkAlbumUploadForm } from './BulkAlbumUploadForm';

type UseBulkAlbumUploadFormReturn = ReturnType<typeof useBulkAlbumUploadForm>;

const mockCreateAlbum = vi.fn();
const mockUploadCover = vi.fn();
const mockBulkCreateTracks = vi.fn();
const mockNavigate = vi.fn();

const mockUseCreateLibraryAlbum = vi.fn();
const mockUseUploadLibraryAlbumCover = vi.fn();
const mockUseBulkCreateLibraryTracks = vi.fn();

vi.mock('@/hooks/api/library-albums/useCreateLibraryAlbum', () => ({
  useCreateLibraryAlbum: () => mockUseCreateLibraryAlbum(),
}));

vi.mock('@/hooks/api/library-albums/useUploadLibraryAlbumCover', () => ({
  useUploadLibraryAlbumCover: () => mockUseUploadLibraryAlbumCover(),
}));

vi.mock('@/hooks/api/library-tracks/useBulkCreateLibraryTracks', () => ({
  useBulkCreateLibraryTracks: () => mockUseBulkCreateLibraryTracks(),
}));

vi.mock('@/hooks/api/library-artists/useLibraryArtists', () => ({
  useLibraryArtists: () => ({ isLoading: false }),
}));

vi.mock('@/stores/library.store', () => {
  const mockArtistData = {
    id: 'artist-1',
    name: 'Test Artist',
  };
  const mockState: LibraryState = {
    libraryId: 'lib-1',
    privateAccountId: null,
    privateArtists: [mockArtistData as ZodArtist],
    privateAlbums: [],
    setLibraryId: vi.fn(),
    setPrivateAccountId: vi.fn(),
    setPrivateArtists: vi.fn(),
    setPrivateAlbums: vi.fn(),
    updatePrivateArtist: vi.fn(),
    updatePrivateAlbum: vi.fn(),
    removePrivateArtist: vi.fn(),
    removePrivateAlbum: vi.fn(),
    clearLibrary: vi.fn(),
  };
  return {
    useLibraryStore: vi.fn((selector?: (s: LibraryState) => unknown) =>
      selector ? selector(mockState) : mockState,
    ),
  };
});

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/hooks/forms/useBulkAlbumUploadForm', () => ({
  useBulkAlbumUploadForm: vi.fn(),
}));

const mockUseBulkAlbumUploadForm = vi.mocked(useBulkAlbumUploadForm);

function createMockLibraryState(overrides: Partial<LibraryState> = {}): LibraryState {
  return {
    libraryId: 'lib-1',
    privateAccountId: null,
    privateArtists: [artistBuilder()],
    privateAlbums: [],
    setLibraryId: vi.fn(),
    setPrivateAccountId: vi.fn(),
    setPrivateArtists: vi.fn(),
    setPrivateAlbums: vi.fn(),
    updatePrivateArtist: vi.fn(),
    updatePrivateAlbum: vi.fn(),
    removePrivateArtist: vi.fn(),
    removePrivateAlbum: vi.fn(),
    clearLibrary: vi.fn(),
    ...overrides,
  } as LibraryState;
}

function createMockTrack(overrides: Partial<BulkTrackItem> = {}): BulkTrackItem {
  return {
    id: 'track-1',
    file: new File(['audio'], 'track1.mp3', { type: 'audio/mpeg' }),
    title: 'Track 1',
    trackNumber: 1,
    diskNumber: 1,
    explicit: false,
    ...overrides,
  };
}

describe('BulkAlbumUploadForm', () => {
  const defaultFormHookReturn: UseBulkAlbumUploadFormReturn = {
    formData: {
      name: 'Test Album',
      description: '',
      type: AlbumType.album,
      artistId: 'artist-1',
      releaseDate: null,
    },
    tracks: [createMockTrack()],
    tracksWithCovers: [],
    selectedCoverTrackId: null,
    setSelectedCoverTrackId: vi.fn(),
    selectedCoverFile: null,
    isScanningMetadata: false,
    isScanningCovers: false,
    fileInputRef: { current: null },
    addFiles: vi.fn(),
    updateTrack: vi.fn(),
    removeTrack: vi.fn(),
    clearAll: vi.fn(),
    updateFormData: vi.fn(),
    isFormValid: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCreateLibraryAlbum.mockReturnValue({
      mutateAsync: mockCreateAlbum,
      isPending: false,
    });
    mockUseUploadLibraryAlbumCover.mockReturnValue({
      mutateAsync: mockUploadCover,
      isPending: false,
    });
    mockUseBulkCreateLibraryTracks.mockReturnValue({
      mutateAsync: mockBulkCreateTracks,
      isPending: false,
    });
    mockUseBulkAlbumUploadForm.mockReturnValue(defaultFormHookReturn);
    vi.mocked(useLibraryStore).mockImplementation((selector?: (s: LibraryState) => unknown) => {
      const state = createMockLibraryState();
      return selector ? selector(state) : state;
    });
  });

  it('renders initial empty state', () => {
    mockUseBulkAlbumUploadForm.mockReturnValue({
      ...defaultFormHookReturn,
      tracks: [],
    });

    customRender(<BulkAlbumUploadForm />);

    expect(
      screen.getByText('Drop audio files anywhere or click to start uploading'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Album details')).not.toBeInTheDocument();
  });

  it('triggers file input click when empty state is clicked', async () => {
    const user = userEvent.setup();
    mockUseBulkAlbumUploadForm.mockReturnValue({
      ...defaultFormHookReturn,
      tracks: [],
    });

    customRender(<BulkAlbumUploadForm />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    const dropzoneArea = screen.getByText(
      'Drop audio files anywhere or click to start uploading',
    ).parentElement;
    await user.click(dropzoneArea!);

    expect(clickSpy).toHaveBeenCalled();
  });

  it('handles file selection via hidden input', async () => {
    const user = userEvent.setup();
    const mockAddFiles = vi.fn();

    // We need a ref object so we can assert on its value getter/setter if we want, but basically just need the mockAddFiles.
    mockUseBulkAlbumUploadForm.mockReturnValue({
      ...defaultFormHookReturn,
      tracks: [],
      addFiles: mockAddFiles,
      fileInputRef: { current: null },
    });

    customRender(<BulkAlbumUploadForm />);

    // Since we can't easily query a hidden input that has no label or label nesting,
    // we'll find it by test ID or by type="file" inside the document.
    // Given the component structure, it is a file input.
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const file = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });

    // UserEvent approach to file upload
    await user.upload(fileInput, file);

    expect(mockAddFiles).toHaveBeenCalled();
    // Verify file input value is cleared
    expect(fileInput.value).toBe('');
  });

  it('renders tracks section when tracks exist', () => {
    customRender(<BulkAlbumUploadForm />);

    expect(screen.getByText('Album details')).toBeInTheDocument();
    expect(screen.getByText('1 track ready')).toBeInTheDocument();
  });

  it('shows processing overlay when scanning metadata', () => {
    mockUseBulkAlbumUploadForm.mockReturnValue({
      ...defaultFormHookReturn,
      isScanningMetadata: true,
      isScanningCovers: false,
    });

    customRender(<BulkAlbumUploadForm />);

    expect(screen.getByText('Scanning metadata...')).toBeInTheDocument();
  });

  it('shows processing overlay when scanning covers', () => {
    mockUseBulkAlbumUploadForm.mockReturnValue({
      ...defaultFormHookReturn,
      isScanningMetadata: false,
      isScanningCovers: true,
    });

    customRender(<BulkAlbumUploadForm />);

    expect(screen.getByText('Scanning tracks for cover art...')).toBeInTheDocument();
  });

  it('shows combined processing message when scanning both', () => {
    mockUseBulkAlbumUploadForm.mockReturnValue({
      ...defaultFormHookReturn,
      isScanningMetadata: true,
      isScanningCovers: true,
    });

    customRender(<BulkAlbumUploadForm />);

    expect(screen.getByText('Scanning metadata and cover art...')).toBeInTheDocument();
  });

  it('shows "Creating album..." when creating album', () => {
    mockUseCreateLibraryAlbum.mockReturnValue({
      mutateAsync: mockCreateAlbum,
      isPending: true,
    });

    customRender(<BulkAlbumUploadForm />);

    expect(screen.getByText('Creating album...')).toBeInTheDocument();
  });

  it('shows "Uploading cover..." when uploading cover', () => {
    mockUseUploadLibraryAlbumCover.mockReturnValue({
      mutateAsync: mockUploadCover,
      isPending: true,
    });

    customRender(<BulkAlbumUploadForm />);

    expect(screen.getByText('Uploading cover...')).toBeInTheDocument();
  });

  it('shows "Uploading 1 track..." when uploading single track', () => {
    mockUseBulkCreateLibraryTracks.mockReturnValue({
      mutateAsync: mockBulkCreateTracks,
      isPending: true,
    });

    customRender(<BulkAlbumUploadForm />);

    expect(screen.getByText('Uploading 1 track...')).toBeInTheDocument();
  });

  it('shows "Uploading 2 tracks..." when uploading multiple tracks', () => {
    mockUseBulkAlbumUploadForm.mockReturnValue({
      ...defaultFormHookReturn,
      tracks: [createMockTrack(), createMockTrack({ id: 'track-2' })],
    });
    mockUseBulkCreateLibraryTracks.mockReturnValue({
      mutateAsync: mockBulkCreateTracks,
      isPending: true,
    });

    customRender(<BulkAlbumUploadForm />);

    expect(screen.getByText('Uploading 2 tracks...')).toBeInTheDocument();
  });

  it('submits successfully and navigates', async () => {
    const user = userEvent.setup();
    mockCreateAlbum.mockResolvedValue({ data: { id: 'album-123' } });
    mockBulkCreateTracks.mockResolvedValue({});

    customRender(<BulkAlbumUploadForm />);

    const submitButton = screen.getByRole('button', { name: /Create album & upload 1 track/i });
    await user.click(submitButton);

    expect(mockCreateAlbum).toHaveBeenCalledWith({
      name: 'Test Album',
      description: '',
      type: AlbumType.album,
      artistId: 'artist-1',
      releaseDate: null,
    });
    expect(mockBulkCreateTracks).toHaveBeenCalledWith({
      album: { id: 'album-123' },
      tracks: [createMockTrack()],
      artistIds: ['artist-1'],
    });
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/library/albums/$id',
      params: { id: 'album-123' },
    });
  });

  it('calls uploadCover when selectedCoverFile exists', async () => {
    const user = userEvent.setup();
    const coverFile = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' });
    mockUseBulkAlbumUploadForm.mockReturnValue({
      ...defaultFormHookReturn,
      selectedCoverFile: coverFile,
    });
    mockCreateAlbum.mockResolvedValue({ data: { id: 'album-123' } });
    mockUploadCover.mockResolvedValue({});
    mockBulkCreateTracks.mockResolvedValue({});

    customRender(<BulkAlbumUploadForm />);

    await user.click(screen.getByRole('button', { name: /Create album & upload 1 track/i }));

    expect(mockUploadCover).toHaveBeenCalledWith({ id: 'album-123', file: coverFile });
  });

  it('does not call uploadCover when selectedCoverFile is null', async () => {
    const user = userEvent.setup();
    mockCreateAlbum.mockResolvedValue({ data: { id: 'album-123' } });
    mockBulkCreateTracks.mockResolvedValue({});

    customRender(<BulkAlbumUploadForm />);

    await user.click(screen.getByRole('button', { name: /Create album & upload 1 track/i }));

    expect(mockUploadCover).not.toHaveBeenCalled();
  });

  it('handles submit error and shows error message', async () => {
    const user = userEvent.setup();
    mockCreateAlbum.mockRejectedValue(new Error('Network error'));

    customRender(<BulkAlbumUploadForm />);

    await user.click(screen.getByRole('button', { name: /Create album & upload 1 track/i }));

    expect(toast.error).toHaveBeenCalledWith('Network error');
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('handles non-Error throw and uses default message', async () => {
    const user = userEvent.setup();
    mockCreateAlbum.mockRejectedValue('string error');

    customRender(<BulkAlbumUploadForm />);

    await user.click(screen.getByRole('button', { name: /Create album & upload 1 track/i }));

    expect(toast.error).toHaveBeenCalledWith('Failed to create album');
    expect(screen.getByText('Failed to create album')).toBeInTheDocument();
  });

  it('handles createAlbum returning no data', async () => {
    const user = userEvent.setup();
    mockCreateAlbum.mockResolvedValue({ data: null });

    customRender(<BulkAlbumUploadForm />);

    await user.click(screen.getByRole('button', { name: /Create album & upload 1 track/i }));

    expect(toast.error).toHaveBeenCalledWith('Failed to create album');
  });

  it('does not submit when form is invalid', () => {
    mockUseBulkAlbumUploadForm.mockReturnValue({
      ...defaultFormHookReturn,
      isFormValid: false,
    });

    customRender(<BulkAlbumUploadForm />);

    const submitButton = screen.getByRole('button', { name: /Create album & upload 1 track/i });
    expect(submitButton).toBeDisabled();

    const form = screen
      .getByRole('button', { name: /Create album & upload 1 track/i })
      .closest('form');
    fireEvent.submit(form!);

    expect(mockCreateAlbum).not.toHaveBeenCalled();
  });

  it('does not submit when libraryId is missing', async () => {
    const user = userEvent.setup();
    vi.mocked(useLibraryStore).mockImplementation((selector?: (s: LibraryState) => unknown) => {
      const state = createMockLibraryState({ libraryId: '', privateArtists: [] });
      return selector ? selector(state) : state;
    });

    customRender(<BulkAlbumUploadForm />);

    await user.click(screen.getByRole('button', { name: /Create album & upload 1 track/i }));

    expect(mockCreateAlbum).not.toHaveBeenCalled();
  });

  it('shows CoverSelectionBanner when tracks have covers and not scanning', () => {
    mockUseBulkAlbumUploadForm.mockReturnValue({
      ...defaultFormHookReturn,
      tracksWithCovers: [
        {
          trackId: 'track-1',
          trackName: 'track1.mp3',
          coverFile: new File(['x'], 'cover.jpg', { type: 'image/jpeg' }),
          previewUrl: 'blob:url',
        },
      ],
      isScanningCovers: false,
    });

    customRender(<BulkAlbumUploadForm />);

    expect(screen.getByText('Cover art detected')).toBeInTheDocument();
  });

  it('does not show CoverSelectionBanner when scanning covers', () => {
    mockUseBulkAlbumUploadForm.mockReturnValue({
      ...defaultFormHookReturn,
      tracksWithCovers: [
        {
          trackId: 'track-1',
          trackName: 'track1.mp3',
          coverFile: new File(['x'], 'cover.jpg', { type: 'image/jpeg' }),
          previewUrl: 'blob:url',
        },
      ],
      isScanningCovers: true,
    });

    customRender(<BulkAlbumUploadForm />);

    expect(screen.queryByText('Cover art detected')).not.toBeInTheDocument();
  });

  it('submits with correct track count in success flow', async () => {
    const user = userEvent.setup();
    mockCreateAlbum.mockResolvedValue({ data: { id: 'album-123' } });
    mockBulkCreateTracks.mockResolvedValue({});

    customRender(<BulkAlbumUploadForm />);

    await user.click(screen.getByRole('button', { name: /Create album & upload 1 track/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    expect(mockBulkCreateTracks).toHaveBeenCalledWith(
      expect.objectContaining({
        tracks: expect.arrayContaining([expect.objectContaining({ id: 'track-1' })]),
      }),
    );
  });

  it('submits multiple tracks successfully', async () => {
    const user = userEvent.setup();
    mockUseBulkAlbumUploadForm.mockReturnValue({
      ...defaultFormHookReturn,
      tracks: [createMockTrack(), createMockTrack({ id: 'track-2' })],
    });
    mockCreateAlbum.mockResolvedValue({ data: { id: 'album-123' } });
    mockBulkCreateTracks.mockResolvedValue({});

    customRender(<BulkAlbumUploadForm />);

    await user.click(screen.getByRole('button', { name: /Create album & upload 2 tracks/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    expect(mockBulkCreateTracks).toHaveBeenCalledWith(
      expect.objectContaining({
        tracks: expect.arrayContaining([
          expect.objectContaining({ id: 'track-1' }),
          expect.objectContaining({ id: 'track-2' }),
        ]),
      }),
    );
  });
});
