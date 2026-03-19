import type { CreateLibraryTrackRequest } from "@repo/contracts";
import { randUuid } from "@ngneat/falso";

export function createLibraryTrackRequestBuilder(
  overrides?: Partial<CreateLibraryTrackRequest>,
): CreateLibraryTrackRequest {
  return {
    title: "",
    albumId: randUuid(),
    trackNumber: 1,
    diskNumber: 1,
    explicit: false,
    artistIds: [randUuid()],
    ...overrides,
  };
}
