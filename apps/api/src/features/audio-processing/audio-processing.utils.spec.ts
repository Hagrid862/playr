import { AccessRole } from '@repo/db';
import { trackWithAccessBuilder } from '@repo/testing/builders';
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
        canUserUpdateTrackDuration(
          trackWithAccessBuilder({ userId: 'user-1', role: AccessRole.owner }),
          'user-1',
        ),
      ).toBe(true);
    });

    it('should return true when user is editor', () => {
      expect(
        canUserUpdateTrackDuration(
          trackWithAccessBuilder({ userId: 'user-1', role: AccessRole.editor }),
          'user-1',
        ),
      ).toBe(true);
    });

    it('should return false when user is viewer', () => {
      expect(
        canUserUpdateTrackDuration(
          trackWithAccessBuilder({ userId: 'user-1', role: AccessRole.viewer }),
          'user-1',
        ),
      ).toBe(false);
    });

    it('should return false when userId does not match', () => {
      expect(
        canUserUpdateTrackDuration(
          trackWithAccessBuilder({ userId: 'other-user', role: AccessRole.owner }),
          'user-1',
        ),
      ).toBe(false);
    });
  });
});
