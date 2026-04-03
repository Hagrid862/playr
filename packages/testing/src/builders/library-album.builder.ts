import { randBetweenDate, randPastDate, randUuid } from "@ngneat/falso";
import { type LibraryAlbum } from "@repo/db";

export function libraryAlbumBuilder(
  overrides?: Partial<LibraryAlbum>,
): LibraryAlbum {
  const createdAt = randPastDate();
  return {
    id: randUuid(),
    libraryId: randUuid(),
    albumId: randUuid(),
    createdAt,
    updatedAt: randBetweenDate({ from: createdAt, to: new Date() }),
    deletedAt: null,
    ...overrides,
  };
}
