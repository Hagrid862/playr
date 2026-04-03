import { describe, expect, it } from 'vitest';
import { findEmitAck, findOnHandler } from './playback-sync.test-helpers';

describe('playback-sync.test-helpers', () => {
  describe('findOnHandler', () => {
    it('throws when event is missing', () => {
      expect(() => findOnHandler([], 'connect')).toThrow(`on('connect') not registered`);
    });
  });

  describe('findEmitAck', () => {
    it('throws when emit ack is missing', () => {
      expect(() => findEmitAck([], 'command:set-state')).toThrow(
        `emit('command:set-state', ..., ack) not found`,
      );
    });

    it('throws when emit exists without a callback', () => {
      expect(() => findEmitAck([['ping', {}]], 'ping')).toThrow(`emit('ping', ..., ack) not found`);
    });
  });
});
