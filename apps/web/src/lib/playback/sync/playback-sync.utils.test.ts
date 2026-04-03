import { describe, expect, it } from 'vitest';
import { playbackStateFixture } from './playback-sync.test-helpers';
import {
  clampCurrentTime,
  isPlaybackStateSyncAck,
  isVersionConflict,
  parseSyncAckError,
} from './playback-sync.utils';

describe('playback-sync.utils', () => {
  describe('isVersionConflict', () => {
    it('detects CONFLICT code', () => {
      expect(isVersionConflict('x', 'CONFLICT')).toBe(true);
    });

    it('detects version mismatch message', () => {
      expect(isVersionConflict('version mismatch')).toBe(true);
    });

    it('detects expected version mismatch message', () => {
      expect(isVersionConflict('Expected version mismatch.')).toBe(true);
    });

    it('returns false for unrelated errors', () => {
      expect(isVersionConflict('other', 'ERROR')).toBe(false);
    });
  });

  describe('clampCurrentTime', () => {
    it('clamps below zero to zero', () => {
      expect(clampCurrentTime(-5, 100)).toBe(0);
    });

    it('floors fractional values and caps at duration', () => {
      expect(clampCurrentTime(3.7, 100)).toBe(3);
      expect(clampCurrentTime(150, 100)).toBe(100);
    });
  });

  describe('parseSyncAckError', () => {
    it('returns null for non-objects', () => {
      expect(parseSyncAckError(null)).toBeNull();
      expect(parseSyncAckError(undefined)).toBeNull();
      expect(parseSyncAckError('x')).toBeNull();
    });

    it('returns null when error field missing or empty', () => {
      expect(parseSyncAckError({})).toBeNull();
      expect(parseSyncAckError({ error: '' })).toBeNull();
    });

    it('parses message and string code', () => {
      expect(parseSyncAckError({ error: 'bad', code: 'X' })).toEqual({
        message: 'bad',
        code: 'X',
      });
    });

    it('omits code when payload has error but no code key', () => {
      expect(parseSyncAckError({ error: 'bad' })).toEqual({ message: 'bad' });
    });

    it('omits code when code is not a string', () => {
      expect(parseSyncAckError({ error: 'bad', code: 1 })).toEqual({ message: 'bad' });
    });

    it('includes code key branch when code property exists but is undefined', () => {
      expect(parseSyncAckError({ error: 'bad', code: undefined })).toEqual({ message: 'bad' });
    });
  });

  describe('isPlaybackStateSyncAck', () => {
    it('accepts full playback state', () => {
      const s = playbackStateFixture({ version: 3 });
      expect(isPlaybackStateSyncAck(s)).toBe(true);
    });

    it('rejects error envelopes', () => {
      expect(isPlaybackStateSyncAck({ error: 'x', code: 'E' })).toBe(false);
    });

    it('rejects null, primitives, and objects without numeric version', () => {
      expect(isPlaybackStateSyncAck(null)).toBe(false);
      expect(isPlaybackStateSyncAck(undefined)).toBe(false);
      expect(isPlaybackStateSyncAck({})).toBe(false);
      expect(isPlaybackStateSyncAck({ version: '1' })).toBe(false);
    });
  });
});
