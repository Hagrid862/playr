import type { CreateLibraryArtistRequest } from "@repo/contracts";

export function createLibraryArtistRequestBuilder(
  overrides?: Partial<CreateLibraryArtistRequest>,
): CreateLibraryArtistRequest {
  return {
    name: "",
    description: "",
    ...overrides,
  };
}
