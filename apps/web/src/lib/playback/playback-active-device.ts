/** True when the server has not assigned an active playback device yet. */
export function isNoActivePlaybackDevice(value: string | null | undefined): boolean {
  return value == null || value === '';
}

/**
 * True when this browser tab should drive local `<audio>` output and OS media session
 * (sync off, no active device yet, or this tab is the active device).
 */
export function isControllingLocalAudio(params: {
  isPlaybackSyncConnected: boolean;
  activeDeviceId: string | null;
  localPlaybackDeviceId: string;
}): boolean {
  const { isPlaybackSyncConnected, activeDeviceId, localPlaybackDeviceId } = params;
  return (
    !isPlaybackSyncConnected ||
    isNoActivePlaybackDevice(activeDeviceId) ||
    activeDeviceId === localPlaybackDeviceId
  );
}
