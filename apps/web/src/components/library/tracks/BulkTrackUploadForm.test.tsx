import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ZodAlbumInfer, ZodArtist } from '@repo/contracts';
import type { BulkTrackItem } from '@/lib/types/library';
import { BulkTrackUploadForm } from './BulkTrackUploadForm';
import { useBulkTrackUpload } from './useBulkTrackUpload';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('./useBulkTrackUpload', () => ({
  useBulkTrackUpload: vi.fn(),
}));

vi.mock('./BulkTrackCard', () => ({
  BulkTrackCard: ({
    track,
    onUpdate,
    onRemove,
  }: {
    track: BulkTrackItem;
    onUpdate: (u: Partial<BulkTrackItem>) => void;
    onRemove: () => void;
  }) => (
    <div data-testid={`track-card-${track.id}`}>
      <span>{track.file.name}</span>
      <button type="button" onClick={() => onUpdate({ title: 'Updated' })}>
        Update
      </button>
      <button type="button" onClick={onRemove}>
        Remove
      </button>
    </div>
  ),
}));

vi.mock('./CoverSelectionBanner', () => ({
  CoverSelectionBanner: () => <div>CoverSelectionBanner</div>,
}));

const mockUseBulkTrackUpload = vi.mocked(useBulkTrackUpload);

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

const mockArtist: ZodArtist = {
  id: 'a1',
  name: 'Artist',
  description: null,
  isCommunity: false,
  verified: false,
  bannerId: null,
  avatarId: null,
  visibility: 'public',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
} as ZodArtist;

const mockAlbum: ZodAlbumInfer = {
  id: 'album-123',
  name: 'Test Album',
  description: '',
  type: 'album',
  visibility: 'private',
  totalTracks: 0,
  totalDuration: 0,
  releaseDate: null,
  coverId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  artists: [mockArtist],
  tracks: [],
  genres: [],
  cover: null,
};

