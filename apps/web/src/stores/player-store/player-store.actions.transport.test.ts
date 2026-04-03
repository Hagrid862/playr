import { StreamAudioQuality } from '@repo/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/playback-sync', () => ({
  afterLocalPlaybackMutation: vi.fn(),
  afterLocalPlaybackMutationWithClaim: vi.fn(),
  syncPlayingStateToServer: vi.fn(),
  isPlaybackSyncConnected: vi.fn(() => false),
}));

import { createTrack, getState, resetPlayerStore } from './player-store.test-helpers';

describe('player-store.actions.transport', () => {
  beforeEach(() => {
    resetPlayerStore();
  });

  describe('Basic Setters', () => {
    it('sets volume', () => {
      getState().setVolume(0.5);
      expect(getState().volume).toBe(0.5);
    });

    it('sets current time', () => {
      getState().setCurrentTime(10);
      expect(getState().currentTime).toBe(10);
    });

    it('sets duration', () => {
      getState().setDuration(200);
      expect(getState().duration).toBe(200);
    });

    it('sets quality', () => {
      getState().setQuality(StreamAudioQuality.high);
      expect(getState().quality).toBe(StreamAudioQuality.high);
    });

    it('sets available qualities', () => {
      getState().setAvailableQualities([StreamAudioQuality.high, StreamAudioQuality.lossless]);
      expect(getState().availableQualities).toEqual([
        StreamAudioQuality.high,
        StreamAudioQuality.lossless,
      ]);
    });
  });

  describe('Repeat Mode', () => {
    it('cycles repeat mode off -> all -> one -> off', () => {
      expect(getState().repeatMode).toBe('off');
      getState().toggleRepeatMode();
      expect(getState().repeatMode).toBe('all');
      getState().toggleRepeatMode();
      expect(getState().repeatMode).toBe('one');
      getState().toggleRepeatMode();
      expect(getState().repeatMode).toBe('off');
    });
  });

  describe('Playback Controls', () => {
    it('pauses', () => {
      getState().playTrack(createTrack('1'));
      expect(getState().isPlaying).toBe(true);
      getState().pause();
      expect(getState().isPlaying).toBe(false);
    });

    it('resumes', () => {
      getState().playTrack(createTrack('1'));
      getState().pause();
      getState().resume();
      expect(getState().isPlaying).toBe(true);
    });

    it('resumes only if there is a current track', () => {
      getState().resume();
      expect(getState().isPlaying).toBe(false);
    });

    it('toggles playback only if current track exists', () => {
      getState().togglePlay();
      expect(getState().isPlaying).toBe(false);

      getState().playTrack(createTrack('1'));
      getState().togglePlay();
      expect(getState().isPlaying).toBe(false);
      getState().togglePlay();
      expect(getState().isPlaying).toBe(true);
    });
  });
});
