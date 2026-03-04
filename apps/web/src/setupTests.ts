import '@testing-library/jest-dom';
import { vi } from 'vitest';

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();

/**
 * ResizeObserver Mock
 * Essential for UI libraries like Radix UI and Floating UI that handle
 * positioning and responsiveness.
 */
class ResizeObserverMock implements ResizeObserver {
  constructor() {}
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

/**
 * DataTransfer Polyfill
 * JSDOM does not provide DataTransfer. Required for drag-and-drop tests.
 */
if (typeof globalThis.DataTransfer === 'undefined') {
  class DataTransferPolyfill {
    private _files: File[] = [];

    get items() {
      const self = this;
      return {
        get length() {
          return self._files.length;
        },
        add(file: File) {
          self._files.push(file);
        },
      };
    }

    get files(): FileList {
      const list = this._files;
      const fileList = Object.assign([...list], {
        item: (i: number) => list[i] ?? null,
        length: list.length,
      }) as FileList;
      return fileList;
    }
  }
  vi.stubGlobal('DataTransfer', DataTransferPolyfill);
}

/**
 * PointerEvent Mock
 * JSDOM 27 provides native PointerEvent support. We only provide a fallback
 * implementation for environments where it might be missing.
 */
if (typeof window.PointerEvent === 'undefined') {
  class MockPointerEvent extends MouseEvent implements PointerEvent {
    public readonly pointerId: number = 0;
    public readonly width: number = 0;
    public readonly height: number = 0;
    public readonly pressure: number = 0;
    public readonly tangentialPressure: number = 0;
    public readonly tiltX: number = 0;
    public readonly tiltY: number = 0;
    public readonly twist: number = 0;
    public readonly altitudeAngle: number = 0;
    public readonly azimuthAngle: number = 0;
    public readonly pointerType: string = 'mouse';
    public readonly isPrimary: boolean = false;
    public readonly persistentId: number = 0;

    constructor(type: string, props: PointerEventInit = {}) {
      super(type, props);
      Object.assign(this, props);
    }

    public getCoalescedEvents(): PointerEvent[] {
      return [];
    }

    public getPredictedEvents(): PointerEvent[] {
      return [];
    }
  }

  vi.stubGlobal('PointerEvent', MockPointerEvent);
}

/**
 * matchMedia Mock
 * Essential for components and hooks that rely on media queries (e.g., useMediaQuery).
 */
Object.defineProperty(window, 'matchMedia', {
  configurable: true,
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
