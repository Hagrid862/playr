import type { UpdateLibraryTrackRequest } from "@repo/contracts";

export function updateLibraryTrackRequestBuilder(
  overrides?: Partial<UpdateLibraryTrackRequest>,
): UpdateLibraryTrackRequest {
  return {
    ...overrides,
  };
}
