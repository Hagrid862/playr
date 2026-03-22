import { AlbumRepository } from '@/shared/repositories/album.repository';
import { LibraryAlbumRepository } from '@/shared/repositories/library-album.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateLibraryAlbumHandler,
        { provide: UnitOfWorkService, useValue: unitOfWork },
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: AlbumRepository, useValue: albumRepository },
        { provide: LibraryAlbumRepository, useValue: libraryAlbumRepository },
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
    albumRepository.findOne.mockResolvedValue(null);
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
    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
  });

  it('should throw ConflictException if album name already exists', async () => {
    const command = new CreateLibraryAlbumCommand(mockRequest, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.findOne.mockResolvedValue(albumBuilder({ id: 'existing-id' }));

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
  });

  it('should throw InternalServerErrorException if result parsing fails', async () => {
    const command = new CreateLibraryAlbumCommand(mockRequest, mockUserId);

    libraryRepository.getByUserId.mockResolvedValue(mockLibrary);
    albumRepository.findOne.mockResolvedValue(null);
    albumRepository.create.mockResolvedValue({ invalid: 'data' } as any);

    vi.spyOn(AlbumSchema, 'safeParse').mockReturnValue({
      success: false,
      error: { format: () => ({}) },
    } as any);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
  });
});
