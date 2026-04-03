/**
 * Creates a default player store state for tests. Override any field via overrides.
 * Use with vi.mocked(usePlayerStore).mockReturnValue(createPlayerStoreMock({ isPlaying: true }))
 *
 * @example
 * ```ts
 * vi.mock('@/stores/player.store', () => ({ usePlayerStore: vi.fn() }));
 * vi.mocked(usePlayerStore).mockReturnValue(createPlayerStoreMock({ isPlaying: true }));
 * ```
 */
export function createPlayerStoreMock(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const noop = () => {};
  return {
    currentTrack: null,
    isPlaying: false,
    volume: 1,
    currentTime: 0,
    duration: 0,
    quality: "auto",
    availableQualities: ["auto"],
    queue: [],
    originalQueue: [],
    history: [],
    repeatMode: "off",
    isShuffled: false,
    togglePlay: noop,
    nextTrack: noop,
    previousTrack: noop,
    toggleRepeatMode: noop,
    toggleShuffle: noop,
    setVolume: noop,
    setCurrentTime: noop,
    setDuration: noop,
    isQueueOpen: false,
    sidebarView: "queue",
    toggleQueue: noop,
    setQueueOpen: noop,
    setSidebarView: noop,
    ...overrides,
  };
}
