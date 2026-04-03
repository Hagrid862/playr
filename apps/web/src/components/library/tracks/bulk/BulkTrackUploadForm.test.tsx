import type { BulkTrackItem } from '@/lib/types/library';
import { albumBuilder, trackBuilder } from '@repo/testing/builders';
import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

const mockAlbum = albumBuilder();
const mockTrack = trackBuilder();

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
    customRender(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />);

    expect(screen.getByText('Drop audio files anywhere to start uploading')).toBeInTheDocument();
  });

  it('shows singular track label when one track', () => {
    mockUseBulkTrackUpload.mockReturnValue({
      ...defaultHookReturn,
      tracks: [{ ...mockTrack, file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }) }],
    });

    customRender(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />);

    expect(screen.getByText('1 track ready')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload 1 track/i })).toBeInTheDocument();
  });

  it('shows plural tracks label when multiple tracks', () => {
    mockUseBulkTrackUpload.mockReturnValue({
      ...defaultHookReturn,
      tracks: [
        {
          ...trackBuilder(),
          file: new File(['a'], 'track2.mp3', { type: 'audio/mpeg' }),
        },
        {
          ...trackBuilder(),
          file: new File(['b'], 'track3.mp3', { type: 'audio/mpeg' }),
        },
      ],
    });

    customRender(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />);

    expect(screen.getByText('2 tracks ready')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload 2 tracks/i })).toBeInTheDocument();
  });

  it('calls addFiles when files are dropped on window', () => {
    customRender(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />);

    const file = new File(['audio'], 'track.mp3', { type: 'audio/mpeg' });
    const fileList = Object.assign([file], {
      length: 1,
      item: () => file,
    }) as FileList;

    fireEvent.drop(window, { dataTransfer: { files: fileList } });

    expect(mockAddFiles).toHaveBeenCalledWith(fileList);
  });

  it('shows scanning overlay when isScanningCovers', () => {
    mockUseBulkTrackUpload.mockReturnValue({
      ...defaultHookReturn,
      tracks: [{ ...mockTrack, file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }) }],
      isScanningCovers: true,
    });

    customRender(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />);

    expect(screen.getByText('Scanning tracks for cover art...')).toBeInTheDocument();
  });

  it('shows CoverSelectionBanner when tracks have covers and not scanning', () => {
    mockUseBulkTrackUpload.mockReturnValue({
      ...defaultHookReturn,
      tracks: [{ ...mockTrack, file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }) }],
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

    customRender(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />);

    expect(screen.getByText('CoverSelectionBanner')).toBeInTheDocument();
  });

  it('calls clearAll when Clear all is clicked', async () => {
    const user = userEvent.setup();
    mockUseBulkTrackUpload.mockReturnValue({
      ...defaultHookReturn,
      tracks: [{ ...mockTrack, file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }) }],
    });

    customRender(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Clear all' }));

    expect(mockClearAll).toHaveBeenCalled();
  });

  it('calls updateTrack when BulkTrackCard onUpdate is triggered', async () => {
    const user = userEvent.setup();
    mockUseBulkTrackUpload.mockReturnValue({
      ...defaultHookReturn,
      tracks: [{ ...mockTrack, file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }) }],
    });

    customRender(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Update' }));

    expect(mockUpdateTrack).toHaveBeenCalledWith(mockTrack.id, { title: 'Updated' });
  });

  it('calls removeTrack when BulkTrackCard onRemove is triggered', async () => {
    const user = userEvent.setup();
    mockUseBulkTrackUpload.mockReturnValue({
      ...defaultHookReturn,
      tracks: [{ ...mockTrack, file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }) }],
    });

    customRender(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(mockRemoveTrack).toHaveBeenCalledWith(mockTrack.id);
  });

  it('disables submit when hasInvalidTracks', () => {
    mockUseBulkTrackUpload.mockReturnValue({
      ...defaultHookReturn,
      tracks: [
        {
          ...mockTrack,
          file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }),
          title: '',
          trackNumber: 0,
          diskNumber: 0,
        },
      ],
    });

    customRender(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />);

    expect(screen.getByRole('button', { name: /Upload 1 track/i })).toBeDisabled();
  });

  it('disables submit when isLoading', () => {
    mockUseBulkTrackUpload.mockReturnValue({
      ...defaultHookReturn,
      tracks: [{ ...mockTrack, file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }) }],
    });

    customRender(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} isLoading />);

    expect(screen.getByRole('button', { name: /Uploading/i })).toBeDisabled();
  });

  it('submits form and calls handleSubmit', async () => {
    const user = userEvent.setup();
    mockUseBulkTrackUpload.mockReturnValue({
      ...defaultHookReturn,
      tracks: [{ ...mockTrack, file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }) }],
    });

    customRender(<BulkTrackUploadForm album={mockAlbum} onSubmit={mockOnSubmit} />);

    await user.click(screen.getByRole('button', { name: /Upload 1 track/i }));

    expect(mockHandleSubmit).toHaveBeenCalled();
  });
});
