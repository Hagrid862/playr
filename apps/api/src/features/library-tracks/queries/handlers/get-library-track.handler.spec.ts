import { TrackRepository } from '@/shared/repositories/track.repository';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
// @ts-expect-error - ignore type errors from testing package imports
import { buildTrack } from '@repo/testing';
import { GetLibraryTrackQuery } from '../impl/get-library-track.query';
import { GetLibraryTrackHandler } from './get-library-track.handler';

describe('GetLibraryTrackHandler', () => {
  let handler: GetLibraryTrackHandler;
  let trackRepository: DeepMocked<TrackRepository>;

  const userId = 'user-123';
  const trackId = 'track-123';
  const query = new GetLibraryTrackQuery(trackId, userId);

  const mockTrack = buildTrack({
    id: trackId,
    title: 'Test Track',
    albumId: 'album-123',
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
    trackRepository.findOne.mockResolvedValue(JSON.parse('{"id":"track-123","title":123}'));

    await expect(handler.execute(query)).rejects.toThrow(InternalServerErrorException);
  });
});
