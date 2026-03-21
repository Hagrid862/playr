import { customRenderHook } from '@repo/testing';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMediaQuery } from './use-media-query';

describe('useMediaQuery', () => {
  let addEventListenerMock: ReturnType<typeof vi.fn>;
  let removeEventListenerMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    addEventListenerMock = vi.fn();
    removeEventListenerMock = vi.fn();

    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          matches: query === '(min-width: 768px)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: addEventListenerMock,
          removeEventListener: removeEventListenerMock,
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial match result', () => {
    it('returns true if media query matches', () => {
      const { result } = customRenderHook(() => useMediaQuery('(min-width: 768px)'));
      expect(result.current).toBe(true);
    });

    it('returns false if media query does not match', () => {
      const { result } = customRenderHook(() => useMediaQuery('(min-width: 1024px)'));
      expect(result.current).toBe(false);
    });
  });

  describe('event subscription lifecycle', () => {
    it('subscribes and unsubscribes to matchMedia changes', () => {
      const { unmount } = customRenderHook(() => useMediaQuery('(min-width: 768px)'));

      expect(addEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));

      const listener = addEventListenerMock.mock.calls[0]?.[1] as EventListener | undefined;

      unmount();

      expect(listener).toBeDefined();
      expect(removeEventListenerMock).toHaveBeenCalledWith('change', listener);
    });
  });

  describe('server-side rendering', () => {
    it('returns false during server-side rendering', () => {
      function TestComponent() {
        const matches = useMediaQuery('(min-width: 768px)');
        return matches ? 'matches' : 'no match';
      }

      const html = renderToString(React.createElement(TestComponent));
      expect(html).toBe('no match');
    });
  });
});
