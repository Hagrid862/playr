import type { Env } from '@/common/config/env.schema';
import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlaybackState } from '@repo/contracts';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import Redis from 'ioredis';
import { describe, expect, it } from 'vitest';
import { playbackStateFixture } from '../../test-utils/playback-state.fixture';
import { GetPlaybackStateQuery } from '../impl/get-playback-state.query';
import { GetPlaybackStateHandler } from './get-playback-state.handler';

describe('GetPlaybackStateHandler', () => {
  const userId = 'user-1';
  const state: PlaybackState = playbackStateFixture({
    userId,
    activeDeviceId: 'device-1',
    trackData: {
      id: 'track-1',
      trackId: 't1',
      title: 'Track',
      artists: ['Artist'],
      albumArt: null,
      albumName: 'Album',
      albumId: 'album-1',
      duration: 120,
      explicit: false,
    },
    queue: [],
    currentTime: 10,
    volume: 0.5,
    version: 1,
    isPlaying: true,
  });

  const staleAfterMs = 30 * 24 * 60 * 60 * 1000;

  function createHandler(redis: DeepMocked<Redis>) {
    const config = createMock<ConfigService<Env, true>>();
    config.get.mockImplementation((key: string) => {
      if (key === 'PLAYBACK_STATE_STALE_AFTER_MS') return staleAfterMs;
      return undefined as never;
    });
    return new GetPlaybackStateHandler(redis, config);
  }

  it('returns playback state when it exists', async () => {
    const redis = createMock<Redis>();
    const handler = createHandler(redis);
    const query = new GetPlaybackStateQuery(userId);

    redis.get.mockResolvedValue(
      JSON.stringify({
        ...state,
        updatedAt: new Date().toISOString(),
      }),
    );

    const result = await handler.execute(query);
    expect(result).not.toBeNull();
    expect(result?.userId).toBe(userId);
    expect(redis.get).toHaveBeenCalledWith(`state:${userId}`);
  });

  it('returns null when state does not exist', async () => {
    const redis = createMock<Redis>();
    const handler = createHandler(redis);
    const query = new GetPlaybackStateQuery(userId);

    redis.get.mockResolvedValue(null);

    const result = await handler.execute(query);
    expect(result).toBeNull();
  });

  it('returns null and deletes key when updatedAt is older than stale threshold', async () => {
    const redis = createMock<Redis>();
    const handler = createHandler(redis);
    const query = new GetPlaybackStateQuery(userId);

    const old = new Date(Date.now() - staleAfterMs - 60_000).toISOString();
    redis.get.mockResolvedValue(JSON.stringify({ ...state, updatedAt: old }));

    const result = await handler.execute(query);
    expect(result).toBeNull();
    expect(redis.del).toHaveBeenCalledWith(`state:${userId}`);
  });

  it('throws InternalServerErrorException on invalid JSON', async () => {
    const redis = createMock<Redis>();
    const handler = createHandler(redis);
    const query = new GetPlaybackStateQuery(userId);

    redis.get.mockResolvedValue('invalid-json');

    await expect(handler.execute(query)).rejects.toThrow(InternalServerErrorException);
  });

  it('throws InternalServerErrorException on Zod validation failure', async () => {
    const redis = createMock<Redis>();
    const handler = createHandler(redis);
    const query = new GetPlaybackStateQuery(userId);

    redis.get.mockResolvedValue(JSON.stringify({ ...state, trackData: null }));

    await expect(handler.execute(query)).rejects.toThrow(InternalServerErrorException);
  });
});
