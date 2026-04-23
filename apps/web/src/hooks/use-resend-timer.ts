import { useState, useEffect, useCallback } from 'react';

/**
 * A hook that provides a persistent countdown timer.
 * The timer value is stored in localStorage, making it robust against page refreshes and tab closures.
 * It also syncs across multiple tabs.
 */
export const useResendTimer = (key: string, cooldownSeconds: number = 60) => {
  const getRemainingTime = useCallback(() => {
    if (typeof window === 'undefined') return 0;
    let expiry: string | null;
    try {
      expiry = window.localStorage.getItem(key);
    } catch {
      return 0;
    }
    if (!expiry) return 0;

    const remaining = Math.ceil((Number(expiry) - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  }, [key]);

  const [timeLeft, setTimeLeft] = useState<number>(() => getRemainingTime());

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getRemainingTime();
      setTimeLeft(remaining);
    }, 1000);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        setTimeLeft(getRemainingTime());
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [getRemainingTime, key]);

  const startTimer = useCallback(() => {
    const expiry = Date.now() + cooldownSeconds * 1000;
    try {
      window.localStorage.setItem(key, String(expiry));
    } catch {
      // Keep the current tab's countdown even when persistence is unavailable.
    }
    setTimeLeft(cooldownSeconds);
  }, [key, cooldownSeconds]);

  const clearTimer = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore unavailable storage.
    }
    setTimeLeft(0);
  }, [key]);

  return {
    timeLeft,
    startTimer,
    clearTimer,
    isCounting: timeLeft > 0,
  };
};