import type { Socket } from 'socket.io-client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emitWithAck, PlaybackSocketAckTimeoutError } from './playback-sync.emit-with-ack';

describe('emitWithAck', () => {
  afterEach(() => {
    vi.useRealTimers();
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
