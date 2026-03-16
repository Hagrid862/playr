import { type LibraryAlbum } from "@repo/db";
import { TEST_IDS } from "./constants";

export function libraryAlbumBuilder(
  overrides?: Partial<LibraryAlbum>,
): LibraryAlbum {
  const now = new Date();
  return {
    id: TEST_IDS.libraryAlbum,
    libraryId: TEST_IDS.library,
    albumId: TEST_IDS.album,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}
