import type { CreateLibraryAlbumRequest } from "@repo/contracts";
import { AlbumType } from "@repo/db";
import { randUuid } from "@ngneat/falso";

export function createLibraryAlbumRequestBuilder(
  overrides?: Partial<CreateLibraryAlbumRequest>,
): CreateLibraryAlbumRequest {
  return {
    name: "",
    description: "",
    type: AlbumType.album,
    artistId: randUuid(),
    releaseDate: null,
    ...overrides,
  };
}
