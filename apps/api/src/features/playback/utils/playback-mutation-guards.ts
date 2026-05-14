import { BadRequestException } from '@nestjs/common';

const EXPECTED_VERSION_MESSAGE =
  'expectedVersion must be the current server version; use set-queue-state to create state first.';

/** Reject mutations when the client has no server version yet (optimistic concurrency). */
export function requirePlaybackMutationExpectedVersion(expectedVersion: number): void {
  if (expectedVersion === 0) {
    throw new BadRequestException(EXPECTED_VERSION_MESSAGE);
  }
}
