import type { PlaybackState } from '@repo/contracts';

const DEVICE_ID_KEY = 'playr_playback_device_id';

/** Exported for unit tests. Desktop only; call after ruling out mobile. */
export function detectDesktopBrowserFromUserAgent(ua: string): string {
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Brave/')) return 'Brave';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Chrome/') || ua.includes('Chromium/')) return 'Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome') && !ua.includes('Chromium')) {
    return 'Safari';
  }
  return 'Web Player (unknown)';
}

function getDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Web Player (unknown)';
  const ua = navigator.userAgent;
  if (ua.includes('Mobile')) return 'Web Player (Mobile)';
  return detectDesktopBrowserFromUserAgent(ua);
}

function getDeviceIcon(): PlaybackState['deviceIcon'] {
  if (typeof navigator === 'undefined') return 'desktop';
  return navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop';
}

export function getOrCreatePlaybackDeviceId(): string {
  if (typeof window === 'undefined') return 'server-render';

  const existing = window.sessionStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const created = crypto.randomUUID();
  window.sessionStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

export function getLocalPlaybackDeviceMetadata() {
  return {
    playbackDeviceId: getOrCreatePlaybackDeviceId(),
    deviceName: getDeviceName(),
    deviceIcon: getDeviceIcon(),
  };
}
