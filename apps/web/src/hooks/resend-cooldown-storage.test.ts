import { describe, expect, it, vi } from 'vitest';
import {
  clearResendCooldownKey,
  getResendCooldownSecondsRemaining,
  persistResendCooldownExpiry,
  subscribeResendCooldownStorage,
} from './resend-cooldown-storage';

const KEY = 'k';

function fakeWindow(store: Record<string, string>) {
  return {
    localStorage: {
      getItem: (k: string) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    },
  } as unknown as Window;
}

describe('resend-cooldown-storage', () => {
  it('getResendCooldownSecondsRemaining returns 0 when window is null', () => {
    expect(getResendCooldownSecondsRemaining(KEY, null)).toBe(0);
    expect(getResendCooldownSecondsRemaining(KEY, undefined)).toBe(0);
  });

  it('getResendCooldownSecondsRemaining returns 0 when getItem throws', () => {
    const win = {
      localStorage: {
        getItem: () => {
          throw new Error('denied');
        },
      },
    } as unknown as Window;
    expect(getResendCooldownSecondsRemaining(KEY, win)).toBe(0);
  });

  it('getResendCooldownSecondsRemaining returns 0 for missing or expired key', () => {
    const store: Record<string, string> = {};
    const win = fakeWindow(store);
    expect(getResendCooldownSecondsRemaining(KEY, win, 1_000)).toBe(0);

    store[KEY] = String(500);
    expect(getResendCooldownSecondsRemaining(KEY, win, 1_000)).toBe(0);
  });

  it('getResendCooldownSecondsRemaining returns rounded seconds until expiry', () => {
    const store: Record<string, string> = {};
    const win = fakeWindow(store);
    const now = 10_000;
    store[KEY] = String(now + 2_500);
    expect(getResendCooldownSecondsRemaining(KEY, win, now)).toBe(3);
  });

  it('persistResendCooldownExpiry is a no-op when window is null', () => {
    expect(() => persistResendCooldownExpiry(null, KEY, Date.now())).not.toThrow();
  });

  it('persistResendCooldownExpiry swallows setItem errors', () => {
    const win = {
      localStorage: {
        setItem: () => {
          throw new Error('quota');
        },
      },
    } as unknown as Window;
    expect(() => persistResendCooldownExpiry(win, KEY, 1)).not.toThrow();
  });

  it('clearResendCooldownKey is a no-op when window is null', () => {
    expect(() => clearResendCooldownKey(null, KEY)).not.toThrow();
  });

  it('clearResendCooldownKey swallows removeItem errors', () => {
    const win = {
      localStorage: {
        removeItem: () => {
          throw new Error('denied');
        },
      },
    } as unknown as Window;
    expect(() => clearResendCooldownKey(win, KEY)).not.toThrow();
  });

  it('persist and clear round-trip on fake storage', () => {
    const store: Record<string, string> = {};
    const win = fakeWindow(store);
    persistResendCooldownExpiry(win, KEY, 99);
    expect(store[KEY]).toBe('99');
    clearResendCooldownKey(win, KEY);
    expect(store[KEY]).toBeUndefined();
  });

  describe('subscribeResendCooldownStorage', () => {
    it('returns a no-op unsubscribe when window is null or undefined', () => {
      const onKeyChange = vi.fn();
      expect(() => subscribeResendCooldownStorage(null, KEY, onKeyChange)()).not.toThrow();
      expect(() => subscribeResendCooldownStorage(undefined, KEY, onKeyChange)()).not.toThrow();
      expect(onKeyChange).not.toHaveBeenCalled();
    });

    it('invokes callback for matching key and ignores other keys', () => {
      const onKeyChange = vi.fn();
      const listeners = new Map<string, (e: StorageEvent) => void>();
      const win = {
        addEventListener: (type: string, fn: EventListener) => {
          if (type === 'storage') listeners.set('storage', fn as (e: StorageEvent) => void);
        },
        removeEventListener: (type: string, fn: EventListener) => {
          if (type === 'storage' && listeners.get('storage') === fn) listeners.delete('storage');
        },
      } as unknown as Window;

      const unsub = subscribeResendCooldownStorage(win, KEY, onKeyChange);

      listeners.get('storage')?.(new StorageEvent('storage', { key: 'other', newValue: '1' }));
      expect(onKeyChange).not.toHaveBeenCalled();

      listeners.get('storage')?.(new StorageEvent('storage', { key: KEY, newValue: '1' }));
      expect(onKeyChange).toHaveBeenCalledTimes(1);

      unsub();
      expect(listeners.size).toBe(0);
    });
  });
});
