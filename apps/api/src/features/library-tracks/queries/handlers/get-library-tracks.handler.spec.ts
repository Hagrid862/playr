import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  libraryBuilder,
  libraryTrackBuilder,
  trackBuilder,
  userBuilder,
  albumBuilder,
} from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetLibraryTracksQuery } from '../impl/get-library-tracks.query';
import { GetLibraryTracksHandler } from './get-library-tracks.handler';

describe('GetLibraryTracksHandler', () => {
  let handler: GetLibraryTracksHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let libraryTrackRepository: DeepMocked<LibraryTrackRepository>;

  const userId = 'user-123';
  const query = new GetLibraryTracksQuery(userId, 1, 10);

  const mockLibrary = {
    ...libraryBuilder({
      id: 'library-123',
      userId,
    }),
    user: userBuilder({ id: userId }),
  } as NonNullable<Awaited<ReturnType<LibraryRepository['findOne']>>>;

  const mockTrack = {
    ...trackBuilder({ id: 'track-123' }),
    album: { ...albumBuilder(), cover: null },
    artists: [],
  };

  const mockLibraryTrack = {
    ...libraryTrackBuilder({
      id: 'lib-track-123',
      libraryId: mockLibrary.id,
      trackId: mockTrack.id,
    }),
    track: mockTrack,
  } as Awaited<ReturnType<LibraryTrackRepository['findManyWithInclude']>>[number];

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
    libraryRepository.findOne.mockResolvedValue(mockLibrary);
    libraryTrackRepository.findManyWithInclude.mockResolvedValue([mockLibraryTrack]);
    libraryTrackRepository.count.mockResolvedValue(1);

    const result = await handler.execute(query);

    expect(result.items).toEqual([mockTrack]);
    expect(result.total).toBe(1);
    expect(libraryRepository.findOne).toHaveBeenCalledWith({ userId });
    expect(libraryTrackRepository.findManyWithInclude).toHaveBeenCalledWith(
      { libraryId: mockLibrary.id, track: undefined },
      {
        track: {
          include: {
            album: { include: { cover: true } },
            artists: true,
          },
        },
      },
      { take: 10, skip: 0, orderBy: { track: { trackNumber: 'asc' } } },
    );
  });

  it('should filter by albumId if provided', async () => {
    const albumQuery = new GetLibraryTracksQuery(userId, 1, 10, 'album-123');
    libraryRepository.findOne.mockResolvedValue(mockLibrary);
    libraryTrackRepository.findManyWithInclude.mockResolvedValue([mockLibraryTrack]);
    libraryTrackRepository.count.mockResolvedValue(1);

    await handler.execute(albumQuery);

    expect(libraryTrackRepository.findManyWithInclude).toHaveBeenCalledWith(
      expect.objectContaining({
        libraryId: mockLibrary.id,
        track: { albumId: 'album-123' },
      }),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it('should throw PreconditionFailedException if library not found', async () => {
    libraryRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(query)).rejects.toThrow(PreconditionFailedException);
  });
});
