import type { PlaybackState } from '@repo/contracts';

const DEVICE_ID_KEY = 'playr_playback_device_id';

function getDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Web Player';
  return navigator.userAgent.includes('Mobile') ? 'Web Player (Mobile)' : 'Web Player';
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
