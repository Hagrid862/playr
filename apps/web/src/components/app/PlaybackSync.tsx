import { connectPlaybackSync, disconnectPlaybackSync } from '@/lib/playback/sync/playback-sync';
import { useAuthStore } from '@/stores/auth.store';
import { useEffect } from 'react';

/**
 * Keeps Socket.IO playback in sync while the user is authenticated.
 * Renders nothing; mount once under the authenticated app layout.
 */
export function PlaybackSync() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  useEffect(() => {
    if (!hasHydrated || !accessToken) {
      disconnectPlaybackSync();
      return;
    }

    connectPlaybackSync(accessToken);
    return () => disconnectPlaybackSync();
  }, [hasHydrated, accessToken]);

  return null;
}
