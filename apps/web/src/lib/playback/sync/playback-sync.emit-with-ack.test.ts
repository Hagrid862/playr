import type { Socket } from 'socket.io-client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  emitWithAck,
  PlaybackSocketAckTimeoutError,
  PlaybackSocketDisconnectedError,
} from './playback-sync.emit-with-ack';

describe('emitWithAck', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves when ack arrives before timeout', async () => {
    const socket = {
      once: vi.fn(),
      off: vi.fn(),
      emit: vi.fn((_e: string, _p: object, cb: (r: { ok: boolean }) => void) => {
        cb({ ok: true });
      }),
    } as unknown as Socket;

    await expect(emitWithAck(socket, 'evt', {}, 10_000)).resolves.toEqual({ ok: true });
    expect(socket.off).toHaveBeenCalledWith('disconnect', expect.any(Function));
  });

  it('rejects with disconnect when socket disconnects before ack', async () => {
    let disconnectHandler: (() => void) | undefined;
    const socket = {
      once: vi.fn((event: string, handler: () => void) => {
        if (event === 'disconnect') disconnectHandler = handler;
      }),
      off: vi.fn(),
      emit: vi.fn(() => {
        queueMicrotask(() => disconnectHandler?.());
      }),
    } as unknown as Socket;

    await expect(emitWithAck(socket, 'evt', {}, 10_000)).rejects.toBeInstanceOf(
      PlaybackSocketDisconnectedError,
    );
    expect(socket.off).toHaveBeenCalled();
  });

  it('cleans up when setTimeout returns no handle (timer stays undefined)', async () => {
    const originalSetTimeout = globalThis.setTimeout;
    vi.stubGlobal('setTimeout', () => undefined as unknown as ReturnType<typeof setTimeout>);

    const socket = {
      once: vi.fn(),
      off: vi.fn(),
      emit: vi.fn((_e: string, _p: object, cb: (r: { ok: boolean }) => void) => {
        cb({ ok: true });
      }),
    } as unknown as Socket;

    try {
      await expect(emitWithAck(socket, 'evt', {}, 10_000)).resolves.toEqual({ ok: true });
      expect(socket.off).toHaveBeenCalled();
    } finally {
      vi.stubGlobal('setTimeout', originalSetTimeout);
    }
  });

  it('ignores late ack after timeout (single settle)', async () => {
    vi.useFakeTimers();

    let storedAck: ((r: unknown) => void) | undefined;
    const socket = {
      once: vi.fn(),
      off: vi.fn(),
      emit: vi.fn((_e: string, _p: object, cb: (r: unknown) => void) => {
        storedAck = cb;
      }),
    } as unknown as Socket;

    const p = emitWithAck(socket, 'test-event', {}, 1000);
    const rejectsAssertion = expect(p).rejects.toBeInstanceOf(PlaybackSocketAckTimeoutError);
    await vi.advanceTimersByTimeAsync(1000);
    await rejectsAssertion;

    expect(storedAck).toBeDefined();
    storedAck!({ shouldNotResolve: true });

    expect(socket.off).toHaveBeenCalled();
  });
});
