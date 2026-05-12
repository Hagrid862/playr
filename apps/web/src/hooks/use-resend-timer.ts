import { useState, useEffect, useCallback } from 'react';
import {
  clearResendCooldownKey,
  getResendCooldownSecondsRemaining,
  persistResendCooldownExpiry,
  subscribeResendCooldownStorage,
} from './resend-cooldown-storage';

/**
 * A hook that provides a persistent countdown timer.
 * The timer value is stored in localStorage, making it robust against page refreshes and tab closures.
 * It also syncs across multiple tabs.
 */
export const useResendTimer = (key: string, cooldownSeconds: number = 60) => {
  const getRemainingTime = useCallback(
    () => getResendCooldownSecondsRemaining(key, globalThis.window),
    [key],
  );

  const [timeLeft, setTimeLeft] = useState<number>(() =>
    getResendCooldownSecondsRemaining(key, globalThis.window),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getRemainingTime();
      setTimeLeft(remaining);
    }, 1000);

    const unsubscribeStorage = subscribeResendCooldownStorage(globalThis.window, key, () => {
      setTimeLeft(getRemainingTime());
    });

    return () => {
      clearInterval(interval);
      unsubscribeStorage();
    };
  }, [getRemainingTime, key]);

  const startTimer = useCallback(() => {
    const win = globalThis.window;
    const expiry = Date.now() + cooldownSeconds * 1000;
    persistResendCooldownExpiry(win, key, expiry);
    setTimeLeft(cooldownSeconds);
  }, [key, cooldownSeconds]);

  const clearTimer = useCallback(() => {
    clearResendCooldownKey(globalThis.window, key);
    setTimeLeft(0);
  }, [key]);

  return {
    timeLeft,
    startTimer,
    clearTimer,
    isCounting: timeLeft > 0,
  };
};
