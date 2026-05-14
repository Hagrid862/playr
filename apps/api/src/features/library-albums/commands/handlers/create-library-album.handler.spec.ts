import { AlbumRepository } from '@/shared/repositories/album.repository';
import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { GenreRepository } from '@/shared/repositories/genre.repository';
import { LibraryAlbumRepository } from '@/shared/repositories/library-album.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
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
import { albumBuilder, libraryBuilder } from '@repo/testing/builders';
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
  let genreRepository: DeepMocked<GenreRepository>;
  let artistRepository: DeepMocked<ArtistRepository>;

  const mockUserId = 'user-123';
  const mockLibraryId = 'library-123';
  const mockAlbumId = 'album-123';
  const mockArtistId = 'artist-123';

  const mockRequest = {
    name: 'New Album',
    description: 'Description',
    type: 'album' as const,
    releaseDate: new Date(),
    artistIds: [mockArtistId],
  };

  const mockLibrary = libraryBuilder({ id: mockLibraryId, userId: mockUserId });
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
    genreRepository = createMock<GenreRepository>();
    artistRepository = createMock<ArtistRepository>();

    genreRepository.areGenreIdsAssignableToLibrary.mockResolvedValue(true);
    artistRepository.countActiveOwnedByUser.mockImplementation(async (ids) => ids.length);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateLibraryAlbumHandler,
        { provide: UnitOfWorkService, useValue: unitOfWork },
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: AlbumRepository, useValue: albumRepository },
        { provide: LibraryAlbumRepository, useValue: libraryAlbumRepository },
        { provide: GenreRepository, useValue: genreRepository },
        { provide: ArtistRepository, useValue: artistRepository },
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

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.getByNameForOwner.mockResolvedValue(null);
    albumRepository.create.mockResolvedValue(mockAlbum);
    vi.spyOn(AlbumSchema, 'safeParse').mockReturnValue({ success: true, data: mockAlbum } as any);

    const result = await handler.execute(command);

    expect(result.id).toBe(mockAlbumId);
    expect(artistRepository.countActiveOwnedByUser).toHaveBeenCalledWith(
      [mockArtistId],
      mockUserId,
    );
    expect(albumRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        artists: { connect: [{ id: mockArtistId }] },
      }),
    );
    expect(libraryAlbumRepository.create).toHaveBeenCalledWith({
      album: { connect: { id: mockAlbumId } },
      library: { connect: { id: mockLibraryId } },
    });
  });

  it('should throw PreconditionFailedException if user library not found', async () => {
    const command = new CreateLibraryAlbumCommand(mockRequest, mockUserId);
    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
  });

  it('should throw ConflictException if album name already exists', async () => {
    const command = new CreateLibraryAlbumCommand(mockRequest, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.getByNameForOwner.mockResolvedValue(albumBuilder({ id: 'existing-id' }));

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
  });

  it('should throw InternalServerErrorException if result parsing fails', async () => {
    const command = new CreateLibraryAlbumCommand(mockRequest, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.getByNameForOwner.mockResolvedValue(null);
    albumRepository.create.mockResolvedValue({ invalid: 'data' } as any);

    vi.spyOn(AlbumSchema, 'safeParse').mockReturnValue({
      success: false,
      error: { format: () => ({}) },
    } as any);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
  });

  it('should throw BadRequestException when genre ids are not assignable', async () => {
    const command = new CreateLibraryAlbumCommand({ ...mockRequest, genreIds: ['g1'] }, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    genreRepository.areGenreIdsAssignableToLibrary.mockResolvedValue(false);

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when artist ids are not all owned', async () => {
    const command = new CreateLibraryAlbumCommand(mockRequest, mockUserId);
    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    artistRepository.countActiveOwnedByUser.mockResolvedValue(0);

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    expect(unitOfWork.runInTransaction).not.toHaveBeenCalled();
  });

  it('should dedupe genre ids when creating album', async () => {
    const command = new CreateLibraryAlbumCommand(
      { ...mockRequest, genreIds: ['g1', 'g1', 'g2'] },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.getByNameForOwner.mockResolvedValue(null);
    genreRepository.areGenreIdsAssignableToLibrary.mockResolvedValue(true);
    albumRepository.create.mockResolvedValue(mockAlbum);
    vi.spyOn(AlbumSchema, 'safeParse').mockReturnValue({ success: true, data: mockAlbum } as any);

    await handler.execute(command);

    expect(genreRepository.areGenreIdsAssignableToLibrary).toHaveBeenCalledWith(mockLibraryId, [
      'g1',
      'g2',
    ]);
    expect(albumRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        genres: {
          create: [{ genre: { connect: { id: 'g1' } } }, { genre: { connect: { id: 'g2' } } }],
        },
      }),
    );
  });

  it('should dedupe artist ids when creating album', async () => {
    const a1 = 'artist-1';
    const a2 = 'artist-2';
    const command = new CreateLibraryAlbumCommand(
      { ...mockRequest, artistIds: [a1, a1, a2] },
      mockUserId,
    );

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.getByNameForOwner.mockResolvedValue(null);
    albumRepository.create.mockResolvedValue(mockAlbum);
    vi.spyOn(AlbumSchema, 'safeParse').mockReturnValue({ success: true, data: mockAlbum } as any);

    await handler.execute(command);

    expect(artistRepository.countActiveOwnedByUser).toHaveBeenCalledWith([a1, a2], mockUserId);
    expect(albumRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        artists: { connect: [{ id: a1 }, { id: a2 }] },
      }),
    );
  });
});
