import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AlbumType } from '@repo/db';
import { useBulkAlbumUploadForm } from '@/hooks/forms/useBulkAlbumUploadForm';
import { useLibraryStore } from '@/stores/library.store';
import { BulkAlbumUploadForm } from './BulkAlbumUploadForm';

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
  const state = {
    libraryId: 'lib-1',
    privateArtists: [{ id: 'artist-1', name: 'Test Artist' }],
  };
  return {
    useLibraryStore: vi.fn((selector?: (s: typeof state) => unknown) =>
      selector ? selector(state) : state,
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

import { toast } from 'sonner';

vi.mock('@/hooks/forms/useBulkAlbumUploadForm', () => ({
  useBulkAlbumUploadForm: vi.fn(),
}));

const mockUseBulkAlbumUploadForm = vi.mocked(useBulkAlbumUploadForm);

function createMockTrack(overrides: Record<string, unknown> = {}) {
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
  const defaultFormHookReturn = {
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
    vi.mocked(useLibraryStore).mockImplementation((selector?: (s: { libraryId: string; privateArtists: { id: string; name: string }[] }) => unknown) => {
      const state = { libraryId: 'lib-1', privateArtists: [{ id: 'artist-1', name: 'Test Artist' }] };
      return selector ? selector(state) : state;
    });
  });

  it('renders initial empty state', () => {
    mockUseBulkAlbumUploadForm.mockReturnValue({
      ...defaultFormHookReturn,
      tracks: [],
    });

    render(<BulkAlbumUploadForm />);

    expect(screen.getByText('Drop audio files here or click to select')).toBeInTheDocument();
    expect(screen.queryByText('Album details')).not.toBeInTheDocument();
  });

  it('renders tracks section when tracks exist', () => {
    render(<BulkAlbumUploadForm />);

    expect(screen.getByText('Album details')).toBeInTheDocument();
    expect(screen.getByText('1 track ready')).toBeInTheDocument();
  });

  it('shows processing overlay when scanning metadata', () => {
    mockUseBulkAlbumUploadForm.mockReturnValue({
      ...defaultFormHookReturn,
      isScanningMetadata: true,
      isScanningCovers: false,
    });

    render(<BulkAlbumUploadForm />);

    expect(screen.getByText('Scanning metadata...')).toBeInTheDocument();
  });

  it('shows processing overlay when scanning covers', () => {
    mockUseBulkAlbumUploadForm.mockReturnValue({
      ...defaultFormHookReturn,
      isScanningMetadata: false,
      isScanningCovers: true,
    });

    render(<BulkAlbumUploadForm />);

    expect(screen.getByText('Scanning tracks for cover art...')).toBeInTheDocument();
  });

  it('shows combined processing message when scanning both', () => {
    mockUseBulkAlbumUploadForm.mockReturnValue({
      ...defaultFormHookReturn,
      isScanningMetadata: true,
      isScanningCovers: true,
    });

    render(<BulkAlbumUploadForm />);

    expect(screen.getByText('Scanning metadata and cover art...')).toBeInTheDocument();
  });

  it('shows "Creating album..." when creating album', () => {
    mockUseCreateLibraryAlbum.mockReturnValue({
      mutateAsync: mockCreateAlbum,
      isPending: true,
    });

    render(<BulkAlbumUploadForm />);

    expect(screen.getByText('Creating album...')).toBeInTheDocument();
  });

  it('shows "Uploading cover..." when uploading cover', () => {
    mockUseUploadLibraryAlbumCover.mockReturnValue({
      mutateAsync: mockUploadCover,
      isPending: true,
    });

    render(<BulkAlbumUploadForm />);

    expect(screen.getByText('Uploading cover...')).toBeInTheDocument();
  });

  it('shows "Uploading 1 track..." when uploading single track', () => {
    mockUseBulkCreateLibraryTracks.mockReturnValue({
      mutateAsync: mockBulkCreateTracks,
      isPending: true,
    });

    render(<BulkAlbumUploadForm />);

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

    render(<BulkAlbumUploadForm />);

    expect(screen.getByText('Uploading 2 tracks...')).toBeInTheDocument();
  });

  it('submits successfully and navigates', async () => {
    const user = userEvent.setup();
    mockCreateAlbum.mockResolvedValue({ data: { id: 'album-123' } });
    mockBulkCreateTracks.mockResolvedValue({});

    render(<BulkAlbumUploadForm />);

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

    render(<BulkAlbumUploadForm />);

    await user.click(screen.getByRole('button', { name: /Create album & upload 1 track/i }));

    expect(mockUploadCover).toHaveBeenCalledWith({ id: 'album-123', file: coverFile });
  });

  it('does not call uploadCover when selectedCoverFile is null', async () => {
    const user = userEvent.setup();
    mockCreateAlbum.mockResolvedValue({ data: { id: 'album-123' } });
    mockBulkCreateTracks.mockResolvedValue({});

    render(<BulkAlbumUploadForm />);

    await user.click(screen.getByRole('button', { name: /Create album & upload 1 track/i }));

    expect(mockUploadCover).not.toHaveBeenCalled();
  });

  it('handles submit error and shows error message', async () => {
    const user = userEvent.setup();
    mockCreateAlbum.mockRejectedValue(new Error('Network error'));

    render(<BulkAlbumUploadForm />);

    await user.click(screen.getByRole('button', { name: /Create album & upload 1 track/i }));

    expect(toast.error).toHaveBeenCalledWith('Network error');
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('handles non-Error throw and uses default message', async () => {
    const user = userEvent.setup();
    mockCreateAlbum.mockRejectedValue('string error');

    render(<BulkAlbumUploadForm />);

    await user.click(screen.getByRole('button', { name: /Create album & upload 1 track/i }));

    expect(toast.error).toHaveBeenCalledWith('Failed to create album');
    expect(screen.getByText('Failed to create album')).toBeInTheDocument();
  });

  it('handles createAlbum returning no data', async () => {
    const user = userEvent.setup();
    mockCreateAlbum.mockResolvedValue({ data: null });

    render(<BulkAlbumUploadForm />);

    await user.click(screen.getByRole('button', { name: /Create album & upload 1 track/i }));

    expect(toast.error).toHaveBeenCalledWith('Failed to create album');
  });

  it('does not submit when form is invalid', () => {
    mockUseBulkAlbumUploadForm.mockReturnValue({
      ...defaultFormHookReturn,
      isFormValid: false,
    });

    render(<BulkAlbumUploadForm />);

    const submitButton = screen.getByRole('button', { name: /Create album & upload 1 track/i });
    expect(submitButton).toBeDisabled();

    const form = screen.getByRole('button', { name: /Create album & upload 1 track/i }).closest('form');
    fireEvent.submit(form!);

    expect(mockCreateAlbum).not.toHaveBeenCalled();
  });

  it('does not submit when libraryId is missing', async () => {
    const user = userEvent.setup();
    const { useLibraryStore } = await import('@/stores/library.store');
    const stateWithNoLibrary = {
      libraryId: '',
      privateArtists: [] as { id: string; name: string }[],
    };
    vi.mocked(useLibraryStore).mockImplementation((selector?: (s: typeof stateWithNoLibrary) => unknown) =>
      selector ? selector(stateWithNoLibrary) : stateWithNoLibrary,
    );

    render(<BulkAlbumUploadForm />);

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

    render(<BulkAlbumUploadForm />);

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

    render(<BulkAlbumUploadForm />);

    expect(screen.queryByText('Cover art detected')).not.toBeInTheDocument();
  });

  it('submits with correct track count in success flow', async () => {
    const user = userEvent.setup();
    mockCreateAlbum.mockResolvedValue({ data: { id: 'album-123' } });
    mockBulkCreateTracks.mockResolvedValue({});

    render(<BulkAlbumUploadForm />);

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

    render(<BulkAlbumUploadForm />);

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
