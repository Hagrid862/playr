import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Library, LibraryTrack, LibraryTrackGetPayload, Track } from '@repo/db';
import { libraryBuilder, libraryTrackBuilder, trackBuilder } from '@repo/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetLibraryTracksQuery } from '../impl/get-library-tracks.query';
import { GetLibraryTracksHandler } from './get-library-tracks.handler';

type LibraryTrackWithTrack = LibraryTrackGetPayload<{
  include: { track: true };
}>;

describe('GetLibraryTracksHandler', () => {
  let handler: GetLibraryTracksHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let libraryTrackRepository: DeepMocked<LibraryTrackRepository>;

  const userId = 'user-123';
  const query = new GetLibraryTracksQuery(userId, 1, 10);

  const mockLibrary: Library = libraryBuilder({
    id: 'library-123',
    userId,
  });

  const mockTrack: Track = trackBuilder({ id: 'track-123' });

  const mockLibraryTrack: LibraryTrack = libraryTrackBuilder({
    id: 'lib-track-123',
    libraryId: mockLibrary.id,
    trackId: mockTrack.id,
  });

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    libraryTrackRepository = createMock<LibraryTrackRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetLibraryTracksHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: LibraryTrackRepository, useValue: libraryTrackRepository },
      ],
    }).compile();

    handler = module.get<GetLibraryTracksHandler>(GetLibraryTracksHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return paginated library tracks', async () => {
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);

    const mockItem: LibraryTrackWithTrack = {
      ...mockLibraryTrack,
      track: mockTrack,
    };

    libraryTrackRepository.findMany.mockResolvedValue([mockItem]);
    libraryTrackRepository.count.mockResolvedValue(1);

    const result = await handler.execute(query);

    expect(result.items).toEqual([mockTrack]);
    expect(result.total).toBe(1);
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(libraryTrackRepository.findMany).toHaveBeenCalledWith({
      where: { libraryId: mockLibrary.id, track: undefined },
      take: 10,
      skip: 0,
      orderBy: { track: { trackNumber: 'asc' } },
    });
  });

  it('should filter by albumId if provided', async () => {
    const albumQuery = new GetLibraryTracksQuery(userId, 1, 10, 'album-123');
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    libraryTrackRepository.findMany.mockResolvedValue([mockLibraryTrack]);
    libraryTrackRepository.count.mockResolvedValue(1);

    await handler.execute(albumQuery);

    expect(libraryTrackRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          libraryId: mockLibrary.id,
          track: { albumId: 'album-123' },
        },
      }),
    );
  });

  it('should throw PreconditionFailedException if library not found', async () => {
    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(query)).rejects.toThrow(PreconditionFailedException);
  });
});
