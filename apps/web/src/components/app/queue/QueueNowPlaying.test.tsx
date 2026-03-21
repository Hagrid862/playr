import type { QueueItem } from '@/stores/player.store';
import {
  albumBuilder,
  artistBuilder,
  customRender,
  imageBuilder,
  trackBuilder,
} from '@repo/testing';
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
      const artistA = artistBuilder({ name: 'Artist A' });
      const album = {
        ...albumBuilder({ name: 'Album A' }),
        cover: imageBuilder({ url: 'http://example.com/cover.jpg' }),
      };
      const track: QueueItem = {
        uniqueId: '1',
        ...trackBuilder({ title: 'Test Song' }),
        artists: [artistA],
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
        artists: [artistBuilder({ name: 'Artist B' })],
        album: { ...albumBuilder({ name: 'Album B' }), cover: null },
      };

      customRender(<QueueNowPlaying currentTrack={track} />);
      expect(screen.getByText('Test Song 2')).toBeInTheDocument();
      expect(screen.queryByAltText('Test Song 2')).not.toBeInTheDocument();
    });
  });
});
