import { renderHook } from '@testing-library/react';
 import React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, MockInstance, vi } from 'vitest';
import { useMediaQuery } from './use-media-query';

describe('useMediaQuery', () => {
  let addEventListenerMock: MockInstance;
  let removeEventListenerMock: MockInstance;

  beforeEach(() => {
    addEventListenerMock = vi.fn();
    removeEventListenerMock = vi.fn();

    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          matches: query === '(min-width: 768px)',
          media: query,
          onchange: null,
          addListener: vi.fn(), // Deprecated
          removeListener: vi.fn(), // Deprecated
          addEventListener: addEventListenerMock,
          removeEventListener: removeEventListenerMock,
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return true if media query matches', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('should return false if media query does not match', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(false);
  });

  it('should subscribe and unsubscribe to matchMedia changes', () => {
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));

    expect(addEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));

    const listener = addEventListenerMock.mock.calls[0]?.[1] as EventListener | undefined;

    unmount();

    expect(listener).toBeDefined();
    expect(removeEventListenerMock).toHaveBeenCalledWith('change', listener);
  });

  it('should return false during server-side rendering', () => {
    function TestComponent() {
      const matches = useMediaQuery('(min-width: 768px)');
      return matches ? 'matches' : 'no match';
    }

    const html = renderToString(React.createElement(TestComponent));
    expect(html).toBe('no match');
  });
});
