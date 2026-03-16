import { randPastDate, randUuid } from "@ngneat/falso";
import { type LibraryAlbum } from "@repo/db";

export function libraryAlbumBuilder(
  overrides?: Partial<LibraryAlbum>,
): LibraryAlbum {
  return {
    id: randUuid(),
    libraryId: randUuid(),
    albumId: randUuid(),
    createdAt: randPastDate(),
    updatedAt: randPastDate(),
    deletedAt: null,
    ...overrides,
  };
}
