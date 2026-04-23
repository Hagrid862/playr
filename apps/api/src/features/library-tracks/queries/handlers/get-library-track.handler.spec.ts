import { TrackRepository } from '@/shared/repositories/track.repository';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { albumBuilder, trackBuilder } from '@repo/testing/builders';
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

  const mockTrack = {
    ...trackBuilder({
      id: trackId,
    }),
    artists: [],
    album: {
      ...albumBuilder(),
      cover: null,
    },
  } as NonNullable<Awaited<ReturnType<TrackRepository['findOneWithInclude']>>>;

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
    trackRepository.findOneWithInclude.mockResolvedValue(mockTrack);

    const result = await handler.execute(query);

    expect(result).toEqual(mockTrack);
    expect(trackRepository.findOneWithInclude).toHaveBeenCalledWith(
      { id: trackId },
      { artists: true, album: { include: { cover: true } } },
    );
  });

  it('should throw NotFoundException if track not found', async () => {
    trackRepository.findOneWithInclude.mockResolvedValue(null);

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
  });

  it('should throw InternalServerErrorException if Zod validation fails', async () => {
    trackRepository.findOneWithInclude.mockResolvedValue(
      trackBuilder({ title: 123 } as any) as any,
    );

    await expect(handler.execute(query)).rejects.toThrow(InternalServerErrorException);
  });
});
