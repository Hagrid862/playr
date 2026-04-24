import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { InternalServerErrorException, PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Visibility } from '@repo/db';
import {
  albumBuilder,
  libraryBuilder,
  libraryTrackBuilder,
  trackBuilder,
  userBuilder,
} from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetLibraryAlbumTracksQuery } from '../impl/get-library-album-tracks.query';
import { GetLibraryAlbumTracksHandler } from './get-library-album-tracks.handler';

describe('GetLibraryAlbumTracksHandler', () => {
  let handler: GetLibraryAlbumTracksHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let libraryTrackRepository: DeepMocked<LibraryTrackRepository>;

  const userId = 'user-123';
  const albumId = 'album-123';
  const query = new GetLibraryAlbumTracksQuery(userId, albumId);

  const mockLibrary = {
    ...libraryBuilder({ id: 'library-123', userId }),
    user: userBuilder({ id: userId }),
  } as NonNullable<Awaited<ReturnType<LibraryRepository['findOne']>>>;
  const mockTrack = trackBuilder({
    id: 'track-123',
    title: 'Test Track',
    albumId,
    trackNumber: 1,
    diskNumber: 1,
    duration: 180,
    visibility: Visibility.private,
  });
  const mockTrackWithRelations = {
    ...mockTrack,
    artists: [],
    album: { ...albumBuilder({ id: albumId }), cover: null },
  };
  const mockLibraryTrack = {
    ...libraryTrackBuilder({
      id: 'lib-track-123',
      libraryId: mockLibrary.id,
      trackId: mockTrack.id,
    }),
    track: mockTrackWithRelations,
  };

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    libraryTrackRepository = createMock<LibraryTrackRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetLibraryAlbumTracksHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: LibraryTrackRepository, useValue: libraryTrackRepository },
      ],
    }).compile();

    handler = module.get<GetLibraryAlbumTracksHandler>(GetLibraryAlbumTracksHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return album tracks for a user library', async () => {
    libraryRepository.findOne.mockResolvedValue(mockLibrary);
    libraryTrackRepository.findManyWithInclude.mockResolvedValue([mockLibraryTrack]);

    const result = await handler.execute(query);

    expect(result).toEqual([mockTrackWithRelations]);
    expect(libraryRepository.findOne).toHaveBeenCalledWith({ userId });
    expect(libraryTrackRepository.findManyWithInclude).toHaveBeenCalledWith(
      {
        libraryId: mockLibrary.id,
        track: { albumId },
      },
      {
        orderBy: [{ track: { diskNumber: 'asc' } }, { track: { trackNumber: 'asc' } }],
      },
      {
        track: {
          include: {
            artists: true,
            album: {
              include: {
                cover: true,
              },
            },
          },
        },
      },
    );
  });

  it('should throw PreconditionFailedException if library not found', async () => {
    libraryRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(query)).rejects.toThrow(PreconditionFailedException);
  });

  it('should throw InternalServerErrorException when track parsing fails', async () => {
    libraryRepository.findOne.mockResolvedValue(mockLibrary);
    libraryTrackRepository.findManyWithInclude.mockResolvedValue([
      { ...mockLibraryTrack, track: { ...mockTrackWithRelations, title: 123 } as never },
    ]);

    await expect(handler.execute(query)).rejects.toThrow(InternalServerErrorException);
  });
});
