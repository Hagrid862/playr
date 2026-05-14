import type { BulkTrackItem } from '@/lib/types/library';
import { trackBuilder } from '@repo/testing/builders';
import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LIBRARY_ALBUM_GENRE_CREATE_VALUE } from './libraryAlbumGenreConstants';
import { LibraryAlbumFromFilesTracksSection } from './LibraryAlbumFromFilesTracksSection';

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
    onRequestCreateGenre,
  }: {
    track: BulkTrackItem;
    onUpdate: (updates: Partial<BulkTrackItem>) => void;
    onRemove: () => void;
    onRequestCreateGenre: (onCreated: (genreId: string) => void) => void;
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
      <button
        type="button"
        data-testid={`sentinel-genre-update-${track.id}`}
        onClick={() =>
          onUpdate({
            genreIds: [...(track.genreIds ?? []), LIBRARY_ALBUM_GENRE_CREATE_VALUE],
          })
        }
      >
        Sentinel genre update
      </button>
      <button
        type="button"
        data-testid={`plain-genre-update-${track.id}`}
        onClick={() => onUpdate({ genreIds: ['plain-genre'] })}
      >
        Plain genre update
      </button>
      <button
        type="button"
        data-testid={`request-genre-${track.id}`}
        onClick={() =>
          onRequestCreateGenre((gid) => {
            onUpdate({ genreIds: [...(track.genreIds ?? []), gid] });
          })
        }
      >
        Request create genre
      </button>
      <button type="button" data-testid={`remove-${track.id}`} onClick={onRemove}>
        Remove
      </button>
    </div>
  ),
}));

