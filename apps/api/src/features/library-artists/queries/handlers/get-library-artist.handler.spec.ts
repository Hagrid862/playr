import { LibraryArtistRepository } from '@/shared/repositories/library-artist.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { NotFoundException, PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { libraryArtistBuilder, libraryBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetLibraryArtistQuery } from '../impl/get-library-artist.query';
import { GetLibraryArtistHandler } from './get-library-artist.handler';

describe('GetLibraryArtistHandler', () => {
  let handler: GetLibraryArtistHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let libraryArtistRepository: DeepMocked<LibraryArtistRepository>;

  const userId = 'user-123';
  const artistId = 'artist-123';
  const libraryId = 'lib-123';
  const mockLibrary = libraryBuilder({ id: libraryId, userId });
  const mockLibraryArtist = libraryArtistBuilder({
    id: 'la-123',
    artistId,
    libraryId,
  });

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    libraryArtistRepository = createMock<LibraryArtistRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetLibraryArtistHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: LibraryArtistRepository, useValue: libraryArtistRepository },
      ],
    }).compile();

    handler = module.get<GetLibraryArtistHandler>(GetLibraryArtistHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should return library artist if found', async () => {
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    libraryArtistRepository.findOne.mockResolvedValue(mockLibraryArtist);

    const query = new GetLibraryArtistQuery(userId, artistId);
    const result = await handler.execute(query);

    expect(result).toEqual(mockLibraryArtist);
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(libraryArtistRepository.findOne).toHaveBeenCalledWith({
      libraryId,
      artistId,
    });
  });

  it('should throw PreconditionFailedException if library not found', async () => {
    libraryRepository.getByUserId.mockResolvedValue(null);

    const query = new GetLibraryArtistQuery(userId, artistId);

    await expect(handler.execute(query)).rejects.toThrow(PreconditionFailedException);
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(libraryArtistRepository.findOne).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if artist not found in library', async () => {
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    libraryArtistRepository.findOne.mockResolvedValue(null);

    const query = new GetLibraryArtistQuery(userId, artistId);

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    expect(libraryRepository.getByUserId).toHaveBeenCalledWith(userId);
    expect(libraryArtistRepository.findOne).toHaveBeenCalledWith({
      libraryId,
      artistId,
    });
  });
});
