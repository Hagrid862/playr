import type { UpdateLibraryAlbumRequest } from "@repo/contracts";

export function updateLibraryAlbumRequestBuilder(
  overrides?: Partial<UpdateLibraryAlbumRequest>,
): UpdateLibraryAlbumRequest {
  return {
    ...overrides,
  };
}
