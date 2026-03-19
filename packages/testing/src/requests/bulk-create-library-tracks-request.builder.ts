import { randUuid } from "@ngneat/falso";
import type {
  BulkCreateLibraryTrackItem,
  BulkCreateLibraryTracksRequest,
} from "@repo/contracts";

export function bulkCreateLibraryTrackItemBuilder(
  overrides?: Partial<BulkCreateLibraryTrackItem>,
): BulkCreateLibraryTrackItem {
  return {
    title: "Default Track Title",
    trackNumber: 1,
    diskNumber: 1,
    explicit: false,
    artistIds: [randUuid()],
    ...overrides,
  };
}

export function bulkCreateLibraryTracksRequestBuilder(
  overrides?: Partial<BulkCreateLibraryTracksRequest>,
): BulkCreateLibraryTracksRequest {
  return {
    tracks: [bulkCreateLibraryTrackItemBuilder()],
    ...overrides,
  };
}
