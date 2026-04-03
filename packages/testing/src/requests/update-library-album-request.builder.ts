import type { UpdateLibraryAlbumRequest } from "@repo/contracts";
import { AlbumType } from "@repo/db";

const DEFAULT_UPDATE_LIBRARY_ALBUM_REQUEST = {
  name: "",
  description: "",
  type: AlbumType.album,
  releaseDate: null,
  coverId: null,
} satisfies UpdateLibraryAlbumRequest;

export function updateLibraryAlbumRequestBuilder(
  overrides?: Partial<UpdateLibraryAlbumRequest>,
): UpdateLibraryAlbumRequest {
  return {
    ...DEFAULT_UPDATE_LIBRARY_ALBUM_REQUEST,
    ...overrides,
  };
}
