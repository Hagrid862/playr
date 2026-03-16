import { randNumber, randPastDate, randUuid } from "@ngneat/falso";
import { type LibraryTrack } from "@repo/db";

export function libraryTrackBuilder(
  overrides?: Partial<LibraryTrack>,
): LibraryTrack {
  return {
    id: randUuid(),
    listenedCount: randNumber({ min: 0, max: 100 }),
    libraryId: randUuid(),
    trackId: randUuid(),
    createdAt: randPastDate(),
    updatedAt: randPastDate(),
    listenCountResetAt: null,
    deletedAt: null,
    ...overrides,
  };
}
