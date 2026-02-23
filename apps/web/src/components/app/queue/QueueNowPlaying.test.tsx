import type { QueueItem as PlayrQueueItem } from '@/stores/player.store';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QueueNowPlaying } from './QueueNowPlaying';

describe('QueueNowPlaying', () => {
  it('renders nothing when currentTrack is null', () => {
    const { container } = render(<QueueNowPlaying currentTrack={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders track details when currentTrack is provided', () => {
    const track = {
      uniqueId: '1',
      title: 'Test Song',
      artists: [{ name: 'Artist A' }],
      album: { cover: { url: 'http://example.com/cover.jpg' } }
    } as PlayrQueueItem;

    render(<QueueNowPlaying currentTrack={track} />);
    expect(screen.getByText('Now Playing')).toBeInTheDocument();
    expect(screen.getByText('Test Song')).toBeInTheDocument();
    expect(screen.getByText('Artist A')).toBeInTheDocument();
    expect(screen.getByAltText('Test Song')).toHaveAttribute('src', 'http://example.com/cover.jpg');
  });

  it('renders fallback icon when no cover is provided', () => {
    const track = {
      uniqueId: '2',
      title: 'Test Song 2',
      artists: [{ name: 'Artist B' }],
      album: { cover: null }
    } as unknown as PlayrQueueItem;

    render(<QueueNowPlaying currentTrack={track} />);
    expect(screen.getByText('Test Song 2')).toBeInTheDocument();
    expect(screen.queryByAltText('Test Song 2')).not.toBeInTheDocument();
  });
});
