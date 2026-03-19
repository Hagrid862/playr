import type { GetLibraryAlbumsRequest } from "@repo/contracts";

export function getLibraryAlbumsRequestBuilder(
  overrides?: Partial<GetLibraryAlbumsRequest>,
): GetLibraryAlbumsRequest {
  return {
    page: 1,
    limit: 20,
    ...overrides,
  };
}
