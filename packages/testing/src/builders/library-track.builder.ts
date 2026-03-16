import { type LibraryTrack } from "@repo/db";
import { TEST_IDS } from "./constants";

export function libraryTrackBuilder(
  overrides?: Partial<LibraryTrack>,
): LibraryTrack {
  const now = new Date();
  return {
    id: TEST_IDS.libraryTrack,
    listenedCount: 0,
    libraryId: TEST_IDS.library,
    trackId: TEST_IDS.track,
    createdAt: now,
    updatedAt: now,
    listenCountResetAt: null,
    deletedAt: null,
    ...overrides,
  };
}
