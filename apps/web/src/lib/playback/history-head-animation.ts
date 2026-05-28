export type HistoryHeadAnimationState = {
  /** True after the list has been non-empty at least once (suppresses initial-load enter). */
  hasSeenList: boolean;
  /** Previous newest listen-history id, or null before first head is recorded. */
  prevHeadId: string | null;
};

/**
 * Returns the new head listen-history id when the list top changed after initial hydrate.
 * Returns null on first load, unchanged head, or missing head.
 */
export function detectNewHistoryHeadId(
  headId: string | undefined,
  state: HistoryHeadAnimationState,
): string | null {
  if (!headId || !state.hasSeenList || state.prevHeadId === null) {
    return null;
  }
  if (state.prevHeadId === headId) {
    return null;
  }
  return headId;
}