describe('BulkTrackUploadForm', () => {
  const mockOnSubmit = vi.fn();
  const mockAddFiles = vi.fn();
  const mockUpdateTrack = vi.fn();
  const mockRemoveTrack = vi.fn();
  const mockClearAll = vi.fn();
  const mockHandleSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
  const fileInputRef = { current: null as HTMLInputElement | null };

  const defaultHookReturn = {
    tracks: [] as BulkTrackItem[],
    isScanningCovers: false,
    tracksWithCovers: [],
    selectedCoverTrackId: null as string | null,
    setSelectedCoverTrackId: vi.fn(),
    fileInputRef,
    addFiles: mockAddFiles,
    updateTrack: mockUpdateTrack,
    removeTrack: mockRemoveTrack,
    clearAll: mockClearAll,
    handleSubmit: mockHandleSubmit,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBulkTrackUpload.mockReturnValue({ ...defaultHookReturn });
  });

  it('renders empty state when no tracks', () => {
    render(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />);

    expect(screen.getByText('Drop audio files here or click to select')).toBeInTheDocument();
    expect(screen.getByText('Supports MP3, WAV, FLAC, AAC, and other audio formats')).toBeInTheDocument();
  });

  it('renders add-more state when tracks exist', () => {
    mockUseBulkTrackUpload.mockReturnValue({
      ...defaultHookReturn,
      tracks: [createMockTrack()],
    });

    render(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />);

    expect(screen.getByText('Drop more files or click to add')).toBeInTheDocument();
  });

  it('shows singular track label when one track', () => {
    mockUseBulkTrackUpload.mockReturnValue({
      ...defaultHookReturn,
      tracks: [createMockTrack()],
    });

    render(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />);

    expect(screen.getByText('1 track ready')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload 1 track/i })).toBeInTheDocument();
  });

  it('shows plural tracks label when multiple tracks', () => {
    mockUseBulkTrackUpload.mockReturnValue({
      ...defaultHookReturn,
      tracks: [
        createMockTrack({ id: 'track-1' }),
        createMockTrack({ id: 'track-2', file: new File(['a'], 'track2.mp3', { type: 'audio/mpeg' }) }),
      ],
    });

    render(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />);

    expect(screen.getByText('2 tracks ready')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload 2 tracks/i })).toBeInTheDocument();
  });

  it('applies dragging styles on dragOver', () => {
    const { container } = render(
      <BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />,
    );

    const dropzone = container.querySelector('form')?.firstElementChild as HTMLElement;
    fireEvent.dragOver(dropzone, { dataTransfer: {} });

    expect(dropzone.className).toContain('border-primary');
  });

  it('clears dragging state on drop', () => {
    const { container } = render(
      <BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />,
    );

    const dropzone = container.querySelector('form')?.firstElementChild as HTMLElement;
    fireEvent.dragOver(dropzone, { dataTransfer: {} });
    fireEvent.drop(dropzone, { dataTransfer: { files: [] } });

    expect(dropzone.className).not.toContain('border-primary');
  });

  it('calls addFiles when files are dropped', () => {
    const { container } = render(
      <BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />,
    );

    const file = new File(['audio'], 'track.mp3', { type: 'audio/mpeg' });
    const fileList = Object.assign([file], { length: 1, item: (_i: number) => file }) as FileList;
    const dropzone = container.querySelector('form')?.firstElementChild as HTMLElement;

    fireEvent.drop(dropzone, { dataTransfer: { files: fileList } });

    expect(mockAddFiles).toHaveBeenCalledWith(fileList);
  });

  it('calls addFiles with null when dataTransfer has no files', () => {
    const { container } = render(
      <BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />,
    );

    const dropzone = container.querySelector('form')?.firstElementChild as HTMLElement;
    fireEvent.drop(dropzone, { dataTransfer: { files: undefined } });

    expect(mockAddFiles).toHaveBeenCalledWith(null);
  });

  it('keeps dragging state on dragLeave when relatedTarget is inside', () => {
    const { container } = render(
      <BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />,
    );

    const dropzone = container.querySelector('form')?.firstElementChild as HTMLElement;
    const innerContent = screen.getByText('Drop audio files here or click to select').closest('div') as HTMLElement;
    fireEvent.dragOver(dropzone, { dataTransfer: {} });

    const dragLeaveEvent = new Event('dragleave', { bubbles: true });
    Object.defineProperty(dragLeaveEvent, 'relatedTarget', {
      value: innerContent,
      configurable: true,
    });
    dropzone.dispatchEvent(dragLeaveEvent);

    expect(dropzone.className).toContain('border-primary');
  });

  it('clears dragging state on dragLeave when relatedTarget is outside', () => {
    const { container } = render(
      <BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />,
    );

    const dropzone = container.querySelector('form')?.firstElementChild as HTMLElement;
    fireEvent.dragOver(dropzone, { dataTransfer: {} });
    expect(dropzone.className).toContain('border-primary');

    fireEvent.dragLeave(dropzone, {
      relatedTarget: document.body,
      currentTarget: dropzone,
    });
    expect(dropzone.className).not.toContain('border-primary');
  });

  it('calls addFiles when file input changes', async () => {
    const user = userEvent.setup();
    render(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['audio'], 'track.mp3', { type: 'audio/mpeg' });
    await user.upload(fileInput, file);

    expect(mockAddFiles).toHaveBeenCalledWith(
      expect.objectContaining({ 0: file, length: 1 }),
    );
    expect(fileInput.value).toBe('');
  });

  it('shows scanning overlay when isScanningCovers', () => {
    mockUseBulkTrackUpload.mockReturnValue({
      ...defaultHookReturn,
      tracks: [createMockTrack()],
      isScanningCovers: true,
    });

    render(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />);

    expect(screen.getByText('Scanning tracks for cover art...')).toBeInTheDocument();
  });

  it('shows CoverSelectionBanner when tracks have covers and not scanning', () => {
    mockUseBulkTrackUpload.mockReturnValue({
      ...defaultHookReturn,
      tracks: [createMockTrack()],
      isScanningCovers: false,
      tracksWithCovers: [
        {
          trackId: 'track-1',
          trackName: 'track1.mp3',
          coverFile: new File(['x'], 'cover.jpg', { type: 'image/jpeg' }),
          previewUrl: 'blob:url',
        },
      ],
    });

    render(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />);

    expect(screen.getByText('CoverSelectionBanner')).toBeInTheDocument();
  });

  it('calls clearAll when Clear all is clicked', async () => {
    const user = userEvent.setup();
    mockUseBulkTrackUpload.mockReturnValue({
      ...defaultHookReturn,
      tracks: [createMockTrack()],
    });

    render(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Clear all' }));

    expect(mockClearAll).toHaveBeenCalled();
  });

  it('calls updateTrack when BulkTrackCard onUpdate is triggered', async () => {
    const user = userEvent.setup();
    mockUseBulkTrackUpload.mockReturnValue({
      ...defaultHookReturn,
      tracks: [createMockTrack()],
    });

    render(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Update' }));

    expect(mockUpdateTrack).toHaveBeenCalledWith('track-1', { title: 'Updated' });
  });

  it('calls removeTrack when BulkTrackCard onRemove is triggered', async () => {
    const user = userEvent.setup();
    mockUseBulkTrackUpload.mockReturnValue({
      ...defaultHookReturn,
      tracks: [createMockTrack()],
    });

    render(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(mockRemoveTrack).toHaveBeenCalledWith('track-1');
  });

  it('triggers file input click when dropzone is clicked', () => {
    const { container } = render(
      <BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />,
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    const dropzone = container.querySelector('form')?.firstElementChild as HTMLElement;
    fireEvent.click(dropzone);

    expect(clickSpy).toHaveBeenCalled();
  });

  it('disables submit when hasInvalidTracks', () => {
    mockUseBulkTrackUpload.mockReturnValue({
      ...defaultHookReturn,
      tracks: [createMockTrack({ title: '', trackNumber: 0, diskNumber: 0 })],
    });

    render(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />);

    expect(screen.getByRole('button', { name: /Upload 1 track/i })).toBeDisabled();
  });

  it('disables submit when isLoading', () => {
    mockUseBulkTrackUpload.mockReturnValue({
      ...defaultHookReturn,
      tracks: [createMockTrack()],
    });

    render(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} isLoading />);

    expect(screen.getByRole('button', { name: /Uploading/i })).toBeDisabled();
  });

  it('submits form and calls handleSubmit', async () => {
    const user = userEvent.setup();
    mockUseBulkTrackUpload.mockReturnValue({
      ...defaultHookReturn,
      tracks: [createMockTrack()],
    });

    render(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />);

    await user.click(screen.getByRole('button', { name: /Upload 1 track/i }));

    expect(mockHandleSubmit).toHaveBeenCalled();
  });
});