describe('LibraryAlbumFromFilesTracksSection', () => {
  const mockOnUpdateTrack = vi.fn();
  const mockOnRemoveTrack = vi.fn();
  const mockOnClearTracks = vi.fn();

  const defaultProps = {
    tracks: [{ ...trackBuilder(), file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }) }],
    submitError: null,
    isFormValid: true,
    isSubmitting: false,
    isLoadingArtists: false,
    progressStep: null as string | null,
    cancelTo: '/app/library/albums',
    onUpdateTrack: mockOnUpdateTrack,
    onRemoveTrack: mockOnRemoveTrack,
    onClearTracks: mockOnClearTracks,
    genres: [],
    pendingGenres: [],
    isLoadingGenres: false,
    onRequestCreateGenre: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('track list', () => {
    it('renders track count with singular when one track', () => {
      customRender(<LibraryAlbumFromFilesTracksSection {...defaultProps} />);
      expect(screen.getByText('1 track ready')).toBeInTheDocument();
    });

    it('renders track count with plural when multiple tracks', () => {
      customRender(
        <LibraryAlbumFromFilesTracksSection
          {...defaultProps}
          tracks={[
            {
              ...trackBuilder({ title: 'Track 1' }),
              file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }),
            },
            {
              ...trackBuilder({ title: 'Track 2' }),
              file: new File(['b'], 'track2.mp3', { type: 'audio/mpeg' }),
            },
          ]}
        />,
      );
      expect(screen.getByText('2 tracks ready')).toBeInTheDocument();
    });

    it('renders BulkTrackCard for each track', () => {
      const tracks = [
        {
          ...trackBuilder({ title: 'Track 1' }),
          file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }),
        },
        {
          ...trackBuilder({ title: 'Track 2' }),
          file: new File(['b'], 'track2.mp3', { type: 'audio/mpeg' }),
        },
      ];
      customRender(<LibraryAlbumFromFilesTracksSection {...defaultProps} tracks={tracks} />);

      expect(screen.getByTestId(`track-card-${tracks[0].id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`track-card-${tracks[1].id}`)).toBeInTheDocument();
      expect(screen.getByText(tracks[0].title)).toBeInTheDocument();
      expect(screen.getByText(tracks[1].title)).toBeInTheDocument();
    });

    it('calls onClearTracks when Clear tracks is clicked', async () => {
      customRender(<LibraryAlbumFromFilesTracksSection {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Clear tracks/i }));
      expect(mockOnClearTracks).toHaveBeenCalled();
    });

    it('calls onUpdateTrack when track card triggers update', () => {
      customRender(<LibraryAlbumFromFilesTracksSection {...defaultProps} />);
      fireEvent.click(screen.getByTestId(`update-${defaultProps.tracks[0].id}`));
      expect(mockOnUpdateTrack).toHaveBeenCalledWith(defaultProps.tracks[0].id, {
        title: 'Updated',
      });
    });

    it('calls onRemoveTrack when track card triggers remove', () => {
      customRender(<LibraryAlbumFromFilesTracksSection {...defaultProps} />);
      fireEvent.click(screen.getByTestId(`remove-${defaultProps.tracks[0].id}`));
      expect(mockOnRemoveTrack).toHaveBeenCalledWith(defaultProps.tracks[0].id);
    });
  });

  describe('errors and actions', () => {
    it('displays submitError when present', () => {
      customRender(
        <LibraryAlbumFromFilesTracksSection {...defaultProps} submitError="Something went wrong" />,
      );
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('does not display submitError when null', () => {
      customRender(<LibraryAlbumFromFilesTracksSection {...defaultProps} />);
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('renders Cancel link', () => {
      customRender(<LibraryAlbumFromFilesTracksSection {...defaultProps} />);
      const cancelLink = screen.getByRole('link', { name: /Cancel/i });
      expect(cancelLink).toHaveAttribute('href', '/app/library/albums');
    });

    it('submit button shows track count when not submitting', () => {
      customRender(<LibraryAlbumFromFilesTracksSection {...defaultProps} />);
      expect(
        screen.getByRole('button', { name: /Create album & upload 1 track/i }),
      ).toBeInTheDocument();
    });

    it('submit button shows tracks plural when multiple', () => {
      customRender(
        <LibraryAlbumFromFilesTracksSection
          {...defaultProps}
          tracks={[
            {
              ...trackBuilder({ title: 'Track 1' }),
              file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }),
            },
            {
              ...trackBuilder({ title: 'Track 2' }),
              file: new File(['b'], 'track2.mp3', { type: 'audio/mpeg' }),
            },
          ]}
        />,
      );
      expect(
        screen.getByRole('button', { name: /Create album & upload 2 tracks/i }),
      ).toBeInTheDocument();
    });

    it('submit button is disabled when form is invalid', () => {
      customRender(<LibraryAlbumFromFilesTracksSection {...defaultProps} isFormValid={false} />);
      expect(screen.getByRole('button', { name: /Create album & upload 1 track/i })).toBeDisabled();
    });

    it('submit button is disabled when submitting', () => {
      customRender(<LibraryAlbumFromFilesTracksSection {...defaultProps} isSubmitting={true} />);
      expect(screen.getByRole('button', { name: /Creating.../i })).toBeDisabled();
    });

    it('submit button is disabled when loading artists', () => {
      customRender(
        <LibraryAlbumFromFilesTracksSection {...defaultProps} isLoadingArtists={true} />,
      );
      expect(screen.getByRole('button', { name: /Create album & upload 1 track/i })).toBeDisabled();
    });

    it('shows progressStep when submitting', () => {
      customRender(
        <LibraryAlbumFromFilesTracksSection
          {...defaultProps}
          isSubmitting={true}
          progressStep="Uploading cover..."
        />,
      );
      expect(screen.getByText('Uploading cover...')).toBeInTheDocument();
    });

    it('shows Creating... when submitting with null progressStep', () => {
      customRender(
        <LibraryAlbumFromFilesTracksSection
          {...defaultProps}
          isSubmitting={true}
          progressStep={null}
        />,
      );
      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });
  });

  describe('genre update wiring', () => {
    it('routes genreIds containing the create sentinel through onRequestCreateGenre', () => {
      const onRequestCreateGenre = vi.fn((cb: (id: string) => void) => {
        cb('new-local-genre');
      });
      const track: BulkTrackItem = {
        ...trackBuilder({ title: 'T' }),
        file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }),
        genreIds: ['keep-me'],
      };
      customRender(
        <LibraryAlbumFromFilesTracksSection
          {...defaultProps}
          tracks={[track]}
          onRequestCreateGenre={onRequestCreateGenre}
        />,
      );

      fireEvent.click(screen.getByTestId(`sentinel-genre-update-${track.id}`));

      expect(onRequestCreateGenre).toHaveBeenCalled();
      expect(mockOnUpdateTrack).toHaveBeenCalledWith(track.id, {
        genreIds: ['keep-me', 'new-local-genre'],
      });
    });

    it('strips only the create sentinel when the track previously had just the sentinel placeholder', () => {
      const onRequestCreateGenre = vi.fn((cb: (id: string) => void) => {
        cb('resolved-id');
      });
      const track: BulkTrackItem = {
        ...trackBuilder({ title: 'T' }),
        file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }),
        genreIds: [LIBRARY_ALBUM_GENRE_CREATE_VALUE],
      };
      customRender(
        <LibraryAlbumFromFilesTracksSection
          {...defaultProps}
          tracks={[track]}
          onRequestCreateGenre={onRequestCreateGenre}
        />,
      );

      fireEvent.click(screen.getByTestId(`sentinel-genre-update-${track.id}`));

      expect(mockOnUpdateTrack).toHaveBeenCalledWith(track.id, {
        genreIds: ['resolved-id'],
      });
    });

    it('handles tracks with no genreIds when merging the create sentinel', () => {
      const onRequestCreateGenre = vi.fn((cb: (id: string) => void) => {
        cb('gid');
      });
      const base = {
        ...trackBuilder({ title: 'T' }),
        file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }),
      };
      const track = { ...base } as typeof base & { genreIds?: string[] };
      delete track.genreIds;

      customRender(
        <LibraryAlbumFromFilesTracksSection
          {...defaultProps}
          tracks={[track]}
          onRequestCreateGenre={onRequestCreateGenre}
        />,
      );

      fireEvent.click(screen.getByTestId(`sentinel-genre-update-${track.id}`));

      expect(mockOnUpdateTrack).toHaveBeenCalledWith(track.id, { genreIds: ['gid'] });
    });

    it('forwards plain genre updates without invoking onRequestCreateGenre', () => {
      const track = {
        ...trackBuilder({ title: 'T' }),
        file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }),
      };
      customRender(<LibraryAlbumFromFilesTracksSection {...defaultProps} tracks={[track]} />);

      fireEvent.click(screen.getByTestId(`plain-genre-update-${track.id}`));

      expect(defaultProps.onRequestCreateGenre).not.toHaveBeenCalled();
      expect(mockOnUpdateTrack).toHaveBeenCalledWith(track.id, { genreIds: ['plain-genre'] });
    });
  });

  describe('showActions', () => {
    it('omits footer actions when showActions is false', () => {
      customRender(<LibraryAlbumFromFilesTracksSection {...defaultProps} showActions={false} />);
      expect(screen.queryByRole('link', { name: /cancel/i })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /create album & upload/i }),
      ).not.toBeInTheDocument();
    });
  });
});
