import { TrackRepository } from '@/shared/repositories/track.repository';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Track } from '@repo/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetLibraryTrackQuery } from '../impl/get-library-track.query';
import { GetLibraryTrackHandler } from './get-library-track.handler';

describe('GetLibraryTrackHandler', () => {
  let handler: GetLibraryTrackHandler;
  let trackRepository: DeepMocked<TrackRepository>;

  const userId = 'user-123';
  const trackId = 'track-123';
  const query = new GetLibraryTrackQuery(trackId, userId);

  const mockTrack: Track = {
    id: trackId,
    title: 'Test Track',
    trackNumber: 1,
    diskNumber: 1,
    duration: 180,
    listenedCount: 0,
    explicit: false,
    lyrics: null,
    albumId: 'album-123',
    visibility: 'private',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    trackRepository = createMock<TrackRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [GetLibraryTrackHandler, { provide: TrackRepository, useValue: trackRepository }],
    }).compile();

    handler = module.get<GetLibraryTrackHandler>(GetLibraryTrackHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return track details', async () => {
    trackRepository.findOne.mockResolvedValue(mockTrack);

    const result = await handler.execute(query);

    expect(result).toEqual(mockTrack);
    expect(trackRepository.findOne).toHaveBeenCalledWith({ id: trackId }, true);
  });

  it('should throw NotFoundException if track not found', async () => {
    trackRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
  });

  it('should throw InternalServerErrorException if Zod validation fails', async () => {
    trackRepository.findOne.mockResolvedValue({ ...mockTrack, title: 123 as any });

    await expect(handler.execute(query)).rejects.toThrow(InternalServerErrorException);
  });
});
