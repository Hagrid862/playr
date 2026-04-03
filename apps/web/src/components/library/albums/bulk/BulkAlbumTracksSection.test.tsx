import type { BulkTrackItem } from '@/lib/types/library';
import { trackBuilder } from '@repo/testing/builders';
import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BulkAlbumTracksSection } from './BulkAlbumTracksSection';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('../../tracks/bulk/BulkTrackCard', () => ({
  BulkTrackCard: ({
    track,
    onUpdate,
    onRemove,
  }: {
    track: BulkTrackItem;
    onUpdate: (updates: Partial<BulkTrackItem>) => void;
    onRemove: () => void;
  }) => (
    <div data-testid={`track-card-${track.id}`}>
      <span>{track.title}</span>
      <button
        type="button"
        data-testid={`update-${track.id}`}
        onClick={() => onUpdate({ title: 'Updated' })}
      >
        Update
      </button>
      <button type="button" data-testid={`remove-${track.id}`} onClick={onRemove}>
        Remove
      </button>
    </div>
  ),
}));

describe('BulkAlbumTracksSection', () => {
  const mockOnUpdateTrack = vi.fn();
  const mockOnRemoveTrack = vi.fn();
  const mockOnClearAll = vi.fn();

  const defaultProps = {
    tracks: [{ ...trackBuilder(), file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }) }],
    submitError: null,
    isFormValid: true,
    isSubmitting: false,
    isLoadingArtists: false,
    progressStep: null as string | null,
    onUpdateTrack: mockOnUpdateTrack,
    onRemoveTrack: mockOnRemoveTrack,
    onClearAll: mockOnClearAll,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('track list', () => {
    it('renders track count with singular when one track', () => {
      customRender(<BulkAlbumTracksSection {...defaultProps} />);
      expect(screen.getByText('1 track ready')).toBeInTheDocument();
    });

    it('renders track count with plural when multiple tracks', () => {
      customRender(
        <BulkAlbumTracksSection
          {...defaultProps}
          tracks={[
            { ...trackBuilder(), file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }) },
            { ...trackBuilder(), file: new File(['b'], 'track2.mp3', { type: 'audio/mpeg' }) },
          ]}
        />,
      );
      expect(screen.getByText('2 tracks ready')).toBeInTheDocument();
    });

    it('renders BulkTrackCard for each track', () => {
      const tracks = [
        {
          ...trackBuilder(),
          file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }),
        },
        {
          ...trackBuilder(),
          file: new File(['b'], 'track2.mp3', { type: 'audio/mpeg' }),
        },
      ];
      customRender(<BulkAlbumTracksSection {...defaultProps} tracks={tracks} />);

      expect(screen.getByTestId(`track-card-${tracks[0].id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`track-card-${tracks[1].id}`)).toBeInTheDocument();
      expect(screen.getByText(tracks[0].title)).toBeInTheDocument();
      expect(screen.getByText(tracks[1].title)).toBeInTheDocument();
    });

    it('calls onClearAll when Clear all is clicked', async () => {
      customRender(<BulkAlbumTracksSection {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Clear all/i }));
      expect(mockOnClearAll).toHaveBeenCalled();
    });

    it('calls onUpdateTrack when track card triggers update', () => {
      customRender(<BulkAlbumTracksSection {...defaultProps} />);
      fireEvent.click(screen.getByTestId(`update-${defaultProps.tracks[0].id}`));
      expect(mockOnUpdateTrack).toHaveBeenCalledWith(defaultProps.tracks[0].id, {
        title: 'Updated',
      });
    });

    it('calls onRemoveTrack when track card triggers remove', () => {
      customRender(<BulkAlbumTracksSection {...defaultProps} />);
      fireEvent.click(screen.getByTestId(`remove-${defaultProps.tracks[0].id}`));
      expect(mockOnRemoveTrack).toHaveBeenCalledWith(defaultProps.tracks[0].id);
    });
  });

  describe('errors and actions', () => {
    it('displays submitError when present', () => {
      customRender(<BulkAlbumTracksSection {...defaultProps} submitError="Something went wrong" />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('does not display submitError when null', () => {
      customRender(<BulkAlbumTracksSection {...defaultProps} />);
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('renders Cancel link', () => {
      customRender(<BulkAlbumTracksSection {...defaultProps} />);
      const cancelLink = screen.getByRole('link', { name: /Cancel/i });
      expect(cancelLink).toHaveAttribute('href', '/app/library/albums/create');
    });

    it('submit button shows track count when not submitting', () => {
      customRender(<BulkAlbumTracksSection {...defaultProps} />);
      expect(
        screen.getByRole('button', { name: /Create album & upload 1 track/i }),
      ).toBeInTheDocument();
    });

    it('submit button shows tracks plural when multiple', () => {
      customRender(
        <BulkAlbumTracksSection
          {...defaultProps}
          tracks={[
            { ...trackBuilder(), file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }) },
            { ...trackBuilder(), file: new File(['b'], 'track2.mp3', { type: 'audio/mpeg' }) },
          ]}
        />,
      );
      expect(
        screen.getByRole('button', { name: /Create album & upload 2 tracks/i }),
      ).toBeInTheDocument();
    });

    it('submit button is disabled when form is invalid', () => {
      customRender(<BulkAlbumTracksSection {...defaultProps} isFormValid={false} />);
      expect(screen.getByRole('button', { name: /Create album & upload 1 track/i })).toBeDisabled();
    });

    it('submit button is disabled when submitting', () => {
      customRender(<BulkAlbumTracksSection {...defaultProps} isSubmitting={true} />);
      expect(screen.getByRole('button', { name: /Creating.../i })).toBeDisabled();
    });

    it('submit button is disabled when loading artists', () => {
      customRender(<BulkAlbumTracksSection {...defaultProps} isLoadingArtists={true} />);
      expect(screen.getByRole('button', { name: /Create album & upload 1 track/i })).toBeDisabled();
    });

    it('shows progressStep when submitting', () => {
      customRender(
        <BulkAlbumTracksSection
          {...defaultProps}
          isSubmitting={true}
          progressStep="Uploading cover..."
        />,
      );
      expect(screen.getByText('Uploading cover...')).toBeInTheDocument();
    });

    it('shows Creating... when submitting with null progressStep', () => {
      customRender(
        <BulkAlbumTracksSection {...defaultProps} isSubmitting={true} progressStep={null} />,
      );
      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });
  });
});
