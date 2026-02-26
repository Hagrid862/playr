import { AlbumRepository } from '@/shared/repositories/album.repository';
import { ImageRepository } from '@/shared/repositories/image.repository';
import { StorageService } from '@/shared/services/storage.service';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AlbumSchema, ZodAlbum } from '@repo/contracts';
import { FileBucket } from '@repo/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteLibraryAlbumCoverCommand } from '../impl/delete-library-album-cover.command';
import { DeleteLibraryAlbumCoverHandler } from './delete-library-album-cover.handler';

describe('DeleteLibraryAlbumCoverHandler', () => {
  let handler: DeleteLibraryAlbumCoverHandler;
  let albumRepository: DeepMocked<AlbumRepository>;
  let imageRepository: DeepMocked<ImageRepository>;
  let storageService: DeepMocked<StorageService>;
  let unitOfWork: DeepMocked<UnitOfWorkService>;

  const mockUserId = 'user-123';
  const mockAlbumId = 'album-123';
  const mockCoverId = 'cover-456';

  const mockAlbum: ZodAlbum = {
    id: mockAlbumId,
    name: 'Test Album',
    description: 'Test Description',
    type: 'album' as any,
    totalTracks: 10,
    totalDuration: 3000,
    releaseDate: new Date(),
    coverId: mockCoverId,
    visibility: 'public',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    cover: null,
    artists: [],
    tracks: [],
    genres: [],
  };

  const mockAlbumWithoutCover: ZodAlbum = {
    ...mockAlbum,
    coverId: null,
    cover: null,
  };

  const mockImage = {
    id: mockCoverId,
    bucket: FileBucket.private,
    key: 'covers/album-123/cover.webp',
    url: 'https://storage.url/cover.webp',
    mimeType: 'image/webp',
    alt: null,
    blurhash: null,
    reportId: null,
    uploadStatus: 'uploaded' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    albumRepository = createMock<AlbumRepository>();
    imageRepository = createMock<ImageRepository>();
    storageService = createMock<StorageService>();
    unitOfWork = createMock<UnitOfWorkService>();

    unitOfWork.runInTransaction.mockImplementation(async (work) => work());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteLibraryAlbumCoverHandler,
        { provide: AlbumRepository, useValue: albumRepository },
        { provide: ImageRepository, useValue: imageRepository },
        { provide: StorageService, useValue: storageService },
        { provide: UnitOfWorkService, useValue: unitOfWork },
      ],
    }).compile();

    handler = module.get<DeleteLibraryAlbumCoverHandler>(DeleteLibraryAlbumCoverHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should throw NotFoundException when album not found', async () => {
      const command = new DeleteLibraryAlbumCoverCommand(mockAlbumId, mockUserId);
      albumRepository.findOne.mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(command)).rejects.toThrow(
        'Album not found or permission denied',
      );
      expect(albumRepository.findOne).toHaveBeenCalledWith({
        id: mockAlbumId,
        access: { some: { userId: mockUserId, role: 'owner' } },
      });
    });

    it('should return album as-is when album has no cover', async () => {
      const command = new DeleteLibraryAlbumCoverCommand(mockAlbumId, mockUserId);
      albumRepository.findOne.mockResolvedValue(mockAlbumWithoutCover as any);

      const result = await handler.execute(command);

      expect(result).toEqual(mockAlbumWithoutCover);
      expect(unitOfWork.runInTransaction).not.toHaveBeenCalled();
      expect(imageRepository.findOne).not.toHaveBeenCalled();
      expect(storageService.deleteFile).not.toHaveBeenCalled();
    });

    it('should delete cover successfully and return updated album', async () => {
      const command = new DeleteLibraryAlbumCoverCommand(mockAlbumId, mockUserId);
      albumRepository.findOne.mockResolvedValue(mockAlbum as any);
      imageRepository.findOne.mockResolvedValue(mockImage as any);

      const expectedAlbum = { ...mockAlbum, coverId: null, cover: null };
      vi.spyOn(AlbumSchema, 'safeParse').mockReturnValue({
        success: true,
        data: expectedAlbum,
      } as any);

      const result = await handler.execute(command);

      expect(result).toEqual(expectedAlbum);
      expect(unitOfWork.runInTransaction).toHaveBeenCalled();
      expect(albumRepository.update).toHaveBeenCalledWith(mockAlbumId, {
        cover: { disconnect: true },
      });
      expect(imageRepository.delete).toHaveBeenCalledWith(mockCoverId);
      expect(imageRepository.findOne).toHaveBeenCalledWith({ id: mockCoverId });
      expect(storageService.deleteFile).toHaveBeenCalledWith(FileBucket.private, mockImage.key);
    });

    it('should not call storageService.deleteFile when image record not found', async () => {
      const command = new DeleteLibraryAlbumCoverCommand(mockAlbumId, mockUserId);
      albumRepository.findOne.mockResolvedValue(mockAlbum as any);
      imageRepository.findOne.mockResolvedValue(null);

      const expectedAlbum = { ...mockAlbum, coverId: null, cover: null };
      vi.spyOn(AlbumSchema, 'safeParse').mockReturnValue({
        success: true,
        data: expectedAlbum,
      } as any);

      const result = await handler.execute(command);

      expect(result).toEqual(expectedAlbum);
      expect(unitOfWork.runInTransaction).toHaveBeenCalled();
      expect(albumRepository.update).toHaveBeenCalledWith(mockAlbumId, {
        cover: { disconnect: true },
      });
      expect(imageRepository.delete).toHaveBeenCalledWith(mockCoverId);
      expect(storageService.deleteFile).not.toHaveBeenCalled();
    });

    it('should throw Error when AlbumSchema.safeParse fails', async () => {
      const command = new DeleteLibraryAlbumCoverCommand(mockAlbumId, mockUserId);
      albumRepository.findOne.mockResolvedValue(mockAlbum as any);
      imageRepository.findOne.mockResolvedValue(mockImage as any);

      vi.spyOn(AlbumSchema, 'safeParse').mockReturnValue({
        success: false,
        error: { format: () => ({}) },
      } as any);

      await expect(handler.execute(command)).rejects.toThrow('Failed to parse updated album');
    });

    it('should run album update and image delete within transaction', async () => {
      const command = new DeleteLibraryAlbumCoverCommand(mockAlbumId, mockUserId);
      albumRepository.findOne.mockResolvedValue(mockAlbum as any);
      imageRepository.findOne.mockResolvedValue(mockImage as any);

      const expectedAlbum = { ...mockAlbum, coverId: null, cover: null };
      vi.spyOn(AlbumSchema, 'safeParse').mockReturnValue({
        success: true,
        data: expectedAlbum,
      } as any);

      let workExecuted = false;
      unitOfWork.runInTransaction.mockImplementation(async (work) => {
        workExecuted = true;
        await work();
        return expectedAlbum as any;
      });

      await handler.execute(command);

      expect(workExecuted).toBe(true);
      expect(albumRepository.update).toHaveBeenCalledWith(mockAlbumId, {
        cover: { disconnect: true },
      });
      expect(imageRepository.delete).toHaveBeenCalledWith(mockCoverId);
    });

    it('should log error when storage delete fails but still return album', async () => {
      const command = new DeleteLibraryAlbumCoverCommand(mockAlbumId, mockUserId);
      albumRepository.findOne.mockResolvedValue(mockAlbum as any);
      imageRepository.findOne.mockResolvedValue(mockImage as any);
      storageService.deleteFile.mockRejectedValue(new Error('S3 delete failed'));

      const expectedAlbum = { ...mockAlbum, coverId: null, cover: null };
      vi.spyOn(AlbumSchema, 'safeParse').mockReturnValue({
        success: true,
        data: expectedAlbum,
      } as any);

      const loggerSpy = vi.spyOn(handler['logger'], 'error');

      const result = await handler.execute(command);

      expect(result).toEqual(expectedAlbum);
      // deleteFile returns a promise; handler catches and logs, so execution continues
      await vi.waitFor(() => {
        expect(loggerSpy).toHaveBeenCalledWith(
          `Failed to cleanup cover file from S3: ${mockImage.key}`,
          expect.any(Error),
        );
      });
    });
  });
});
