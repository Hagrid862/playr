import { AlbumRepository } from '@/shared/repositories/album.repository';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AlbumType, Visibility } from '@repo/db';
import { albumBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteLibraryAlbumCommand } from '../impl/delete-library-album.command';
import { DeleteLibraryAlbumHandler } from './delete-library-album.handler';

describe('DeleteLibraryAlbumHandler', () => {
  let handler: DeleteLibraryAlbumHandler;
  let albumRepository: DeepMocked<AlbumRepository>;

  const mockUserId = 'user-123';
  const mockAlbumId = 'album-123';
  const mockAlbum = albumBuilder({
    id: mockAlbumId,
    name: 'Test Album',
    description: 'Test Description',
    type: AlbumType.album,
    totalTracks: 10,
    totalDuration: 3000,
    releaseDate: new Date(),
    coverId: null,
    visibility: Visibility.public,
  });

  beforeEach(async () => {
    albumRepository = createMock<AlbumRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteLibraryAlbumHandler,
        { provide: AlbumRepository, useValue: albumRepository },
      ],
    }).compile();

    handler = module.get<DeleteLibraryAlbumHandler>(DeleteLibraryAlbumHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should delete an album successfully', async () => {
    const command = new DeleteLibraryAlbumCommand(mockAlbumId, mockUserId);
    const mockDeletedAlbum = { ...mockAlbum, deletedAt: new Date() };

    albumRepository.getByIdForAlbumOwner.mockResolvedValue(mockAlbum);
    albumRepository.softDelete.mockResolvedValue(mockDeletedAlbum);

    const result = await handler.execute(command);

    expect(result).toEqual(mockDeletedAlbum);
    expect(albumRepository.softDelete).toHaveBeenCalledWith(mockAlbumId);
  });

  it('should throw NotFoundException if album is missing or permission denied', async () => {
    const command = new DeleteLibraryAlbumCommand(mockAlbumId, mockUserId);
    albumRepository.getByIdForAlbumOwner.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw InternalServerErrorException if parsing fails', async () => {
    const command = new DeleteLibraryAlbumCommand(mockAlbumId, mockUserId);
    albumRepository.getByIdForAlbumOwner.mockResolvedValue(mockAlbum);
    albumRepository.softDelete.mockResolvedValue({ invalid: 'data' } as any);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
  });
});
