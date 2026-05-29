/** Tailwind `h-16` on the floating player shell in `sidebar-layout`. */
export const APP_PLAYER_HEIGHT_REM = 4;

/**
 * Bottom padding for library scroll areas so grids/lists clear the floating player.
 * Uses `--app-player-height` (set on the app shell) at 2× player height plus safe area.
 */
export const LIBRARY_SCROLL_CLEAR_PLAYER_CLASS =
  'pb-[calc(2*var(--app-player-height,4rem)+env(safe-area-inset-bottom,0px))]' as const;
