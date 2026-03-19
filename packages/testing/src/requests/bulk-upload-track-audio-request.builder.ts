import type { BulkUploadTrackAudioRequest } from "@repo/contracts";
import { randUuid } from "@ngneat/falso";

export function bulkUploadTrackAudioRequestBuilder(
  overrides?: Partial<BulkUploadTrackAudioRequest>,
): BulkUploadTrackAudioRequest {
  return {
    trackIds: [randUuid()],
    ...overrides,
  };
}
