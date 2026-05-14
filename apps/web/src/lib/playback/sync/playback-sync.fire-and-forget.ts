/**
 * Use for fire-and-forget playback sync commands so timeouts/disconnect rejections
 * do not surface as unhandled promise rejections.
 */
export function firePlaybackCommand(p: Promise<void>, label: string): void {
  void p.catch((err: unknown) => {
    console.warn(`[playback-sync] ${label}`, err);
  });
}
