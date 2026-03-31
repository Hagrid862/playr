import { describe, expect, it, vi } from 'vitest';
import { playbackTrackToQueueItem, zodTrackToPlaybackTrack } from './playback-mappers';
import type { PlaybackTrack, ZodTrack } from '@repo/contracts';

vi.mock('uuid', () => ({
  v6: () => 'test-uuid-v6',
}));

describe('playback-mappers', () => {
  describe('playbackTrackToQueueItem', () => {
    it('maps PlaybackTrack to QueueItem', () => {
      const track: PlaybackTrack = {
        id: '1',
        title: 'Title',
        trackId: '1',
        artists: ['Artist'],
        albumName: 'Album',
        albumId: 'album-1',
        albumArt: 'art.png',
        duration: 120,
        explicit: false,
      };

      const result = playbackTrackToQueueItem(track);

      expect(result).toEqual({
        queueId: 'test-uuid-v6',
        track,
        position: 0,
      });
    });

    it('handles missing artists', () => {
      const track: Partial<PlaybackTrack> = {
        id: '1',
      };

      const result = playbackTrackToQueueItem(track as PlaybackTrack);
      expect(result.track.artists).toEqual([]);
    });
  });

  describe('zodTrackToPlaybackTrack', () => {
    it('maps ZodTrack to PlaybackTrack', () => {
      const track: ZodTrack = {
        id: '1',
        title: '  Title  ',
        duration: 120,
        explicit: false,
        visibility: 'public',
        albumId: 'album-1',
        album: {
          id: 'album-1',
          name: '  Album  ',
          cover: { url: 'art.png' },
        },
        artists: [{ id: 'artist-1', name: '  Artist  ' }],
      } as any;

      const result = zodTrackToPlaybackTrack(track);

      expect(result).toEqual({
        id: '1',
        title: 'Title',
        artists: ['Artist'],
        albumArt: 'art.png',
        albumName: 'Album',
        albumId: 'album-1',
        duration: 120,
        explicit: false,
        trackId: '1',
      });
    });

    it('handles minimal track data', () => {
      const track: ZodTrack = {
        id: '1',
        title: '',
        duration: 120,
        explicit: false,
      } as any;

      const result = zodTrackToPlaybackTrack(track);

      expect(result.title).toBe('1');
      expect(result.albumName).toBe('Unknown album');
      expect(result.artists).toEqual([]);
      expect(result.albumArt).toBeNull();
      expect(result.albumId).toBe('1');
    });

    it('handles empty album strings', () => {
      const track: ZodTrack = {
        id: '1',
        title: 'Title',
        duration: 120,
        explicit: false,
        album: { name: ' ' },
        albumId: '  ',
      } as any;

      const result = zodTrackToPlaybackTrack(track);
      expect(result.albumName).toBe('Unknown album');
      expect(result.albumId).toBe('1');
    });

    it('filters empty artist names', () => {
      const track: ZodTrack = {
        id: '1',
        title: 'Title',
        duration: 120,
        explicit: false,
        artists: [{ name: '' }, { name: 'Artist' }],
      } as any;

      const result = zodTrackToPlaybackTrack(track);
      expect(result.artists).toEqual(['Artist']);
    });
  });
});
