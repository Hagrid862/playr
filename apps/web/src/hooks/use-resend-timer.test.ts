import { renderHook, act } from '@testing-library/react';
import { useResendTimer } from './use-resend-timer';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('useResendTimer', () => {
  const KEY = 'test-timer';

  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals(); // Clean up any global stubs
  });

  it('treats expired localStorage timestamp as 0 remaining', () => {
    window.localStorage.setItem(KEY, String(Date.now() - 60_000));
    const { result } = renderHook(() => useResendTimer(KEY));
    expect(result.current.timeLeft).toBe(0);
    expect(result.current.isCounting).toBe(false);
  });

  it('should initialize with 0 if no value in localStorage', () => {
    const { result } = renderHook(() => useResendTimer(KEY));
    expect(result.current.timeLeft).toBe(0);
    expect(result.current.isCounting).toBe(false);
  });

  it('should start timer and store in localStorage', () => {
    const { result } = renderHook(() => useResendTimer(KEY, 60));

    act(() => {
      result.current.startTimer();
    });

    expect(result.current.timeLeft).toBe(60);
    expect(result.current.isCounting).toBe(true);
    expect(window.localStorage.getItem(KEY)).toBeDefined();
  });

  it('should countdown every second', () => {
    const { result } = renderHook(() => useResendTimer(KEY, 60));

    act(() => {
      result.current.startTimer();
    });

    expect(result.current.timeLeft).toBe(60);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.timeLeft).toBe(59);

    act(() => {
      vi.advanceTimersByTime(58000);
    });

    expect(result.current.timeLeft).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.timeLeft).toBe(0);
    expect(result.current.isCounting).toBe(false);
  });

  it('should clear timer', () => {
    const { result } = renderHook(() => useResendTimer(KEY, 60));

    act(() => {
      result.current.startTimer();
    });

    expect(result.current.timeLeft).toBe(60);

    act(() => {
      result.current.clearTimer();
    });

    expect(result.current.timeLeft).toBe(0);
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('should initialize with remaining time from localStorage', () => {
    const expiry = Date.now() + 30 * 1000;
    window.localStorage.setItem(KEY, String(expiry));

    const { result } = renderHook(() => useResendTimer(KEY));
    expect(result.current.timeLeft).toBe(30);
    expect(result.current.isCounting).toBe(true);
  });

  it('should sync when localStorage changes from another tab', () => {
    const { result } = renderHook(() => useResendTimer(KEY));
    expect(result.current.timeLeft).toBe(0);

    const expiry = Date.now() + 45 * 1000;

    act(() => {
      window.localStorage.setItem(KEY, String(expiry));
      // Manually trigger storage event as it doesn't fire in the same window
      window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: String(expiry) }));
    });

    expect(result.current.timeLeft).toBe(45);
  });

  it('should return 0 for timeLeft if localStorage throws an error', () => {
    const originalLocalStorage = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      get: () => {
        throw new Error('localStorage is not available');
      },
    });

    const { result } = renderHook(() => useResendTimer(KEY));
    expect(result.current.timeLeft).toBe(0);
    expect(result.current.isCounting).toBe(false);

    Object.defineProperty(window, 'localStorage', {
      get: () => originalLocalStorage,
    });
  });

  it('ignores storage events for other keys', () => {
    const { result } = renderHook(() => useResendTimer(KEY, 60));
    expect(result.current.timeLeft).toBe(0);

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'unrelated-key',
          newValue: String(Date.now() + 60_000),
        }),
      );
    });

    expect(result.current.timeLeft).toBe(0);
  });

  it('returns 0 when localStorage.getItem throws inside try', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useResendTimer(KEY));
    expect(result.current.timeLeft).toBe(0);
    getItem.mockRestore();
  });

  it('startTimer still sets countdown when setItem throws', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const { result } = renderHook(() => useResendTimer(KEY, 25));
    act(() => {
      result.current.startTimer();
    });
    expect(result.current.timeLeft).toBe(25);
    expect(result.current.isCounting).toBe(true);
    setItem.mockRestore();
  });

  it('clearTimer clears state when removeItem throws', () => {
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useResendTimer(KEY, 10));
    act(() => {
      result.current.startTimer();
    });
    expect(result.current.timeLeft).toBe(10);
    act(() => {
      result.current.clearTimer();
    });
    expect(result.current.timeLeft).toBe(0);
    removeItem.mockRestore();
  });
});
