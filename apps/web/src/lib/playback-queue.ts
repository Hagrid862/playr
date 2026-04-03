import type { QueueItem } from '@repo/contracts';

/** Next-up order: unshuffled = manual (`queue`) then album-derived (`playingNext`); shuffled = single list by `position`. */
export function getOrderedNextQueue(queue: QueueItem[], isShuffled: boolean): QueueItem[] {
  const sorted = [...queue].sort((a, b) => a.position - b.position);
  if (isShuffled) return sorted;
  const manual = sorted.filter((i) => i.type === 'queue');
  const playingNext = sorted.filter((i) => i.type === 'playingNext');
  return [...manual, ...playingNext];
}

/** After drag-and-drop: keep partition order (all `queue` before all `playingNext`), preserve relative order within each. */
export function reorderKeepingPartitions(newOrder: QueueItem[]): QueueItem[] {
  const manual = newOrder.filter((i) => i.type === 'queue');
  const playingNext = newOrder.filter((i) => i.type === 'playingNext');
  return [
    ...manual.map((item, i) => ({ ...item, position: i })),
    ...playingNext.map((item, i) => ({ ...item, position: i })),
  ];
}

export function shuffleArray<T>(array: T[]): T[] {
  const next = [...array];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}
