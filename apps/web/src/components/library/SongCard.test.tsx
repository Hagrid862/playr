import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SongCard } from './SongCard';

function getDefaultProps() {
  return {
    id: 'test-song-id',
    trackNumber: 1,
    title: 'Test Song',
    duration: 185,
    artists: [{ id: '1', name: 'Artist 1' }],
  };
}

describe('SongCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders song details correctly', () => {
      customRender(<SongCard {...getDefaultProps()} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Test Song')).toBeInTheDocument();
      expect(screen.getByText('Artist 1')).toBeInTheDocument();
      expect(screen.getByText('3:05')).toBeInTheDocument();
    });

    it('renders explicit tag when explicit is true', () => {
      customRender(<SongCard {...getDefaultProps()} explicit />);
      expect(screen.getByText('E')).toBeInTheDocument();
    });

    it('does not render explicit tag when explicit is false or undefined', () => {
      customRender(<SongCard {...getDefaultProps()} />);
      expect(screen.queryByText('E')).not.toBeInTheDocument();
    });

    it('formats multiple artists correctly', () => {
      customRender(
        <SongCard
          {...getDefaultProps()}
          artists={[
            { id: '1', name: 'Artist 1' },
            { id: '2', name: 'Artist 2' },
          ]}
        />,
      );
      expect(screen.getByText('Artist 1, Artist 2')).toBeInTheDocument();
    });

    it('renders track number and play icon structure', () => {
      const { container } = customRender(<SongCard {...getDefaultProps()} />);

      const trackNum = screen.getByText('1');
      expect(trackNum).toHaveClass('group-hover:hidden');

      const playIcon = container.querySelector('svg');
      expect(playIcon).toBeInTheDocument();
      expect(playIcon).toHaveClass('hidden', 'group-hover:block');
    });
  });

  describe('duration formatting', () => {
    it('formats with leading zero for seconds under 10', () => {
      customRender(<SongCard {...getDefaultProps()} duration={65} />);
      expect(screen.getByText('1:05')).toBeInTheDocument();
    });

    it('formats durations over 10 minutes', () => {
      customRender(<SongCard {...getDefaultProps()} duration={605} />);
      expect(screen.getByText('10:05')).toBeInTheDocument();
    });
  });

  describe('user interaction', () => {
    it('calls onClick when clicked', () => {
      const onClick = vi.fn();
      customRender(<SongCard {...getDefaultProps()} onClick={onClick} />);

      fireEvent.click(screen.getByText('Test Song'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('context menu', () => {
    it('calls onEdit with track id', () => {
      const onEdit = vi.fn();
      customRender(<SongCard {...getDefaultProps()} onEdit={onEdit} />);

      fireEvent.contextMenu(screen.getByText('Test Song'));
      fireEvent.click(screen.getByText('Edit'));
      expect(onEdit).toHaveBeenCalledWith('test-song-id');
    });

    it('calls onDelete with id and title', () => {
      const onDelete = vi.fn();
      customRender(<SongCard {...getDefaultProps()} onDelete={onDelete} />);

      fireEvent.contextMenu(screen.getByText('Test Song'));
      fireEvent.click(screen.getByText('Delete'));
      expect(onDelete).toHaveBeenCalledWith({ id: 'test-song-id', title: 'Test Song' });
    });

    it('calls onAddToQueue', () => {
      const onAddToQueue = vi.fn();
      customRender(<SongCard {...getDefaultProps()} onAddToQueue={onAddToQueue} />);

      fireEvent.contextMenu(screen.getByText('Test Song'));
      fireEvent.click(screen.getByText('Add to Queue'));
      expect(onAddToQueue).toHaveBeenCalled();
    });

    it('calls onPlayNext', () => {
      const onPlayNext = vi.fn();
      customRender(<SongCard {...getDefaultProps()} onPlayNext={onPlayNext} />);

      fireEvent.contextMenu(screen.getByText('Test Song'));
      fireEvent.click(screen.getByText('Play Next'));
      expect(onPlayNext).toHaveBeenCalled();
    });
  });

  describe('active and playing', () => {
    it('applies active styles when isActive', () => {
      customRender(<SongCard {...getDefaultProps()} isActive />);

      const titleElement = screen.getByText('Test Song');
      expect(titleElement).toHaveClass('text-green-500');

      const trackNum = screen.getByText('1');
      expect(trackNum).toHaveClass('hidden');

      const container = screen.getByText('Test Song').closest('.group');
      expect(container).toHaveClass('bg-white/10');
    });

    it('renders music bars when isActive and isPlaying', () => {
      const { container } = customRender(<SongCard {...getDefaultProps()} isActive isPlaying />);

      expect(screen.queryByText('1')).not.toBeInTheDocument();
      expect(container.querySelector('.animate-music-bar-1')).toBeInTheDocument();
    });
  });

  describe('processing and failed', () => {
    it('renders Spinner and blocks interaction when isProcessing', () => {
      const onClick = vi.fn();
      customRender(<SongCard {...getDefaultProps()} isProcessing onClick={onClick} />);

      expect(screen.getByLabelText('Processing')).toBeInTheDocument();
      expect(screen.getByText('Test Song').closest('.group')).toHaveClass(
        'opacity-60',
        'cursor-not-allowed',
      );

      fireEvent.click(screen.getByText('Test Song'));
      expect(onClick).not.toHaveBeenCalled();
    });

    it('renders WarningIcon and blocks interaction when isFailed', () => {
      const onClick = vi.fn();
      customRender(<SongCard {...getDefaultProps()} isFailed onClick={onClick} />);

      expect(screen.getByLabelText('Processing failed')).toBeInTheDocument();
      expect(screen.getByText('Test Song').closest('.group')).toHaveClass(
        'opacity-60',
        'cursor-not-allowed',
      );

      fireEvent.click(screen.getByText('Test Song'));
      expect(onClick).not.toHaveBeenCalled();
    });
  });
});
