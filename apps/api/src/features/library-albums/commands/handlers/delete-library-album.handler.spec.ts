import { AlbumRepository } from '@/shared/repositories/album.repository';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ZodAlbum } from '@repo/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { DeleteLibraryAlbumCommand } from '../impl/delete-library-album.command';
import { DeleteLibraryAlbumHandler } from './delete-library-album.handler';

describe('DeleteLibraryAlbumHandler', () => {
  let handler: DeleteLibraryAlbumHandler;
  let albumRepository: DeepMocked<AlbumRepository>;

  const mockUserId = 'user-123';
  const mockAlbumId = 'album-123';
  const mockAlbum: ZodAlbum = {
    id: mockAlbumId,
    name: 'Test Album',
    description: 'Test Description',
    type: 'album' as any,
    totalTracks: 10,
    totalDuration: 3000,
    releaseDate: new Date(),
    coverId: null,
    visibility: 'PUBLIC',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    cover: null,
    artists: [],
    tracks: [],
    genres: [],
  };

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

  it('should delete an album successfully', async () => {
    const command = new DeleteLibraryAlbumCommand(mockAlbumId, mockUserId);
    const mockDeletedAlbum = { ...mockAlbum, deletedAt: new Date() };

    albumRepository.findOne.mockResolvedValue(mockAlbum as any);
    albumRepository.update.mockResolvedValue(mockDeletedAlbum as any);

    const result = await handler.execute(command);

    expect(result).toEqual(mockDeletedAlbum);
    expect(albumRepository.update).toHaveBeenCalledWith(mockAlbumId, {
      deletedAt: expect.any(Date),
    });
  });

  it('should throw NotFoundException if album is missing or permission denied', async () => {
    const command = new DeleteLibraryAlbumCommand(mockAlbumId, mockUserId);
    albumRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw InternalServerErrorException if parsing fails', async () => {
    const command = new DeleteLibraryAlbumCommand(mockAlbumId, mockUserId);
    albumRepository.findOne.mockResolvedValue(mockAlbum as any);
    albumRepository.update.mockResolvedValue({ invalid: 'data' } as any);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
  });
});
