import { customRenderHook } from '@repo/testing/web';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIsMobile } from './use-mobile';

function createMatchMediaList(query: string): MediaQueryList {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;
}

describe('useIsMobile', () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => createMatchMediaList(query));
  });

  afterEach(() => {
    window.innerWidth = originalInnerWidth;
    vi.restoreAllMocks();
  });

  describe('viewport width', () => {
    it('returns false by default on desktop', () => {
      window.innerWidth = 1024;
      const { result } = customRenderHook(() => useIsMobile());
      expect(result.current).toBe(false);
    });

    it('returns true on mobile width', () => {
      window.innerWidth = 500;
      const { result } = customRenderHook(() => useIsMobile());
      expect(result.current).toBe(true);
    });
  });

  describe('matchMedia change events', () => {
    it('updates value when window resizes (via matchMedia event)', () => {
      let changeHandler: () => void = () => {};

      vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((event, handler) => {
          if (event === 'change') changeHandler = handler as () => void;
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as typeof window.matchMedia;

      window.innerWidth = 1024;
      const { result } = customRenderHook(() => useIsMobile());
      expect(result.current).toBe(false);

      act(() => {
        window.innerWidth = 500;
        changeHandler();
      });

      expect(result.current).toBe(true);
    });
  });
});
