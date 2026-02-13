import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIsMobile } from './use-mobile';

describe('useIsMobile', () => {
  const originalInnerWidth = window.innerWidth;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // Deprecated
        removeListener: vi.fn(), // Deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    window.innerWidth = originalInnerWidth;
    window.matchMedia = originalMatchMedia;
  });

  it('should return false by default on desktop', () => {
    window.innerWidth = 1024;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('should return true on mobile width', () => {
    window.innerWidth = 500;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('should update value when window resizes (via matchMedia event)', () => {
    let changeHandler: () => void = () => {};

    // Mock matchMedia to capture the event listener
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn((event, handler) => {
        if (event === 'change') changeHandler = handler;
      }),
      removeEventListener: vi.fn(),
    }));

    window.innerWidth = 1024;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Simulate window resize to mobile
    act(() => {
      window.innerWidth = 500;
      changeHandler();
    });

    expect(result.current).toBe(true);
  });
});
