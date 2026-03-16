import { type LibraryArtist } from "@repo/db";
import { TEST_IDS } from "./constants";

export function libraryArtistBuilder(
  overrides?: Partial<LibraryArtist>,
): LibraryArtist {
  const now = new Date();
  return {
    id: TEST_IDS.libraryArtist,
    libraryId: TEST_IDS.library,
    artistId: TEST_IDS.artist,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}
