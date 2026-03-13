import { AlbumRepository } from '@/shared/repositories/album.repository';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Album } from '@repo/db';
// @ts-expect-error - ignore type errors from testing package imports
import { buildAlbum } from '@repo/testing';
import { DeleteLibraryAlbumCommand } from '../impl/delete-library-album.command';
import { DeleteLibraryAlbumHandler } from './delete-library-album.handler';

describe('DeleteLibraryAlbumHandler', () => {
  let handler: DeleteLibraryAlbumHandler;
  let albumRepository: DeepMocked<AlbumRepository>;

  const mockUserId = 'user-123';
  const mockAlbumId = 'album-123';
  const mockAlbum = buildAlbum({
    id: mockAlbumId,
    name: 'Test Album',
    description: 'Test Description',
    totalTracks: 10,
    totalDuration: 3000,
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

  it('should delete an album successfully', async () => {
    const command = new DeleteLibraryAlbumCommand(mockAlbumId, mockUserId);
    const mockDeletedAlbum = { ...mockAlbum, deletedAt: new Date() };

    albumRepository.findOne.mockResolvedValue(mockAlbum);
    albumRepository.update.mockResolvedValue(mockDeletedAlbum);

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
    albumRepository.findOne.mockResolvedValue(mockAlbum);
    const invalidAlbum: Album = JSON.parse('{"invalid":"data"}');
    albumRepository.update.mockResolvedValue(invalidAlbum);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
  });
});
