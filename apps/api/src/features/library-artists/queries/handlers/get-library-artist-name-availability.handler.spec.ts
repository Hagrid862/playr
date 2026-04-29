import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { libraryBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetLibraryArtistNameAvailabilityQuery } from '../impl/get-library-artist-name-availability.query';
import { GetLibraryArtistNameAvailabilityHandler } from './get-library-artist-name-availability.handler';

describe('GetLibraryArtistNameAvailabilityHandler', () => {
  let handler: GetLibraryArtistNameAvailabilityHandler;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let artistRepository: DeepMocked<ArtistRepository>;

  const userId = 'user-123';
  const libraryId = 'lib-123';
  const mockLibrary = libraryBuilder({ id: libraryId, userId });

  beforeEach(async () => {
    libraryRepository = createMock<LibraryRepository>();
    artistRepository = createMock<ArtistRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetLibraryArtistNameAvailabilityHandler,
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: ArtistRepository, useValue: artistRepository },
      ],
    }).compile();

    handler = module.get<GetLibraryArtistNameAvailabilityHandler>(
      GetLibraryArtistNameAvailabilityHandler,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns available true when no artist matches name', async () => {
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    artistRepository.getByNameForOwner.mockResolvedValue(null);

    const result = await handler.execute(
      new GetLibraryArtistNameAvailabilityQuery(userId, 'Unique Name'),
    );

    expect(result).toEqual({ available: true });
    expect(artistRepository.getByNameForOwner).toHaveBeenCalledWith('Unique Name', userId);
  });

  it('returns available false when name is taken', async () => {
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    artistRepository.getByNameForOwner.mockResolvedValue({ id: 'artist-1' } as any);

    const result = await handler.execute(
      new GetLibraryArtistNameAvailabilityQuery(userId, 'Taken'),
    );

    expect(result).toEqual({ available: false });
  });

  it('throws PreconditionFailedException when library not found', async () => {
    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(
      handler.execute(new GetLibraryArtistNameAvailabilityQuery(userId, 'Any')),
    ).rejects.toThrow(PreconditionFailedException);

    expect(artistRepository.getByNameForOwner).not.toHaveBeenCalled();
  });
});
