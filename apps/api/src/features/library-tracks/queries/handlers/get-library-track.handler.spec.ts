import { TrackRepository } from '@/shared/repositories/track.repository';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Track } from '@repo/db';
import { trackBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
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
    trackRepository.getById.mockResolvedValue(mockTrack);

    const result = await handler.execute(query);

    expect(result).toEqual(mockTrack);
    expect(trackRepository.getById).toHaveBeenCalledWith(trackId, {
      include: {
        album: true,
        artists: true,
        genres: { include: { genre: true } },
      },
    });
  });

  it('should throw NotFoundException if track not found', async () => {
    trackRepository.getById.mockResolvedValue(null);

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
  });

  it('should throw InternalServerErrorException if Zod validation fails', async () => {
    trackRepository.getById.mockResolvedValue(trackBuilder({ title: 123 } as any));

    await expect(handler.execute(query)).rejects.toThrow(InternalServerErrorException);
  });
});
