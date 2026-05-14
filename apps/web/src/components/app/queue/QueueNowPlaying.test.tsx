import type { QueueItem } from '@/stores/player.store';
import { albumBuilder, imageBuilder, trackBuilder } from '@repo/testing/builders';
import { customRender } from '@repo/testing/web';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QueueNowPlaying } from './QueueNowPlaying';

describe('QueueNowPlaying', () => {
  describe('empty', () => {
    it('renders nothing when currentTrack is null', () => {
      const { container } = customRender(<QueueNowPlaying currentTrack={null} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('with track', () => {
    it('renders track details when currentTrack is provided', () => {
      const album = {
        ...albumBuilder({ name: 'Album A' }),
        cover: imageBuilder({ url: 'http://example.com/cover.jpg' }),
      };
      const track: QueueItem = {
        uniqueId: '1',
        ...trackBuilder({ title: 'Test Song' }),
        artists: ['Artist A'],
        albumArt: 'http://example.com/cover.jpg',
        album,
      };

      customRender(<QueueNowPlaying currentTrack={track} />);
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
        uniqueId: '2',
        ...trackBuilder({ title: 'Test Song 2' }),
        artists: ['Artist B'],
        albumArt: '',
        album: { ...albumBuilder({ name: 'Album B' }), cover: null },
      };

      customRender(<QueueNowPlaying currentTrack={track} />);
      expect(screen.getByText('Test Song 2')).toBeInTheDocument();
      expect(screen.queryByAltText('Test Song 2')).not.toBeInTheDocument();
    });
  });
});
