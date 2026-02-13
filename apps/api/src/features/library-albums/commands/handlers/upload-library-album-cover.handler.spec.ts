import { AlbumRepository } from '@/shared/repositories/album.repository';
import { ImageService } from '@/shared/services/image.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { StorageService } from '@/shared/services/storage.service';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FileBucket } from '@repo/db';
import { beforeEach, describe, expect, it } from 'vitest';
import { UploadLibraryAlbumCoverCommand } from '../impl/upload-library-album-cover.command';
import { UploadLibraryAlbumCoverHandler } from './upload-library-album-cover.handler';

describe('UploadLibraryAlbumCoverHandler', () => {
  let handler: UploadLibraryAlbumCoverHandler;
  let albumRepository: DeepMocked<AlbumRepository>;
  let storageService: DeepMocked<StorageService>;
  let imageService: DeepMocked<ImageService>;
  let prisma: DeepMocked<PrismaService>;

  const mockUserId = 'user-123';
  const mockAlbumId = 'album-123';
  const mockBuffer = Buffer.from('test-image');
  const mockMimeType = 'image/png';

  const mockAlbum = {
    id: mockAlbumId,
    coverId: null,
  };

  const mockImageRecord = {
    id: 'img-123',
    alt: null,
    bucket: FileBucket.public,
    key: 'key.webp',
    url: 'http://bucket/key.webp',
    mimeType: 'image/webp',
    blurhash: null,
    reportId: null,
    uploadStatus: 'uploaded',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    albumRepository = createMock<AlbumRepository>();
    storageService = createMock<StorageService>();
    imageService = createMock<ImageService>();
    prisma = createMock<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadLibraryAlbumCoverHandler,
        { provide: AlbumRepository, useValue: albumRepository },
        { provide: StorageService, useValue: storageService },
        { provide: ImageService, useValue: imageService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    handler = module.get<UploadLibraryAlbumCoverHandler>(UploadLibraryAlbumCoverHandler);

    // Mock Prisma Transaction
    prisma.mainClient.$transaction.mockImplementation(async (cb) => cb(prisma.client));
  });

  it('should upload album cover successfully', async () => {
    const command = new UploadLibraryAlbumCoverCommand(
      mockAlbumId,
      mockBuffer,
      mockMimeType,
      mockUserId,
    );

    albumRepository.findOne.mockResolvedValue(mockAlbum as any);
    imageService.validateImage.mockResolvedValue(true);
    imageService.resizeToMaxDimension.mockResolvedValue(mockBuffer);
    storageService.uploadFile.mockResolvedValue({
      url: 'http://bucket/key.webp',
      key: 'key.webp',
    });

    prisma.client.image.create.mockResolvedValue(mockImageRecord as any);

    prisma.client.album.update.mockResolvedValue({
      id: mockAlbumId,
      coverId: 'img-123',
    } as any);

    const result = await handler.execute(command);

    expect(result.id).toBe('img-123');
    expect(storageService.uploadFile).toHaveBeenCalled();
    expect(prisma.client.image.create).toHaveBeenCalled();
    expect(prisma.client.album.update).toHaveBeenCalledWith({
      where: { id: mockAlbumId },
      data: { coverId: 'img-123' },
    });
  });

  it('should cleanup old cover if exists', async () => {
    const command = new UploadLibraryAlbumCoverCommand(
      mockAlbumId,
      mockBuffer,
      mockMimeType,
      mockUserId,
    );
    const mockAlbumWithCover = { ...mockAlbum, coverId: 'old-cover-id' };

    albumRepository.findOne.mockResolvedValue(mockAlbumWithCover as any);
    imageService.validateImage.mockResolvedValue(true);
    imageService.resizeToMaxDimension.mockResolvedValue(mockBuffer);
    storageService.uploadFile.mockResolvedValue({
      url: 'new-url',
      key: 'new-key',
    });

    prisma.client.image.findUnique.mockResolvedValue({
      id: 'old-cover-id',
      bucket: 'public',
      key: 'old-key',
    } as any);

    prisma.client.image.create.mockResolvedValue({
      ...mockImageRecord,
      id: 'new-cover-id',
      url: 'new-url',
      key: 'new-key',
    } as any);
    prisma.client.album.update.mockResolvedValue({} as any);

    await handler.execute(command);

    // DB deletion
    expect(prisma.client.image.delete).toHaveBeenCalledWith({
      where: { id: 'old-cover-id' },
    });

    // S3 deletion
    expect(storageService.deleteFile).toHaveBeenCalledWith('public', 'old-key');
  });

  it('should throw NotFoundException if album not found', async () => {
    const command = new UploadLibraryAlbumCoverCommand(
      mockAlbumId,
      mockBuffer,
      mockMimeType,
      mockUserId,
    );
    albumRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if image invalid', async () => {
    const command = new UploadLibraryAlbumCoverCommand(
      mockAlbumId,
      mockBuffer,
      mockMimeType,
      mockUserId,
    );
    albumRepository.findOne.mockResolvedValue(mockAlbum as any);
    imageService.validateImage.mockResolvedValue(false);

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });
});
