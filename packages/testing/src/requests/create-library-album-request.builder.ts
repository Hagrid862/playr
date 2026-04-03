import { randUuid } from "@ngneat/falso";
import type { CreateLibraryAlbumRequest } from "@repo/contracts";
import { AlbumType } from "@repo/db";

export function createLibraryAlbumRequestBuilder(
  overrides?: Partial<CreateLibraryAlbumRequest>,
): CreateLibraryAlbumRequest {
  return {
    name: "Test Album",
    description: "Test album description",
    type: AlbumType.album,
    artistId: randUuid(),
    releaseDate: null,
    ...overrides,
  };
}
