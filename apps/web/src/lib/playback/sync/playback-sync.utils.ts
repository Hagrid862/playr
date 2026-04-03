import type { PlaybackState } from '@repo/contracts';

export function isVersionConflict(errorMessage: string, code?: string): boolean {
  return (
    code === 'CONFLICT' ||
    errorMessage.includes('version mismatch') ||
    errorMessage.includes('Expected version mismatch')
  );
}

export function clampCurrentTime(currentTime: number, duration: number): number {
  return Math.min(Math.max(0, Math.floor(currentTime)), duration);
}

export function parseSyncAckError(result: unknown): { message: string; code?: string } | null {
  if (!result || typeof result !== 'object') return null;
  if (!('error' in result) || !result.error) return null;
  const message = String(result.error);
  let code: string | undefined;
  if ('code' in result) {
    const raw = result.code;
    if (typeof raw === 'string') code = raw;
  }
  return { message, code };
}

/** True when a socket ack is a successful `PlaybackState` payload (not an error envelope). */
export function isPlaybackStateSyncAck(result: unknown): result is PlaybackState {
  if (result === null || typeof result !== 'object') return false;
  if ('error' in result && result.error) return false;
  if (!('version' in result)) return false;
  return typeof result.version === 'number';
}
