import type { DeleteLibraryAlbumRequest } from "@repo/contracts";
import { randUuid } from "@ngneat/falso";

export function deleteLibraryAlbumRequestBuilder(
  overrides?: Partial<DeleteLibraryAlbumRequest>,
): DeleteLibraryAlbumRequest {
  return {
    id: randUuid(),
    ...overrides,
  };
}
