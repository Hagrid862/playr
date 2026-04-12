import { describe, expect, it, vi } from 'vitest';
import { createPlaybackSocketMock, findEmitAck, findOnHandler } from './playback-sync.test-helpers';

describe('findOnHandler', () => {
  it('throws when no matching on() call exists', () => {
    expect(() => findOnHandler([], 'connect')).toThrow(`on('connect') not registered`);
  });
});

describe('findEmitAck', () => {
  it('throws when no matching emit(..., ack) exists', () => {
    expect(() => findEmitAck([], 'query:get-state')).toThrow(
      `emit('query:get-state', ..., ack) not found`,
    );
  });
});

describe('createPlaybackSocketMock', () => {
  it('once only registers disconnect handlers', () => {
    const mock = createPlaybackSocketMock();
    const connectHandler = vi.fn();
    mock.once('connect', connectHandler);
    mock.simulateDisconnect();
    expect(connectHandler).not.toHaveBeenCalled();
  });

  it('off removes a registered disconnect handler', () => {
    const mock = createPlaybackSocketMock();
    const handler = vi.fn();
    mock.once('disconnect', handler);
    mock.off('disconnect', handler);
    mock.simulateDisconnect();
    expect(handler).not.toHaveBeenCalled();
  });

  it('off no-ops for non-disconnect events', () => {
    const mock = createPlaybackSocketMock();
    const handler = vi.fn();
    mock.once('disconnect', handler);
    mock.off('connect', handler);
    mock.simulateDisconnect();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('off no-ops when handler argument is omitted', () => {
    const mock = createPlaybackSocketMock();
    const handler = vi.fn();
    mock.once('disconnect', handler);
    mock.off('disconnect');
    mock.simulateDisconnect();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('off no-ops when removing an unknown handler', () => {
    const mock = createPlaybackSocketMock();
    const registered = vi.fn();
    mock.once('disconnect', registered);
    mock.off('disconnect', vi.fn());
    mock.simulateDisconnect();
    expect(registered).toHaveBeenCalledTimes(1);
  });
});
