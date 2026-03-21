import type { BulkTrackItem } from '@/lib/types/library';
import { trackBuilder } from '@repo/testing';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BulkTrackList } from './BulkTrackList';

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

describe('BulkTrackList', () => {
  const mockOnUpdateTrack = vi.fn();
  const mockOnRemoveTrack = vi.fn();
  const mockOnClearAll = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('empty state', () => {
    it('renders null when tracks empty', () => {
      const { container } = render(
        <BulkTrackList
          tracks={[]}
          onUpdateTrack={mockOnUpdateTrack}
          onRemoveTrack={mockOnRemoveTrack}
          onClearAll={mockOnClearAll}
        />,
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('header', () => {
    it('renders track count and Clear all button', () => {
      render(
        <BulkTrackList
          tracks={[
            { ...trackBuilder(), file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }) },
          ]}
          onUpdateTrack={mockOnUpdateTrack}
          onRemoveTrack={mockOnRemoveTrack}
          onClearAll={mockOnClearAll}
        />,
      );

      expect(screen.getByText('1 track ready')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Clear all' })).toBeInTheDocument();
    });

    it('renders plural track count for multiple tracks', () => {
      render(
        <BulkTrackList
          tracks={[
            { ...trackBuilder(), file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }) },
            { ...trackBuilder(), file: new File(['b'], 'track2.mp3', { type: 'audio/mpeg' }) },
          ]}
          onUpdateTrack={mockOnUpdateTrack}
          onRemoveTrack={mockOnRemoveTrack}
          onClearAll={mockOnClearAll}
        />,
      );

      expect(screen.getByText('2 tracks ready')).toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('calls onClearAll when Clear all is clicked', async () => {
      const user = userEvent.setup();
      render(
        <BulkTrackList
          tracks={[
            { ...trackBuilder(), file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }) },
          ]}
          onUpdateTrack={mockOnUpdateTrack}
          onRemoveTrack={mockOnRemoveTrack}
          onClearAll={mockOnClearAll}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Clear all' }));

      expect(mockOnClearAll).toHaveBeenCalled();
    });

    it('calls onUpdateTrack when card Update is clicked', async () => {
      const user = userEvent.setup();
      const track = {
        ...trackBuilder(),
        file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }),
      };
      render(
        <BulkTrackList
          tracks={[track]}
          onUpdateTrack={mockOnUpdateTrack}
          onRemoveTrack={mockOnRemoveTrack}
          onClearAll={mockOnClearAll}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Update' }));

      expect(mockOnUpdateTrack).toHaveBeenCalledWith(track.id, { title: 'Updated' });
    });

    it('calls onRemoveTrack when card Remove is clicked', async () => {
      const user = userEvent.setup();
      const track = {
        ...trackBuilder(),
        file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }),
      };
      render(
        <BulkTrackList
          tracks={[track]}
          onUpdateTrack={mockOnUpdateTrack}
          onRemoveTrack={mockOnRemoveTrack}
          onClearAll={mockOnClearAll}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Remove' }));

      expect(mockOnRemoveTrack).toHaveBeenCalledWith(track.id);
    });
  });
});
