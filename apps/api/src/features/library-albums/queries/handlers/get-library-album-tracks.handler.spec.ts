import { AlbumRepository } from '@/shared/repositories/album.repository';
import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { NotFoundException, PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Visibility } from '@repo/db';
import { albumBuilder, libraryBuilder, libraryTrackBuilder, trackBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetLibraryAlbumTracksQuery } from '../impl/get-library-album-tracks.query';
import { GetLibraryAlbumTracksHandler } from './get-library-album-tracks.handler';

describe('GetLibraryAlbumTracksHandler', () => {
  let handler: GetLibraryAlbumTracksHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let albumRepository: DeepMocked<AlbumRepository>;
  let libraryTrackRepository: DeepMocked<LibraryTrackRepository>;

  const userId = 'user-123';
  const albumId = 'album-123';
  const query = new GetLibraryAlbumTracksQuery(userId, albumId);

  const mockLibrary = libraryBuilder({ id: 'library-123', userId });
  const mockTrack = trackBuilder({
    id: 'track-123',
    title: 'Test Track',
    albumId,
    trackNumber: 1,
    diskNumber: 1,
    duration: 180,
    visibility: Visibility.private,
  });
  const mockLibraryTrack = {
    ...libraryTrackBuilder({
      id: 'lib-track-123',
      libraryId: mockLibrary.id,
      trackId: mockTrack.id,
    }),
    track: mockTrack,
  };

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    albumRepository = createMock<AlbumRepository>();
    libraryTrackRepository = createMock<LibraryTrackRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetLibraryAlbumTracksHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: AlbumRepository, useValue: albumRepository },
        { provide: LibraryTrackRepository, useValue: libraryTrackRepository },
      ],
    }).compile();

    handler = module.get<GetLibraryAlbumTracksHandler>(GetLibraryAlbumTracksHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return album tracks for a user library', async () => {
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.getById.mockResolvedValue(albumBuilder({ id: albumId }));
    libraryTrackRepository.listByLibraryAndAlbum.mockResolvedValue([mockLibraryTrack]);
    const result = await handler.execute(query);

    expect(result).toEqual([mockTrack]);
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(albumRepository.getById).toHaveBeenCalledWith(albumId);
    expect(libraryTrackRepository.listByLibraryAndAlbum).toHaveBeenCalledWith(
      mockLibrary.id,
      albumId,
      {
        orderBy: [{ track: { diskNumber: 'asc' } }, { track: { trackNumber: 'asc' } }],
        include: expect.any(Object),
      },
    );
  });

  it('should throw PreconditionFailedException if library not found', async () => {
    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(query)).rejects.toThrow(PreconditionFailedException);
  });

  it('should throw NotFoundException if album not found', async () => {
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.getById.mockResolvedValue(null);

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
  });
});
