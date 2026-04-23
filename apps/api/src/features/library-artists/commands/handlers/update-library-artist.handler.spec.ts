import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { GenreResolutionService } from '@/shared/genres/genre-resolution.service';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Visibility } from '@repo/db';
import { artistBuilder, libraryBuilder, userBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateLibraryArtistCommand } from '../impl/update-library-artist.command';
import { UpdateLibraryArtistHandler } from './update-library-artist.handler';

describe('UpdateLibraryArtistHandler', () => {
  let handler: UpdateLibraryArtistHandler;
  let artistRepository: DeepMocked<ArtistRepository>;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let genreResolutionService: DeepMocked<GenreResolutionService>;

  const mockUserId = 'user-123';
  const mockArtistId = 'artist-123';
  const mockLibrary = {
    ...libraryBuilder({ id: 'library-123', userId: mockUserId }),
    user: userBuilder({ id: mockUserId }),
  } as NonNullable<Awaited<ReturnType<LibraryRepository['findOne']>>>;
  const mockArtist = artistBuilder({
    id: mockArtistId,
    name: 'Old Name',
    description: 'Old Description',
    isCommunity: false,
    verified: false,
    avatarId: null,
    bannerId: null,
    visibility: Visibility.public,
  });
  const mockArtistWithMedia = {
    ...mockArtist,
    avatar: null,
    banner: null,
  } as NonNullable<Awaited<ReturnType<ArtistRepository['findOne']>>>;

  beforeEach(async () => {
    artistRepository = createMock<ArtistRepository>();
    libraryRepository = createMock<LibraryRepository>();
    genreResolutionService = createMock<GenreResolutionService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateLibraryArtistHandler,
        { provide: ArtistRepository, useValue: artistRepository },
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: GenreResolutionService, useValue: genreResolutionService },
      ],
    }).compile();

    handler = module.get<UpdateLibraryArtistHandler>(UpdateLibraryArtistHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should update an artist successfully', async () => {
    const dto = { name: 'New Name', description: 'New Description' };
    const command = new UpdateLibraryArtistCommand(mockArtistId, dto, mockUserId);
    const mockUpdatedArtist = { ...mockArtist, ...dto };

    artistRepository.findOne.mockResolvedValueOnce(mockArtistWithMedia); // Check existence
    artistRepository.findOne.mockResolvedValueOnce(null); // Check name conflict
    artistRepository.update.mockResolvedValue(mockUpdatedArtist);

    const result = await handler.execute(command);

    expect(result).toEqual(mockUpdatedArtist);
    expect(artistRepository.update).toHaveBeenCalledWith(mockArtistId, dto);
  });

  it('should clear genres when genreIds is an empty array', async () => {
    const dto = { genreIds: [] as string[] };
    const command = new UpdateLibraryArtistCommand(mockArtistId, dto, mockUserId);

    artistRepository.findOne.mockResolvedValue(mockArtistWithMedia);
    libraryRepository.findOne.mockResolvedValue(mockLibrary);
    genreResolutionService.assertGenreIdsAssignableToLibrary.mockResolvedValue(true);
    artistRepository.update.mockResolvedValue(mockArtist);

    await handler.execute(command);

    expect(genreResolutionService.assertGenreIdsAssignableToLibrary).toHaveBeenCalledWith(
      mockLibrary.id,
      [],
    );
    expect(artistRepository.update).toHaveBeenCalledWith(mockArtistId, {
      name: undefined,
      description: undefined,
      genres: { deleteMany: {}, create: [] },
    });
  });

  it('should replace artist genres when genreIds are provided', async () => {
    const dto = { genreIds: ['genre-1', 'genre-1', 'genre-2'] };
    const command = new UpdateLibraryArtistCommand(mockArtistId, dto, mockUserId);
    const mockUpdatedArtist = { ...mockArtist };

    artistRepository.findOne.mockResolvedValue(mockArtistWithMedia);
    libraryRepository.findOne.mockResolvedValue(mockLibrary);
    genreResolutionService.assertGenreIdsAssignableToLibrary.mockResolvedValue(true);
    artistRepository.update.mockResolvedValue(mockUpdatedArtist);

    await handler.execute(command);

    expect(genreResolutionService.assertGenreIdsAssignableToLibrary).toHaveBeenCalledWith(
      mockLibrary.id,
      ['genre-1', 'genre-1', 'genre-2'],
    );
    expect(artistRepository.update).toHaveBeenCalledWith(mockArtistId, {
      name: undefined,
      description: undefined,
      genres: {
        deleteMany: {},
        create: [
          { genre: { connect: { id: 'genre-1' } } },
          { genre: { connect: { id: 'genre-2' } } },
        ],
      },
    });
  });

  it('should update an artist description only without checking name conflict', async () => {
    const dto = { description: 'New Description' };
    const command = new UpdateLibraryArtistCommand(mockArtistId, dto, mockUserId);
    const mockUpdatedArtist = { ...mockArtist, ...dto };

    artistRepository.findOne.mockResolvedValue(mockArtistWithMedia);
    artistRepository.update.mockResolvedValue(mockUpdatedArtist);

    const result = await handler.execute(command);

    expect(result).toEqual(mockUpdatedArtist);
    // Should call findOne only once for existence check
    expect(artistRepository.findOne).toHaveBeenCalledTimes(1);
    expect(artistRepository.update).toHaveBeenCalledWith(mockArtistId, {
      name: undefined,
      description: 'New Description',
    });
  });

  it('should throw PreconditionFailedException when genreIds are provided and library is missing', async () => {
    const command = new UpdateLibraryArtistCommand(
      mockArtistId,
      { genreIds: ['genre-1'] },
      mockUserId,
    );
    artistRepository.findOne.mockResolvedValue(mockArtistWithMedia);
    libraryRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
  });

  it('should throw BadRequestException when provided genre ids are not assignable', async () => {
    const command = new UpdateLibraryArtistCommand(
      mockArtistId,
      { genreIds: ['genre-1'] },
      mockUserId,
    );
    artistRepository.findOne.mockResolvedValue(mockArtistWithMedia);
    libraryRepository.findOne.mockResolvedValue(mockLibrary);
    genreResolutionService.assertGenreIdsAssignableToLibrary.mockResolvedValue(false);

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException if artist is missing', async () => {
    const command = new UpdateLibraryArtistCommand(mockArtistId, {}, mockUserId);
    artistRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw ConflictException if new name is already taken by another artist', async () => {
    const dto = { name: 'Taken Name' };
    const command = new UpdateLibraryArtistCommand(mockArtistId, dto, mockUserId);

    artistRepository.findOne.mockResolvedValueOnce(mockArtistWithMedia); // Existence
    artistRepository.findOne.mockResolvedValueOnce({
      ...artistBuilder({ id: 'other-artist' }),
      avatar: null,
      banner: null,
    } as NonNullable<Awaited<ReturnType<ArtistRepository['findOne']>>>); // Conflict

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
  });

  it('should throw InternalServerErrorException if parsing fails', async () => {
    const command = new UpdateLibraryArtistCommand(mockArtistId, {}, mockUserId);
    artistRepository.findOne.mockResolvedValue(mockArtistWithMedia);
    artistRepository.update.mockResolvedValue({ invalid: 'data' } as any);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
  });
});
