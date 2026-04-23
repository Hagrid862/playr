import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { LibraryArtistRepository } from '@/shared/repositories/library-artist.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { GenreResolutionService } from '@/shared/genres/genre-resolution.service';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { artistBuilder, libraryBuilder, userBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateLibraryArtistCommand } from '../impl/create-library-artist.command';
import { CreateLibraryArtistHandler } from './create-library-artist.handler';

describe('CreateLibraryArtistHandler', () => {
  let handler: CreateLibraryArtistHandler;
  let unitOfWork: DeepMocked<UnitOfWorkService>;
  let artistRepository: DeepMocked<ArtistRepository>;
  let genreResolutionService: DeepMocked<GenreResolutionService>;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let libraryArtistRepository: DeepMocked<LibraryArtistRepository>;

  const mockUserId = 'user-123';
  const mockLibrary = {
    ...libraryBuilder({ id: 'library-123', userId: mockUserId }),
    user: userBuilder({ id: mockUserId }),
  } as NonNullable<Awaited<ReturnType<LibraryRepository['findOne']>>>;
  const mockArtist = artistBuilder({
    id: 'artist-123',
    name: 'Test Artist',
    description: 'Test Description',
    isCommunity: false,
    verified: false,
    avatarId: null,
    bannerId: null,
    visibility: 'public',
  });
  const mockArtistWithMedia = {
    ...mockArtist,
    avatar: null,
    banner: null,
  } as NonNullable<Awaited<ReturnType<ArtistRepository['findOne']>>>;

  beforeEach(async () => {
    unitOfWork = createMock<UnitOfWorkService>();
    artistRepository = createMock<ArtistRepository>();
    genreResolutionService = createMock<GenreResolutionService>();
    libraryRepository = createMock<LibraryRepository>();
    libraryArtistRepository = createMock<LibraryArtistRepository>();

    genreResolutionService.assertGenreIdsAssignableToLibrary.mockResolvedValue(true);

    // Mock unit of work to just execute the callback
    unitOfWork.runInTransaction.mockImplementation((cb) => cb());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateLibraryArtistHandler,
        { provide: UnitOfWorkService, useValue: unitOfWork },
        { provide: ArtistRepository, useValue: artistRepository },
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: LibraryArtistRepository, useValue: libraryArtistRepository },
        { provide: GenreResolutionService, useValue: genreResolutionService },
      ],
    }).compile();

    handler = module.get<CreateLibraryArtistHandler>(CreateLibraryArtistHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create an artist successfully', async () => {
    const command = new CreateLibraryArtistCommand(
      { name: 'Test Artist', description: 'Test Description' },
      mockUserId,
    );

    libraryRepository.findOne.mockResolvedValue(mockLibrary);
    genreResolutionService.assertGenreIdsAssignableToLibrary.mockResolvedValue(true);
    artistRepository.findOne.mockResolvedValue(null);
    artistRepository.create.mockResolvedValue(mockArtist);

    const result = await handler.execute(command);

    expect(result).toEqual(mockArtist);
    expect(unitOfWork.runInTransaction).toHaveBeenCalled();
    expect(artistRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Artist',
        description: 'Test Description',
      }),
    );
    expect(libraryArtistRepository.create).toHaveBeenCalledWith({
      artist: { connect: { id: mockArtist.id } },
      library: { connect: { id: mockLibrary.id } },
    });
  });

  it('should create an artist with deduped genre ids', async () => {
    const command = new CreateLibraryArtistCommand(
      { name: 'Genre Artist', genreIds: ['genre-1', 'genre-1', 'genre-2'] },
      mockUserId,
    );

    libraryRepository.findOne.mockResolvedValue(mockLibrary);
    genreResolutionService.assertGenreIdsAssignableToLibrary.mockResolvedValue(true);
    artistRepository.findOne.mockResolvedValue(null);
    artistRepository.create.mockResolvedValue(mockArtist);

    await handler.execute(command);

    expect(genreResolutionService.assertGenreIdsAssignableToLibrary).toHaveBeenCalledWith(
      mockLibrary.id,
      ['genre-1', 'genre-2'],
    );
    expect(artistRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        genres: {
          create: [
            { genre: { connect: { id: 'genre-1' } } },
            { genre: { connect: { id: 'genre-2' } } },
          ],
        },
      }),
    );
  });

  it('should throw BadRequestException when genre ids are not assignable', async () => {
    const command = new CreateLibraryArtistCommand(
      { name: 'Genre Artist', genreIds: ['genre-1'] },
      mockUserId,
    );

    libraryRepository.findOne.mockResolvedValue(mockLibrary);
    genreResolutionService.assertGenreIdsAssignableToLibrary.mockRejectedValue(
      new BadRequestException('One or more genre IDs are not assignable to the library'),
    );

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('should throw PreconditionFailedException if library is missing', async () => {
    const command = new CreateLibraryArtistCommand({ name: 'Test' }, mockUserId);
    libraryRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
  });

  it('should throw ConflictException if artist name is already taken', async () => {
    const command = new CreateLibraryArtistCommand({ name: 'Taken' }, mockUserId);
    libraryRepository.findOne.mockResolvedValue(mockLibrary);
    artistRepository.findOne.mockResolvedValue(mockArtistWithMedia);

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
  });

  it('should throw InternalServerErrorException if parsing fails', async () => {
    const command = new CreateLibraryArtistCommand({ name: 'Test' }, mockUserId);
    libraryRepository.findOne.mockResolvedValue(mockLibrary);
    artistRepository.findOne.mockResolvedValue(null);
    artistRepository.create.mockResolvedValue({ invalid: 'data' } as any);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
  });
});
