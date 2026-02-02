import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock scrollIntoView for Radix UI
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();

// Mock PointerEvent if needed (JSDOM doesn't support it fully)
// Mock PointerEvent if needed (JSDOM doesn't support it fully)
class MockPointerEvent extends MouseEvent implements PointerEvent {
  pointerId = 0;
  width = 0;
  height = 0;
  pressure = 0;
  tangentialPressure = 0;
  tiltX = 0;
  tiltY = 0;
  twist = 0;
  aaditude = 0; // Typo in native types? No, altitudeAngle if newer.
  altitudeAngle = 0;
  azimuthAngle = 0;
  pointerType = 'mouse';
  isPrimary = false;
  getCoalescedEvents = () => [];
  getPredictedEvents = () => [];

  constructor(type: string, props?: PointerEventInit) {
    super(type, props);
    if (props) {
      if (props.pointerId) this.pointerId = props.pointerId;
      if (props.width) this.width = props.width;
      if (props.height) this.height = props.height;
      if (props.pressure) this.pressure = props.pressure;
      if (props.tangentialPressure) this.tangentialPressure = props.tangentialPressure;
      if (props.tiltX) this.tiltX = props.tiltX;
      if (props.tiltY) this.tiltY = props.tiltY;
      if (props.twist) this.twist = props.twist;
      if (props.altitudeAngle) this.altitudeAngle = props.altitudeAngle;
      if (props.azimuthAngle) this.azimuthAngle = props.azimuthAngle;
      if (props.pointerType) this.pointerType = props.pointerType;
      if (props.isPrimary) this.isPrimary = props.isPrimary;
    }
  }
}
// Assigning to window property with different constructor signature (subset)
window.PointerEvent = MockPointerEvent;

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
