import type { QueueItem } from '@/stores/player.store';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  createQueueItemFixture,
  testAlbumNoCover,
  testAlbumWithCover,
  testArtist,
} from '../test-utils/player-test-utils';
import { QueueNowPlaying } from './QueueNowPlaying';

describe('QueueNowPlaying', () => {
  describe('empty', () => {
    it('renders nothing when currentTrack is null', () => {
      const { container } = render(<QueueNowPlaying currentTrack={null} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('with track', () => {
    it('renders track details when currentTrack is provided', () => {
      const artistA = testArtist({ name: 'Artist A' });
      const album = testAlbumWithCover('http://example.com/cover.jpg');
      const track: QueueItem = {
        ...createQueueItemFixture({ uniqueId: '1', title: 'Test Song' }),
        artists: [artistA],
        album,
      };

      render(<QueueNowPlaying currentTrack={track} />);
      expect(screen.getByText('Now Playing')).toBeInTheDocument();
      expect(screen.getByText('Test Song')).toBeInTheDocument();
      expect(screen.getByText('Artist A')).toBeInTheDocument();
      expect(screen.getByAltText('Test Song')).toHaveAttribute(
        'src',
        'http://example.com/cover.jpg',
      );
    });

    it('renders fallback icon when no cover is provided', () => {
      const track: QueueItem = {
        ...createQueueItemFixture({ uniqueId: '2', title: 'Test Song 2' }),
        artists: [testArtist({ name: 'Artist B' })],
        album: testAlbumNoCover(),
      };

      render(<QueueNowPlaying currentTrack={track} />);
      expect(screen.getByText('Test Song 2')).toBeInTheDocument();
      expect(screen.queryByAltText('Test Song 2')).not.toBeInTheDocument();
    });
  });
});
