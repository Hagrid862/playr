import type { Track } from "@repo/db";
import { Visibility } from "@repo/db";
import { TEST_IDS } from "./constants";

export function trackBuilder(overrides?: Partial<Track>): Track {
  const now = new Date();
  return {
    id: TEST_IDS.track,
    title: "Test Track",
    trackNumber: 1,
    diskNumber: 1,
    duration: 180,
    listenedCount: 0,
    explicit: false,
    lyrics: null,
    visibility: Visibility.private,
    albumId: TEST_IDS.album,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}
