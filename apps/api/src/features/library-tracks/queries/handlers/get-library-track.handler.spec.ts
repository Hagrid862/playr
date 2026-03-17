import { TrackRepository } from '@/shared/repositories/track.repository';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Track } from '@repo/db';
import { trackBuilder } from '@repo/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetLibraryTrackQuery } from '../impl/get-library-track.query';
import { GetLibraryTrackHandler } from './get-library-track.handler';

describe('GetLibraryTrackHandler', () => {
  let handler: GetLibraryTrackHandler;
  let trackRepository: DeepMocked<TrackRepository>;

  const userId = 'user-123';
  const trackId = 'track-123';
  const query = new GetLibraryTrackQuery(trackId, userId);

  const mockTrack: Track = trackBuilder({
    id: trackId,
  });

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
    // @ts-expect-error - we are testing the validation failure
    trackRepository.findOne.mockResolvedValue(trackBuilder({ ...mockTrack, title: 123 }));

    await expect(handler.execute(query)).rejects.toThrow(InternalServerErrorException);
  });
});
