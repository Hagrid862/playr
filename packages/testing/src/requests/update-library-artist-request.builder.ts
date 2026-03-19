import type { UpdateLibraryArtistRequest } from "@repo/contracts";

export function updateLibraryArtistRequestBuilder(
  overrides?: Partial<UpdateLibraryArtistRequest>,
): UpdateLibraryArtistRequest {
  return {
    ...overrides,
  };
}
