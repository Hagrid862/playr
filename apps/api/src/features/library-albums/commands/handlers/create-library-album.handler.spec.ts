import { AlbumRepository } from '@/shared/repositories/album.repository';
import { LibraryAlbumRepository } from '@/shared/repositories/library-album.repository';
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
import { AlbumSchema } from '@repo/contracts';
import { AlbumType, Visibility } from '@repo/db';
import { albumBuilder, libraryBuilder, userBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateLibraryAlbumCommand } from '../impl/create-library-album.command';
import { CreateLibraryAlbumHandler } from './create-library-album.handler';

describe('CreateLibraryAlbumHandler', () => {
  let handler: CreateLibraryAlbumHandler;
  let unitOfWork: DeepMocked<UnitOfWorkService>;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let albumRepository: DeepMocked<AlbumRepository>;
  let libraryAlbumRepository: DeepMocked<LibraryAlbumRepository>;
  let genreResolutionService: DeepMocked<GenreResolutionService>;

  const mockUserId = 'user-123';
  const mockLibraryId = 'library-123';
  const mockAlbumId = 'album-123';
  const mockArtistId = 'artist-123';

  const mockRequest = {
    name: 'New Album',
    description: 'Description',
    type: 'album' as const,
    releaseDate: new Date(),
    artistId: mockArtistId,
  };

  const mockLibrary = {
    ...libraryBuilder({ id: mockLibraryId, userId: mockUserId }),
    user: userBuilder({ id: mockUserId }),
  } as NonNullable<Awaited<ReturnType<LibraryRepository['findOne']>>>;
  const mockAlbum = albumBuilder({
    id: mockAlbumId,
    name: mockRequest.name,
    description: mockRequest.description,
    type: AlbumType.album,
    releaseDate: mockRequest.releaseDate,
    coverId: null,
    totalTracks: 0,
    totalDuration: 0,
    visibility: Visibility.private,
  });

  beforeEach(async () => {
    unitOfWork = createMock<UnitOfWorkService>();
    libraryRepository = createMock<LibraryRepository>();
    albumRepository = createMock<AlbumRepository>();
    libraryAlbumRepository = createMock<LibraryAlbumRepository>();
    genreResolutionService = createMock<GenreResolutionService>();

    genreResolutionService.assertGenreIdsAssignableToLibrary.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateLibraryAlbumHandler,
        { provide: UnitOfWorkService, useValue: unitOfWork },
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: AlbumRepository, useValue: albumRepository },
        { provide: LibraryAlbumRepository, useValue: libraryAlbumRepository },
        { provide: GenreResolutionService, useValue: genreResolutionService },
      ],
    }).compile();

    handler = module.get<CreateLibraryAlbumHandler>(CreateLibraryAlbumHandler);

    unitOfWork.runInTransaction.mockImplementation(async (cb) => cb());
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should create library album successfully', async () => {
    const command = new CreateLibraryAlbumCommand(mockRequest, mockUserId);

    libraryRepository.findOne.mockResolvedValue(mockLibrary);
    albumRepository.findOneWithInclude.mockResolvedValue(null);
    albumRepository.create.mockResolvedValue(mockAlbum);
    vi.spyOn(AlbumSchema, 'safeParse').mockReturnValue({ success: true, data: mockAlbum } as any);

    const result = await handler.execute(command);

    expect(result.id).toBe(mockAlbumId);
    expect(albumRepository.create).toHaveBeenCalled();
    expect(libraryAlbumRepository.create).toHaveBeenCalledWith({
      album: { connect: { id: mockAlbumId } },
      library: { connect: { id: mockLibraryId } },
    });
  });

  it('should throw PreconditionFailedException if user library not found', async () => {
    const command = new CreateLibraryAlbumCommand(mockRequest, mockUserId);
    libraryRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
  });

  it('should throw ConflictException if album name already exists', async () => {
    const command = new CreateLibraryAlbumCommand(mockRequest, mockUserId);

    libraryRepository.findOne.mockResolvedValue(mockLibrary);
    albumRepository.findOneWithInclude.mockResolvedValue({
      ...albumBuilder({ id: 'existing-id' }),
      cover: null,
      access: [],
      artists: [],
    } as NonNullable<Awaited<ReturnType<AlbumRepository['findOneWithInclude']>>>);

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
  });

  it('should throw InternalServerErrorException if result parsing fails', async () => {
    const command = new CreateLibraryAlbumCommand(mockRequest, mockUserId);

    libraryRepository.findOne.mockResolvedValue(mockLibrary);
    albumRepository.findOneWithInclude.mockResolvedValue(null);
    albumRepository.create.mockResolvedValue({ invalid: 'data' } as any);

    vi.spyOn(AlbumSchema, 'safeParse').mockReturnValue({
      success: false,
      error: { format: () => ({}) },
    } as any);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
  });

  it('should throw BadRequestException when genre ids are not assignable', async () => {
    const command = new CreateLibraryAlbumCommand({ ...mockRequest, genreIds: ['g1'] }, mockUserId);

    libraryRepository.findOne.mockResolvedValue(mockLibrary);
    genreResolutionService.assertGenreIdsAssignableToLibrary.mockResolvedValue(false);

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('should dedupe genre ids when creating album', async () => {
    const command = new CreateLibraryAlbumCommand(
      { ...mockRequest, genreIds: ['g1', 'g1', 'g2'] },
      mockUserId,
    );

    libraryRepository.findOne.mockResolvedValue(mockLibrary);
    albumRepository.findOneWithInclude.mockResolvedValue(null);
    genreResolutionService.assertGenreIdsAssignableToLibrary.mockResolvedValue(true);
    albumRepository.create.mockResolvedValue(mockAlbum);
    vi.spyOn(AlbumSchema, 'safeParse').mockReturnValue({ success: true, data: mockAlbum } as any);

    await handler.execute(command);

    expect(genreResolutionService.assertGenreIdsAssignableToLibrary).toHaveBeenCalledWith(
      mockLibraryId,
      ['g1', 'g2'],
    );
    expect(albumRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        genres: {
          create: [{ genre: { connect: { id: 'g1' } } }, { genre: { connect: { id: 'g2' } } }],
        },
      }),
    );
  });
});
