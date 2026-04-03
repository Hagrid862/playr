import { customRenderHook } from '@repo/testing/web';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { useIsMounted } from './use-is-mounted';

describe('useIsMounted', () => {
  describe('client rendering', () => {
    it('returns true after mounting', () => {
      const { result } = customRenderHook(() => useIsMounted());
      expect(result.current).toBe(true);
    });
  });

  describe('server rendering', () => {
    it('returns false during server-side rendering', () => {
      function TestComponent() {
        const isMounted = useIsMounted();
        return isMounted ? 'mounted' : 'not mounted';
      }

      const html = renderToString(React.createElement(TestComponent));
      expect(html).toBe('not mounted');
    });
  });
});
