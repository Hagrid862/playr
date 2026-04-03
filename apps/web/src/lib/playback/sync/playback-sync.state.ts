import type { Socket } from 'socket.io-client';

/** Intent only: body is built from the live store in `flushWriteQueue` to avoid stale snapshots after server hydrate. */
export type PendingFullStateIntent = { kind: 'full-state'; claimActiveDevice: boolean };

/** Lightweight play/pause sync when no full snapshot is already queued. */
export type PendingPlayingStateIntent = { kind: 'playing-state'; claimActiveDevice: boolean };

let socket: Socket | null = null;

/** True while a `command:set-state` or `command:set-playing-state` round-trip is in flight. */
let writeInFlight = false;

let pendingSetStateWrite: PendingFullStateIntent | null = null;

let pendingPlayingWrite: PendingPlayingStateIntent | null = null;

let flushMicrotaskScheduled = false;

export function getSocket(): Socket | null {
  return socket;
}

export function setSocket(next: Socket | null): void {
  socket = next;
}

export function isPlaybackSocketConnected(): boolean {
  return Boolean(socket?.connected);
}

export function getWriteInFlight(): boolean {
  return writeInFlight;
}

export function setWriteInFlight(value: boolean): void {
  writeInFlight = value;
}

export function getPendingSetStateWrite(): PendingFullStateIntent | null {
  return pendingSetStateWrite;
}

export function setPendingSetStateWrite(value: PendingFullStateIntent | null): void {
  pendingSetStateWrite = value;
}

export function getPendingPlayingWrite(): PendingPlayingStateIntent | null {
  return pendingPlayingWrite;
}

export function setPendingPlayingWrite(value: PendingPlayingStateIntent | null): void {
  pendingPlayingWrite = value;
}

export function getFlushMicrotaskScheduled(): boolean {
  return flushMicrotaskScheduled;
}

export function setFlushMicrotaskScheduled(value: boolean): void {
  flushMicrotaskScheduled = value;
}

export function resetPlaybackSyncModuleState(): void {
  socket = null;
  writeInFlight = false;
  pendingSetStateWrite = null;
  pendingPlayingWrite = null;
  flushMicrotaskScheduled = false;
}
