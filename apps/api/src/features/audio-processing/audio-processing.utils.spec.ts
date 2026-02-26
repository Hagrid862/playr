import { describe, expect, it } from 'vitest';
import { canUserUpdateTrackDuration } from './audio-processing.utils';

describe('audio-processing.utils', () => {
  describe('canUserUpdateTrackDuration', () => {
    it('should return false when track.access is undefined', () => {
      expect(canUserUpdateTrackDuration({}, 'user-1')).toBe(false);
      expect(canUserUpdateTrackDuration({ access: undefined }, 'user-1')).toBe(false);
    });

    it('should return true when user is owner', () => {
      expect(
        canUserUpdateTrackDuration({ access: [{ userId: 'user-1', role: 'owner' }] }, 'user-1'),
      ).toBe(true);
    });

    it('should return true when user is editor', () => {
      expect(
        canUserUpdateTrackDuration({ access: [{ userId: 'user-1', role: 'editor' }] }, 'user-1'),
      ).toBe(true);
    });

    it('should return false when user is viewer', () => {
      expect(
        canUserUpdateTrackDuration({ access: [{ userId: 'user-1', role: 'viewer' }] }, 'user-1'),
      ).toBe(false);
    });

    it('should return false when userId does not match', () => {
      expect(
        canUserUpdateTrackDuration({ access: [{ userId: 'other-user', role: 'owner' }] }, 'user-1'),
      ).toBe(false);
    });
  });
});
