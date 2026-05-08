import { trackBuilder } from '@repo/testing/builders';
import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BulkTrackCard } from './BulkTrackCard';

describe('BulkTrackCard', () => {
  const mockOnUpdate = vi.fn();
  const mockOnRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders track info', () => {
      const track = {
        ...trackBuilder({ explicit: false }),
        file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }),
      };
      customRender(<BulkTrackCard track={track} onUpdate={mockOnUpdate} onRemove={mockOnRemove} genres={[]} pendingGenres={[]} isLoadingGenres={false} onRequestCreateGenre={vi.fn()} />);

      expect(screen.getByText('track1.mp3')).toBeInTheDocument();
      expect(screen.getByDisplayValue(track.title)).toBeInTheDocument();
      expect(screen.getByLabelText('Disk No.')).toHaveValue(track.diskNumber);
      expect(screen.getByLabelText('Track No.')).toHaveValue(track.trackNumber);
      expect(screen.getByRole('checkbox', { name: 'Explicit Content' })).not.toBeChecked();
    });
  });

  describe('onUpdate', () => {
    it('updates title', () => {
      const track = {
        ...trackBuilder(),
        file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }),
      };
      customRender(<BulkTrackCard track={track} onUpdate={mockOnUpdate} onRemove={mockOnRemove} genres={[]} pendingGenres={[]} isLoadingGenres={false} onRequestCreateGenre={vi.fn()} />);

      fireEvent.change(screen.getByLabelText('Track Title'), { target: { value: 'New Title' } });

      expect(mockOnUpdate).toHaveBeenCalledWith({ title: 'New Title' });
    });

    it('updates disk number', () => {
      const track = {
        ...trackBuilder({ diskNumber: 1 }),
        file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }),
      };
      customRender(<BulkTrackCard track={track} onUpdate={mockOnUpdate} onRemove={mockOnRemove} genres={[]} pendingGenres={[]} isLoadingGenres={false} onRequestCreateGenre={vi.fn()} />);

      fireEvent.change(screen.getByLabelText('Disk No.'), { target: { value: '2' } });

      expect(mockOnUpdate).toHaveBeenCalledWith({ diskNumber: 2 });
    });

    it('uses disk number 1 when cleared', async () => {
      const user = userEvent.setup();
      const track = {
        ...trackBuilder(),
        file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }),
      };
      customRender(<BulkTrackCard track={track} onUpdate={mockOnUpdate} onRemove={mockOnRemove} genres={[]} pendingGenres={[]} isLoadingGenres={false} onRequestCreateGenre={vi.fn()} />);

      const diskInput = screen.getByLabelText('Disk No.');
      await user.clear(diskInput);
      fireEvent.change(diskInput, { target: { value: '' } });

      expect(mockOnUpdate).toHaveBeenCalledWith({ diskNumber: 1 });
    });

    it('updates track number', () => {
      const track = {
        ...trackBuilder({ trackNumber: 1 }),
        file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }),
      };
      customRender(<BulkTrackCard track={track} onUpdate={mockOnUpdate} onRemove={mockOnRemove} genres={[]} pendingGenres={[]} isLoadingGenres={false} onRequestCreateGenre={vi.fn()} />);

      fireEvent.change(screen.getByLabelText('Track No.'), { target: { value: '3' } });

      expect(mockOnUpdate).toHaveBeenCalledWith({ trackNumber: 3 });
    });

    it('uses track number 1 when invalid', async () => {
      const user = userEvent.setup();
      const track = {
        ...trackBuilder(),
        file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }),
      };
      customRender(<BulkTrackCard track={track} onUpdate={mockOnUpdate} onRemove={mockOnRemove} genres={[]} pendingGenres={[]} isLoadingGenres={false} onRequestCreateGenre={vi.fn()} />);

      const trackInput = screen.getByLabelText('Track No.');
      await user.clear(trackInput);
      fireEvent.change(trackInput, { target: { value: '0' } });

      expect(mockOnUpdate).toHaveBeenCalledWith({ trackNumber: 1 });
    });

    it('toggles explicit checkbox', async () => {
      const user = userEvent.setup();
      const track = {
        ...trackBuilder(),
        file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }),
      };
      customRender(<BulkTrackCard track={track} onUpdate={mockOnUpdate} onRemove={mockOnRemove} genres={[]} pendingGenres={[]} isLoadingGenres={false} onRequestCreateGenre={vi.fn()} />);

      const checkbox = screen.getByRole('checkbox', { name: 'Explicit Content' });
      await user.click(checkbox);

      expect(mockOnUpdate).toHaveBeenCalledWith({ explicit: !track.explicit });
    });

    it('sets explicit false when unchecking', async () => {
      const user = userEvent.setup();
      const track = {
        ...trackBuilder({ explicit: true }),
        file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }),
      };
      customRender(<BulkTrackCard track={track} onUpdate={mockOnUpdate} onRemove={mockOnRemove} genres={[]} pendingGenres={[]} isLoadingGenres={false} onRequestCreateGenre={vi.fn()} />);

      await user.click(screen.getByRole('checkbox', { name: 'Explicit Content' }));

      expect(mockOnUpdate).toHaveBeenCalledWith({ explicit: false });
    });
  });

  describe('onRemove', () => {
    it('calls onRemove when remove button is clicked', async () => {
      const user = userEvent.setup();
      const track = {
        ...trackBuilder(),
        file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }),
      };
      customRender(<BulkTrackCard track={track} onUpdate={mockOnUpdate} onRemove={mockOnRemove} genres={[]} pendingGenres={[]} isLoadingGenres={false} onRequestCreateGenre={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: 'Remove track' }));

      expect(mockOnRemove).toHaveBeenCalled();
    });
  });

  describe('blur', () => {
    it('handles blur on text fields without error', () => {
      const track = {
        ...trackBuilder(),
        file: new File(['a'], 'track1.mp3', { type: 'audio/mpeg' }),
      };
      customRender(<BulkTrackCard track={track} onUpdate={mockOnUpdate} onRemove={mockOnRemove} genres={[]} pendingGenres={[]} isLoadingGenres={false} onRequestCreateGenre={vi.fn()} />);

      fireEvent.blur(screen.getByLabelText('Track Title'));
      fireEvent.blur(screen.getByLabelText('Disk No.'));
      fireEvent.blur(screen.getByLabelText('Track No.'));
    });
  });
});
