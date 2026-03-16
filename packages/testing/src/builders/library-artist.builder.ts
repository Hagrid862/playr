import { randPastDate, randUuid } from "@ngneat/falso";
import { type LibraryArtist } from "@repo/db";

export function libraryArtistBuilder(
  overrides?: Partial<LibraryArtist>,
): LibraryArtist {
  return {
    id: randUuid(),
    libraryId: randUuid(),
    artistId: randUuid(),
    createdAt: randPastDate(),
    updatedAt: randPastDate(),
    deletedAt: null,
    ...overrides,
  };
}
