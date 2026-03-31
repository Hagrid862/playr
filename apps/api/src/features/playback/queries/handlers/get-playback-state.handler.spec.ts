import { InternalServerErrorException } from '@nestjs/common';
import { PlaybackState } from '@repo/contracts';
import { createMock } from '@repo/testing/nestjs';
import Redis from 'ioredis';
import { describe, expect, it } from 'vitest';
import { GetPlaybackStateQuery } from '../impl/get-playback-state.query';
import { GetPlaybackStateHandler } from './get-playback-state.handler';

describe('GetPlaybackStateHandler', () => {
  const userId = 'user-1';
  const state: PlaybackState = {
    userId,
    sessionId: 'session-1',
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
    repeatMode: 'off',
    shuffle: false,
    favorited: 'not-set',
    inLibrary: false,
    version: 1,
    updatedAt: new Date().toISOString(),
    deviceName: 'Web',
    deviceIcon: 'desktop',
    isPlaying: true,
  };

  it('returns playback state when it exists', async () => {
    const redis = createMock<Redis>();
    const handler = new GetPlaybackStateHandler(redis);
    const query = new GetPlaybackStateQuery(userId);

    redis.get.mockResolvedValue(JSON.stringify(state));

    const result = await handler.execute(query);
    expect(result).toEqual(state);
    expect(redis.get).toHaveBeenCalledWith(`state:${userId}`);
  });

  it('returns null when state does not exist', async () => {
    const redis = createMock<Redis>();
    const handler = new GetPlaybackStateHandler(redis);
    const query = new GetPlaybackStateQuery(userId);

    redis.get.mockResolvedValue(null);

    const result = await handler.execute(query);
    expect(result).toBeNull();
  });

  it('throws InternalServerErrorException on invalid JSON', async () => {
    const redis = createMock<Redis>();
    const handler = new GetPlaybackStateHandler(redis);
    const query = new GetPlaybackStateQuery(userId);

    redis.get.mockResolvedValue('invalid-json');

    await expect(handler.execute(query)).rejects.toThrow(InternalServerErrorException);
  });

  it('throws InternalServerErrorException on Zod validation failure', async () => {
    const redis = createMock<Redis>();
    const handler = new GetPlaybackStateHandler(redis);
    const query = new GetPlaybackStateQuery(userId);

    redis.get.mockResolvedValue(JSON.stringify({ ...state, trackData: null }));

    await expect(handler.execute(query)).rejects.toThrow(InternalServerErrorException);
  });
});
