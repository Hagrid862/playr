import { AlbumRepository } from '@/shared/repositories/album.repository';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AlbumSchema } from '@repo/contracts';
import { Album } from '@repo/db';
import { z } from 'zod';
// @ts-expect-error - ignore type errors from testing package imports
import { buildAlbum } from '@repo/testing';
import { GetLibraryAlbumQuery } from '../impl/get-library-album.query';
import { GetLibraryAlbumHandler } from './get-library-album.handler';

describe('GetLibraryAlbumHandler', () => {
  let handler: GetLibraryAlbumHandler;
  let albumRepository: DeepMocked<AlbumRepository>;

  const mockAlbumId = 'album-123';
  const mockUserId = 'user-123';
  const mockAlbum = buildAlbum({
    id: mockAlbumId,
    name: 'Test Album',
  });

  beforeEach(async () => {
    albumRepository = createMock<AlbumRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [GetLibraryAlbumHandler, { provide: AlbumRepository, useValue: albumRepository }],
    }).compile();

    handler = module.get<GetLibraryAlbumHandler>(GetLibraryAlbumHandler);
  });

  it('should return album successfully', async () => {
    const query = new GetLibraryAlbumQuery(mockAlbumId, mockUserId);
    albumRepository.findOne.mockResolvedValue(mockAlbum);
    vi.spyOn(AlbumSchema, 'safeParse').mockReturnValue({ success: true, data: mockAlbum });

    const result = await handler.execute(query);

    expect(result.id).toBe(mockAlbumId);
    expect(albumRepository.findOne).toHaveBeenCalledWith({ id: mockAlbumId }, true);
  });

  it('should throw NotFoundException if album not found', async () => {
    const query = new GetLibraryAlbumQuery(mockAlbumId, mockUserId);
    albumRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
  });

  it('should throw InternalServerErrorException if result parsing fails', async () => {
    const query = new GetLibraryAlbumQuery(mockAlbumId, mockUserId);
    const invalidAlbum: Album = JSON.parse('{"invalid":"data"}');
    albumRepository.findOne.mockResolvedValue(invalidAlbum);
    vi.spyOn(AlbumSchema, 'safeParse').mockReturnValue({
      success: false,
      error: new z.ZodError([]),
    } as ReturnType<typeof AlbumSchema.safeParse>);

    await expect(handler.execute(query)).rejects.toThrow(InternalServerErrorException);
  });
});
