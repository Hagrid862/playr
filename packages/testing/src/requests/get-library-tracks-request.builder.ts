import type { GetLibraryTracksRequest } from "@repo/contracts";

export function getLibraryTracksRequestBuilder(
  overrides?: Partial<GetLibraryTracksRequest>,
): GetLibraryTracksRequest {
  return {
    page: 1,
    limit: 20,
    ...overrides,
  };
}
