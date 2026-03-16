import { Visibility, type Artist } from "@repo/db";
import { TEST_IDS } from "./constants";

export function artistBuilder(overrides?: Partial<Artist>): Artist {
  const now = new Date();
  return {
    id: TEST_IDS.artist,
    name: "Test Artist",
    description: "Test Description",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    bannerId: TEST_IDS.image,
    avatarId: TEST_IDS.image,
    visibility: Visibility.public,
    isCommunity: false,
    verified: false,
    ...overrides,
  };
}
