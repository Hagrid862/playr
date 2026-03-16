import {
  randBetweenDate,
  randNumber,
  randPastDate,
  randUuid,
} from "@ngneat/falso";
import { type LibraryTrack } from "@repo/db";

export function libraryTrackBuilder(
  overrides?: Partial<LibraryTrack>,
): LibraryTrack {
  const createdAt = randPastDate();
  return {
    id: randUuid(),
    listenedCount: randNumber({ min: 0, max: 100 }),
    libraryId: randUuid(),
    trackId: randUuid(),
    createdAt,
    updatedAt: randBetweenDate({ from: createdAt, to: new Date() }),
    listenCountResetAt: null,
    deletedAt: null,
    ...overrides,
  };
}
