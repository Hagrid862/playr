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
 * PointerEvent Mock
 * JSDOM 27 provides native PointerEvent support. We only provide a fallback
 * implementation for environments where it might be missing.
 */
if (typeof window.PointerEvent === 'undefined') {
  class MockPointerEvent extends MouseEvent implements Partial<PointerEvent> {
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

  vi.stubGlobal('PointerEvent', MockPointerEvent as unknown as typeof PointerEvent);
}
