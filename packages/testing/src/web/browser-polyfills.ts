import { vi } from 'vitest';

/**
 * Sets up common browser API mocks for jsdom tests.
 * Call once in setupFiles (e.g. setupTests.ts).
 */
export function setupBrowserPolyfills(): void {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();

  class ResizeObserverMock implements ResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);

  if (!('DataTransfer' in globalThis)) {
    class DataTransferPolyfill {
      private _files: File[] = [];

      get items() {
        const files = this._files;
        return {
          get length() {
            return files.length;
          },
          add(file: File) {
            files.push(file);
          },
        };
      }

      get files(): FileList {
        const list = this._files;
        return Object.assign([...list], {
          item: (i: number) => list[i] ?? null,
          length: list.length,
        }) as FileList;
      }
    }
    vi.stubGlobal('DataTransfer', DataTransferPolyfill);
  }

  if (typeof window.PointerEvent === 'undefined') {
    class MockPointerEvent extends MouseEvent {
      pointerId = 0;
      width = 0;
      height = 0;
      pressure = 0;
      tangentialPressure = 0;
      tiltX = 0;
      tiltY = 0;
      twist = 0;
      altitudeAngle = 0;
      azimuthAngle = 0;
      pointerType = 'mouse';
      isPrimary = false;
      persistentId = 0;

      constructor(type: string, props: PointerEventInit = {}) {
        super(type, props);
        Object.assign(this, props);
      }

      getCoalescedEvents(): PointerEvent[] {
        return [];
      }

      getPredictedEvents(): PointerEvent[] {
        return [];
      }
    }
    vi.stubGlobal('PointerEvent', MockPointerEvent);
  }

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
