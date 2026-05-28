import type { PlaybackTrack, ZodTrack } from '@repo/contracts';
import { UNKNOWN_ARTIST_LABEL } from '@/lib/display-constants';
import { albumBuilder, artistBuilder, imageBuilder, trackBuilder } from '@repo/testing/builders';
import { describe, expect, it, vi } from 'vitest';
import {
  createOptimisticListenHistoryItem,
  playbackTrackToQueueItem,
  playbackTrackToZodTrack,
  zodTrackToPlaybackTrack,
} from './playback-mappers';

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
        originalPosition: 0,
        type: 'queue',
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

  describe('playbackTrackToZodTrack', () => {
    it('maps PlaybackTrack to a ZodTrack-shaped listen history track', () => {
      const now = new Date('2026-05-27T12:00:00Z');
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

      const result = playbackTrackToZodTrack(track, now);

      expect(result.createdAt).toBe(now);
      expect(result.artists?.[0]?.name).toBe('Artist');
      expect(result.album?.cover?.url).toBe('art.png');
    });

    it('omits album when the playback track has no album id', () => {
      const track = {
        id: '1',
        title: 'Title',
        trackId: '1',
        artists: ['Artist'],
        albumName: 'Album',
        albumId: '',
        albumArt: 'art.png',
        duration: 120,
        explicit: false,
      } as PlaybackTrack;

      const result = playbackTrackToZodTrack(track);

      expect(result.album).toBeUndefined();
    });
  });

  describe('createOptimisticListenHistoryItem', () => {
    it('returns a listen history list item', () => {
      const track: PlaybackTrack = {
        id: '1',
        title: 'Title',
        trackId: '1',
        artists: ['Artist'],
        albumName: 'Album',
        albumId: 'album-1',
        albumArt: null,
        duration: 120,
        explicit: false,
      };

      const result = createOptimisticListenHistoryItem(track, 'optimistic-1');

      expect(result.id).toBe('optimistic-1');
      expect(result.track.id).toBe('1');
      expect(result.completed).toBe(false);
    });
  });

  describe('zodTrackToPlaybackTrack', () => {
    it('maps ZodTrack to PlaybackTrack', () => {
      const cover = imageBuilder({ url: 'art.png' });
      const album = { ...albumBuilder({ id: 'album-1', name: '  Album  ' }), cover };
      const track: ZodTrack = {
        ...(trackBuilder({
          id: '1',
          title: '  Title  ',
          duration: 120,
          explicit: false,
          albumId: 'album-1',
          visibility: 'public',
        }) as ZodTrack),
        album,
        artists: [artistBuilder({ id: 'artist-1', name: '  Artist  ' })],
      };

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
      const track: ZodTrack = trackBuilder({
        id: '1',
        title: '',
        duration: 120,
        explicit: false,
        visibility: 'public',
        albumId: '',
      }) as ZodTrack;

      const result = zodTrackToPlaybackTrack(track);

      expect(result.title).toBe('1');
      expect(result.albumName).toBe('Unknown album');
      expect(result.artists).toEqual([UNKNOWN_ARTIST_LABEL]);
      expect(result.albumArt).toBeNull();
      expect(result.albumId).toBe('1');
    });

    it('handles empty album strings', () => {
      const track: ZodTrack = {
        ...(trackBuilder({
          id: '1',
          title: 'Title',
          duration: 120,
          explicit: false,
          albumId: '  ',
          visibility: 'public',
        }) as ZodTrack),
        album: { ...albumBuilder({ name: ' ' }) },
      };

      const result = zodTrackToPlaybackTrack(track);
      expect(result.albumName).toBe('Unknown album');
      expect(result.albumId).toBe('1');
    });

    it('filters empty artist names', () => {
      const track: ZodTrack = {
        ...(trackBuilder({
          id: '1',
          title: 'Title',
          duration: 120,
          explicit: false,
          visibility: 'public',
        }) as ZodTrack),
        artists: [artistBuilder({ name: '' }), artistBuilder({ name: 'Artist' })],
      };

      const result = zodTrackToPlaybackTrack(track);
      expect(result.artists).toEqual(['Artist']);
    });

    it('uses unknown artist label when all artist names are empty', () => {
      const track: ZodTrack = {
        ...(trackBuilder({
          id: '1',
          title: 'Title',
          duration: 120,
          explicit: false,
          visibility: 'public',
        }) as ZodTrack),
        artists: [artistBuilder({ name: '' }), artistBuilder({ name: '   ' })],
      };

      const result = zodTrackToPlaybackTrack(track);
      expect(result.artists).toEqual([UNKNOWN_ARTIST_LABEL]);
    });
  });
});
