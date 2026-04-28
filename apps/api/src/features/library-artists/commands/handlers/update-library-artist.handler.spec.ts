import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { GenreRepository } from '@/shared/repositories/genre.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Visibility } from '@repo/db';
import { artistBuilder, libraryBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateLibraryArtistCommand } from '../impl/update-library-artist.command';
import { UpdateLibraryArtistHandler } from './update-library-artist.handler';

describe('UpdateLibraryArtistHandler', () => {
  let handler: UpdateLibraryArtistHandler;
  let artistRepository: DeepMocked<ArtistRepository>;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let genreRepository: DeepMocked<GenreRepository>;

  const mockUserId = 'user-123';
  const mockArtistId = 'artist-123';
  const mockLibrary = libraryBuilder({ id: 'library-123', userId: mockUserId });
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

  beforeEach(async () => {
    artistRepository = createMock<ArtistRepository>();
    libraryRepository = createMock<LibraryRepository>();
    genreRepository = createMock<GenreRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateLibraryArtistHandler,
        { provide: ArtistRepository, useValue: artistRepository },
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: GenreRepository, useValue: genreRepository },
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

    artistRepository.getByIdForOwner.mockResolvedValueOnce(mockArtist); // Check existence
    artistRepository.getByNameForOwner.mockResolvedValueOnce(null); // Check name conflict
    artistRepository.update.mockResolvedValue(mockUpdatedArtist);

    const result = await handler.execute(command);

    expect(result).toEqual(mockUpdatedArtist);
    expect(artistRepository.update).toHaveBeenCalledWith(mockArtistId, dto);
  });

  it('should clear genres when genreIds is an empty array', async () => {
    const dto = { genreIds: [] as string[] };
    const command = new UpdateLibraryArtistCommand(mockArtistId, dto, mockUserId);

    artistRepository.getByIdForOwner.mockResolvedValue(mockArtist);
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    genreRepository.areGenreIdsAssignableToLibrary.mockResolvedValue(true);
    artistRepository.update.mockResolvedValue(mockArtist);

    await handler.execute(command);

    expect(genreRepository.areGenreIdsAssignableToLibrary).toHaveBeenCalledWith(mockLibrary.id, []);
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

    artistRepository.getByIdForOwner.mockResolvedValue(mockArtist);
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    genreRepository.areGenreIdsAssignableToLibrary.mockResolvedValue(true);
    artistRepository.update.mockResolvedValue(mockUpdatedArtist);

    await handler.execute(command);

    expect(genreRepository.areGenreIdsAssignableToLibrary).toHaveBeenCalledWith(mockLibrary.id, [
      'genre-1',
      'genre-1',
      'genre-2',
    ]);
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

    artistRepository.getByIdForOwner.mockResolvedValue(mockArtist);
    artistRepository.update.mockResolvedValue(mockUpdatedArtist);

    const result = await handler.execute(command);

    expect(result).toEqual(mockUpdatedArtist);
    // Should call getByIdForOwner only once for existence check
    expect(artistRepository.getByIdForOwner).toHaveBeenCalledTimes(1);
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
    artistRepository.getByIdForOwner.mockResolvedValue(mockArtist);
    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
  });

  it('should throw BadRequestException when provided genre ids are not assignable', async () => {
    const command = new UpdateLibraryArtistCommand(
      mockArtistId,
      { genreIds: ['genre-1'] },
      mockUserId,
    );
    artistRepository.getByIdForOwner.mockResolvedValue(mockArtist);
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    genreRepository.areGenreIdsAssignableToLibrary.mockResolvedValue(false);

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException if artist is missing', async () => {
    const command = new UpdateLibraryArtistCommand(mockArtistId, {}, mockUserId);
    artistRepository.getByIdForOwner.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw ConflictException if new name is already taken by another artist', async () => {
    const dto = { name: 'Taken Name' };
    const command = new UpdateLibraryArtistCommand(mockArtistId, dto, mockUserId);

    artistRepository.getByIdForOwner.mockResolvedValueOnce(mockArtist); // Existence
    artistRepository.getByNameForOwner.mockResolvedValueOnce(
      artistBuilder({ id: 'other-artist' }),
    ); // Conflict

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
  });

  it('should throw InternalServerErrorException if parsing fails', async () => {
    const command = new UpdateLibraryArtistCommand(mockArtistId, {}, mockUserId);
    artistRepository.getByIdForOwner.mockResolvedValue(mockArtist);
    artistRepository.update.mockResolvedValue({ invalid: 'data' } as any);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
  });
});
