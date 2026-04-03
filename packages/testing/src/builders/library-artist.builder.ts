import { randBetweenDate, randPastDate, randUuid } from "@ngneat/falso";
import { type LibraryArtist } from "@repo/db";

export function libraryArtistBuilder(
  overrides?: Partial<LibraryArtist>,
): LibraryArtist {
  const createdAt = randPastDate();
  return {
    id: randUuid(),
    libraryId: randUuid(),
    artistId: randUuid(),
    createdAt,
    updatedAt: randBetweenDate({ from: createdAt, to: new Date() }),
    deletedAt: null,
    ...overrides,
  };
}
