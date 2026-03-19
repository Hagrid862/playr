import type { DeleteLibraryArtistRequest } from "@repo/contracts";
import { randUuid } from "@ngneat/falso";

export function deleteLibraryArtistRequestBuilder(
  overrides?: Partial<DeleteLibraryArtistRequest>,
): DeleteLibraryArtistRequest {
  return {
    id: randUuid(),
    ...overrides,
  };
}
