import { AlbumRepository } from '@/shared/repositories/album.repository';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AlbumSchema } from '@repo/contracts';
import { Album } from '@repo/db';
import { z } from 'zod';
// @ts-expect-error - ignore type errors from testing package imports
import { buildAlbum } from '@repo/testing';
import { UpdateLibraryAlbumCommand } from '../impl/update-library-album.command';
import { UpdateLibraryAlbumHandler } from './update-library-album.handler';

describe('UpdateLibraryAlbumHandler', () => {
  let handler: UpdateLibraryAlbumHandler;
  let albumRepository: DeepMocked<AlbumRepository>;

  const mockUserId = 'user-123';
  const mockAlbumId = 'album-123';
  const mockAlbum = buildAlbum({
    id: mockAlbumId,
    name: 'Old Name',
    description: 'Old Desc',
    coverId: 'old-cover',
  });

  beforeEach(async () => {
    albumRepository = createMock<AlbumRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateLibraryAlbumHandler,
        { provide: AlbumRepository, useValue: albumRepository },
      ],
    }).compile();

    handler = module.get<UpdateLibraryAlbumHandler>(UpdateLibraryAlbumHandler);
  });

  it('should update library album successfully', async () => {
    const request = { name: 'New Name' };
    const command = new UpdateLibraryAlbumCommand(mockAlbumId, request, mockUserId);

    albumRepository.findOne.mockResolvedValueOnce(mockAlbum);
    albumRepository.findOne.mockResolvedValueOnce(null);
    albumRepository.update.mockResolvedValue({ ...mockAlbum, ...request });
    vi.spyOn(AlbumSchema, 'safeParse').mockReturnValue({
      success: true,
      data: { ...mockAlbum, ...request },
    });

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

    albumRepository.findOne.mockResolvedValueOnce(mockAlbum);
    albumRepository.findOne.mockResolvedValueOnce(buildAlbum({ id: 'other' }));

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
  });

  it('should disconnect cover if coverId is null', async () => {
    const request = { coverId: null };
    const command = new UpdateLibraryAlbumCommand(mockAlbumId, request, mockUserId);

    albumRepository.findOne.mockResolvedValue(mockAlbum);
    albumRepository.update.mockResolvedValue({ ...mockAlbum, coverId: null });
    vi.spyOn(AlbumSchema, 'safeParse').mockReturnValue({ success: true, data: mockAlbum });

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
    vi.spyOn(AlbumSchema, 'safeParse').mockReturnValue({ success: true, data: mockAlbum });

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
    const invalidAlbum: Album = JSON.parse('{"invalid":"data"}');
    albumRepository.update.mockResolvedValue(invalidAlbum);
    vi.spyOn(AlbumSchema, 'safeParse').mockReturnValue({
      success: false,
      error: new z.ZodError([]),
    } as ReturnType<typeof AlbumSchema.safeParse>);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
  });
});
