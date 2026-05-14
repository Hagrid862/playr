import { AlbumRepository } from '@/shared/repositories/album.repository';
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
import { AlbumSchema } from '@repo/contracts';
import { AlbumType } from '@repo/db';
import { albumBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateLibraryAlbumCommand } from '../impl/update-library-album.command';
import { UpdateLibraryAlbumHandler } from './update-library-album.handler';

describe('UpdateLibraryAlbumHandler', () => {
  let handler: UpdateLibraryAlbumHandler;
  let albumRepository: DeepMocked<AlbumRepository>;
  let libraryRepository: DeepMocked<LibraryRepository>;
  let genreRepository: DeepMocked<GenreRepository>;

  const mockUserId = 'user-123';
  const mockAlbumId = 'album-123';
  const mockAlbum = albumBuilder({
    id: mockAlbumId,
    name: 'Old Name',
    description: 'Old Desc',
    type: AlbumType.album,
    coverId: 'old-cover',
  });

  beforeEach(async () => {
    albumRepository = createMock<AlbumRepository>();
    libraryRepository = createMock<LibraryRepository>();
    genreRepository = createMock<GenreRepository>();

    libraryRepository.getByUserId.mockResolvedValue({
      id: 'library-123',
      userId: mockUserId,
    } as any);
    genreRepository.areGenreIdsAssignableToLibrary.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateLibraryAlbumHandler,
        { provide: AlbumRepository, useValue: albumRepository },
        { provide: LibraryRepository, useValue: libraryRepository },
        { provide: GenreRepository, useValue: genreRepository },
      ],
    }).compile();

    handler = module.get<UpdateLibraryAlbumHandler>(UpdateLibraryAlbumHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should update library album successfully', async () => {
    const request = { name: 'New Name' };
    const command = new UpdateLibraryAlbumCommand(mockAlbumId, request, mockUserId);

    albumRepository.findOne.mockResolvedValueOnce(mockAlbum); // Finding existing album
    albumRepository.findOne.mockResolvedValueOnce(null); // Checking for name collision
    albumRepository.update.mockResolvedValue({ ...mockAlbum, ...request });
    vi.spyOn(AlbumSchema, 'safeParse').mockReturnValue({
      success: true,
      data: { ...mockAlbum, ...request },
    } as any);

    const result = await handler.execute(command);

    expect(result.name).toBe('New Name');
    expect(albumRepository.update).toHaveBeenCalledWith(
      mockAlbumId,
      expect.objectContaining({ name: 'New Name' }),
    );
  });

  it('should throw NotFoundException if album not found', async () => {
    const command = new UpdateLibraryAlbumCommand(mockAlbumId, {}, mockUserId);
    albumRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw ConflictException if new name is taken', async () => {
    const request = { name: 'Taken Name' };
    const command = new UpdateLibraryAlbumCommand(mockAlbumId, request, mockUserId);

    albumRepository.findOne.mockResolvedValueOnce(mockAlbum); // Existing
    albumRepository.findOne.mockResolvedValueOnce(albumBuilder({ id: 'other' })); // Collision

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
  });

  it('should disconnect cover if coverId is null', async () => {
    const request = { coverId: null };
    const command = new UpdateLibraryAlbumCommand(mockAlbumId, request, mockUserId);

    albumRepository.findOne.mockResolvedValue(mockAlbum);
    albumRepository.update.mockResolvedValue({ ...mockAlbum, coverId: null });
    vi.spyOn(AlbumSchema, 'safeParse').mockReturnValue({
      success: true,
      data: { ...mockAlbum, coverId: null },
    } as any);

    await handler.execute(command);

    expect(albumRepository.update).toHaveBeenCalledWith(
      mockAlbumId,
      expect.objectContaining({
        cover: { disconnect: true },
      }),
    );
  });

  it('should connect cover if coverId is provided', async () => {
    const request = { coverId: 'new-cover' };
    const command = new UpdateLibraryAlbumCommand(mockAlbumId, request, mockUserId);

    albumRepository.findOne.mockResolvedValue(mockAlbum);
    albumRepository.update.mockResolvedValue({ ...mockAlbum, coverId: 'new-cover' });
    vi.spyOn(AlbumSchema, 'safeParse').mockReturnValue({
      success: true,
      data: { ...mockAlbum, coverId: 'new-cover' },
    } as any);

    await handler.execute(command);

    expect(albumRepository.update).toHaveBeenCalledWith(
      mockAlbumId,
      expect.objectContaining({
        cover: { connect: { id: 'new-cover' } },
      }),
    );
  });

  it('should throw InternalServerErrorException if result parsing fails', async () => {
    const command = new UpdateLibraryAlbumCommand(mockAlbumId, {}, mockUserId);

    albumRepository.findOne.mockResolvedValue(mockAlbum);
    albumRepository.update.mockResolvedValue({ invalid: 'data' } as any);
    vi.spyOn(AlbumSchema, 'safeParse').mockReturnValue({
      success: false,
      error: { format: () => ({}) },
    } as any);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
  });

  it('should throw PreconditionFailedException when library is missing and genreIds are set', async () => {
    const command = new UpdateLibraryAlbumCommand(mockAlbumId, { genreIds: ['g1'] }, mockUserId);

    albumRepository.findOne.mockResolvedValue(mockAlbum);
    libraryRepository.getByUserId.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
  });

  it('should throw BadRequestException when genres are not assignable', async () => {
    const command = new UpdateLibraryAlbumCommand(mockAlbumId, { genreIds: ['g1'] }, mockUserId);

    albumRepository.findOne.mockResolvedValue(mockAlbum);
    libraryRepository.getByUserId.mockResolvedValue({
      id: 'library-123',
      userId: mockUserId,
    } as any);
    genreRepository.areGenreIdsAssignableToLibrary.mockResolvedValue(false);

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('should pass genres to album update when genreIds are provided', async () => {
    const command = new UpdateLibraryAlbumCommand(
      mockAlbumId,
      { genreIds: ['a', 'b'] },
      mockUserId,
    );

    albumRepository.findOne.mockResolvedValue(mockAlbum);
    albumRepository.update.mockResolvedValue({ ...mockAlbum });
    vi.spyOn(AlbumSchema, 'safeParse').mockReturnValue({
      success: true,
      data: { ...mockAlbum },
    } as any);

    await handler.execute(command);

    expect(albumRepository.update).toHaveBeenCalledWith(
      mockAlbumId,
      expect.objectContaining({
        genres: {
          deleteMany: {},
          create: [{ genre: { connect: { id: 'a' } } }, { genre: { connect: { id: 'b' } } }],
        },
      }),
    );
  });
});
