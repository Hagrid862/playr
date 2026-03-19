import type { GetLibraryArtistsRequestDto } from "@repo/contracts";

export function getLibraryArtistsRequestBuilder(
  overrides?: Partial<GetLibraryArtistsRequestDto>,
): GetLibraryArtistsRequestDto {
  return {
    page: 1,
    limit: 20,
    ...overrides,
  };
}
