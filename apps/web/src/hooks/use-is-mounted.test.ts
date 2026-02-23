import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useIsMounted } from './use-is-mounted';

describe('useIsMounted', () => {
  it('should return true after mounting', () => {
    const { result } = renderHook(() => useIsMounted());
    expect(result.current).toBe(true);
  });

  it('should return false during server-side rendering', async () => {
    // Import dynamically since we are in JSDOM environment
    const { renderToString } = await import('react-dom/server');
    const React = await import('react');

    function TestComponent() {
      const isMounted = useIsMounted();
      return isMounted ? 'mounted' : 'not mounted';
    }

    const html = renderToString(React.createElement(TestComponent));
    expect(html).toBe('not mounted');
  });
});
