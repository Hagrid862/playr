import { useForm } from '@tanstack/react-form';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateTrackFormFields } from './CreateTrackFormFields';
import type { TrackFormValues } from './useCreateTrackForm';

vi.mock('./SingleTrackCoverUpdateBanner', () => ({
  SingleTrackCoverUpdateBanner: () => <div>SingleTrackCoverUpdateBanner</div>,
}));

function CreateTrackFormFieldsWrapper({
  serverErrors,
  isScanningMetadata,
  trackCoverFile,
  trackCoverPreviewUrl,
  useTrackCoverAsAlbumCover,
  onSelectTrackCover,
  onAudioFileChange,
}: {
  serverErrors?: Record<string, string>;
  isScanningMetadata: boolean;
  trackCoverFile: File | null;
  trackCoverPreviewUrl: string | null;
  useTrackCoverAsAlbumCover: boolean;
  onSelectTrackCover: (use: boolean) => void;
  onAudioFileChange: (file: File | null) => void;
}) {
  const form = useForm({
    defaultValues: {
      title: '',
      trackNumber: 1,
      diskNumber: 1,
      explicit: false,
      albumId: 'album-123',
      artistIds: ['artist-123'],
      audioFile: null,
    } as TrackFormValues,
  });

  return (
    <CreateTrackFormFields
      form={form}
      serverErrors={serverErrors}
      isScanningMetadata={isScanningMetadata}
      trackCoverFile={trackCoverFile}
      trackCoverPreviewUrl={trackCoverPreviewUrl}
      useTrackCoverAsAlbumCover={useTrackCoverAsAlbumCover}
      currentAlbumCoverUrl={null}
      onSelectTrackCover={onSelectTrackCover}
      onAudioFileChange={onAudioFileChange}
    />
  );
}

describe('CreateTrackFormFields', () => {
  const mockOnSelectTrackCover = vi.fn();
  const mockOnAudioFileChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title, disk, track number, explicit, and audio file fields', () => {
    render(
      <CreateTrackFormFieldsWrapper
        isScanningMetadata={false}
        trackCoverFile={null}
        trackCoverPreviewUrl={null}
        useTrackCoverAsAlbumCover={false}
        onSelectTrackCover={mockOnSelectTrackCover}
        onAudioFileChange={mockOnAudioFileChange}
      />,
    );

    expect(screen.getByLabelText('Track Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Disk No.')).toBeInTheDocument();
    expect(screen.getByLabelText('Track No.')).toBeInTheDocument();
    expect(screen.getByLabelText('Explicit Content')).toBeInTheDocument();
    expect(screen.getByLabelText('Audio File')).toBeInTheDocument();
  });

  it('shows server errors when provided', () => {
    render(
      <CreateTrackFormFieldsWrapper
        serverErrors={{ title: 'Title error', trackNumber: 'Track error' }}
        isScanningMetadata={false}
        trackCoverFile={null}
        trackCoverPreviewUrl={null}
        useTrackCoverAsAlbumCover={false}
        onSelectTrackCover={mockOnSelectTrackCover}
        onAudioFileChange={mockOnAudioFileChange}
      />,
    );

    expect(screen.getByText('Title error')).toBeInTheDocument();
    expect(screen.getByText('Track error')).toBeInTheDocument();
  });

  it('shows SingleTrackCoverUpdateBanner when trackCoverFile and trackCoverPreviewUrl exist', () => {
    const coverFile = new File(['x'], 'cover.jpg', { type: 'image/jpeg' });
    render(
      <CreateTrackFormFieldsWrapper
        isScanningMetadata={false}
        trackCoverFile={coverFile}
        trackCoverPreviewUrl="blob:url"
        useTrackCoverAsAlbumCover={false}
        onSelectTrackCover={mockOnSelectTrackCover}
        onAudioFileChange={mockOnAudioFileChange}
      />,
    );

    expect(screen.getByText('SingleTrackCoverUpdateBanner')).toBeInTheDocument();
  });

  it('does not show SingleTrackCoverUpdateBanner when isScanningMetadata', () => {
    const coverFile = new File(['x'], 'cover.jpg', { type: 'image/jpeg' });
    render(
      <CreateTrackFormFieldsWrapper
        isScanningMetadata
        trackCoverFile={coverFile}
        trackCoverPreviewUrl="blob:url"
        useTrackCoverAsAlbumCover={false}
        onSelectTrackCover={mockOnSelectTrackCover}
        onAudioFileChange={mockOnAudioFileChange}
      />,
    );

    expect(screen.queryByText('SingleTrackCoverUpdateBanner')).not.toBeInTheDocument();
  });

  it('shows Scanning metadata... when isScanningMetadata', () => {
    render(
      <CreateTrackFormFieldsWrapper
        isScanningMetadata
        trackCoverFile={null}
        trackCoverPreviewUrl={null}
        useTrackCoverAsAlbumCover={false}
        onSelectTrackCover={mockOnSelectTrackCover}
        onAudioFileChange={mockOnAudioFileChange}
      />,
    );

    expect(screen.getByText('Scanning metadata...')).toBeInTheDocument();
  });
});
