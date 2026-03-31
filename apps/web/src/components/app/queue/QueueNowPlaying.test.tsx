import type { QueueItem } from '@repo/contracts';
// import { albumBuilder, imageBuilder, trackBuilder } from '@repo/testing/builders';
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
      const track: QueueItem = {
        queueId: '1',
        track: {
          id: '1',
          trackId: '1',
          title: 'Test Song',
          artists: ['Artist A'],
          albumArt: 'http://example.com/cover.jpg',
          albumName: 'Album A',
          albumId: '1',
          duration: 100,
          explicit: false,
        },
        position: 0,
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
        queueId: '2',
        track: {
          id: '2',
          trackId: '2',
          title: 'Test Song 2',
          artists: ['Artist B'],
          albumArt: '',
          albumName: 'Album B',
          albumId: '1',
          duration: 100,
          explicit: false,
        },
        position: 0,
      };

      customRender(<QueueNowPlaying currentTrack={track} />);
      expect(screen.getByText('Test Song 2')).toBeInTheDocument();
      expect(screen.queryByAltText('Test Song 2')).not.toBeInTheDocument();
    });

    it('renders "Unknown Artist" when artists is missing', () => {
      const track: QueueItem = {
        queueId: '3',
        track: {
          id: '3',
          trackId: '3',
          title: 'No Artist Song',
          artists: [],
          albumArt: '',
          albumName: 'Album A',
          albumId: '1',
          duration: 100,
          explicit: false,
        },
        position: 0,
      };

      customRender(<QueueNowPlaying currentTrack={track} />);
      expect(screen.getByText('Unknown Artist')).toBeInTheDocument();
    });
  });
});
