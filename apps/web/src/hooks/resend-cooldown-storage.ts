/**
 * Pure helpers for resend cooldown persistence (unit-tested without React).
 */
export function getResendCooldownSecondsRemaining(
  key: string,
  win: Window | null | undefined,
  nowMs: number = Date.now(),
): number {
  if (win == null) return 0;
  let expiry: string | null;
  try {
    expiry = win.localStorage.getItem(key);
  } catch {
    return 0;
  }
  if (!expiry) return 0;

  const remaining = Math.ceil((Number(expiry) - nowMs) / 1000);
  return remaining > 0 ? remaining : 0;
}

export function persistResendCooldownExpiry(
  win: Window | null | undefined,
  key: string,
  expiryTimestampMs: number,
): void {
  if (win == null) return;
  try {
    win.localStorage.setItem(key, String(expiryTimestampMs));
  } catch {
    // Keep countdown in the hook even when persistence is unavailable.
  }
}

export function clearResendCooldownKey(win: Window | null | undefined, key: string): void {
  if (win == null) return;
  try {
    win.localStorage.removeItem(key);
  } catch {
    // Ignore unavailable storage.
  }
}

/** Subscribe to cross-tab `storage` updates for `storageKey`. No-op when `win` is missing (SSR / tests). */
export function subscribeResendCooldownStorage(
  win: Window | null | undefined,
  storageKey: string,
  onKeyChange: () => void,
): () => void {
  if (win == null) {
    return () => {};
  }
  const handler = (e: StorageEvent) => {
    if (e.key === storageKey) onKeyChange();
  };
  win.addEventListener('storage', handler);
  return () => {
    win.removeEventListener('storage', handler);
  };
}
