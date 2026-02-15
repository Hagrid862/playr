import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Library, LibraryTrack } from '@repo/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetLibraryTracksQuery } from '../impl/get-library-tracks.query';
import { GetLibraryTracksHandler } from './get-library-tracks.handler';

describe('GetLibraryTracksHandler', () => {
  let handler: GetLibraryTracksHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let libraryTrackRepository: DeepMocked<LibraryTrackRepository>;

  const userId = 'user-123';
  const query = new GetLibraryTracksQuery(userId, 1, 10);

  const mockLibrary: Library = {
    id: 'library-123',
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockLibraryTrack: LibraryTrack = {
    id: 'lib-track-123',
    libraryId: mockLibrary.id,
    trackId: 'track-123',
    listenedCount: 0,
    listenCountResetAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

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
    libraryTrackRepository.findMany.mockResolvedValue([
      { ...mockLibraryTrack, track: mockLibraryTrack } as any,
    ]);
    libraryTrackRepository.count.mockResolvedValue(1);

    const result = (await handler.execute(query)) as any;

    expect(result.items).toEqual([mockLibraryTrack]);
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
