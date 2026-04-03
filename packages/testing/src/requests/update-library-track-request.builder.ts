import type { UpdateLibraryTrackRequest } from "@repo/contracts";

export function updateLibraryTrackRequestBuilder(
  overrides?: Partial<UpdateLibraryTrackRequest>,
): Partial<UpdateLibraryTrackRequest> {
  return {
    ...overrides,
  };
}
