import { AlbumRepository } from '@/shared/repositories/album.repository';
import { ImageService } from '@/shared/services/image.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { StorageService } from '@/shared/services/storage.service';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ImageSchema } from '@repo/contracts';
import { FileBucket } from '@repo/db';
// @ts-expect-error - ignore type errors from testing package imports
import { buildAlbum, buildImage } from '@repo/testing';
import { z } from 'zod';
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

  const mockAlbum = buildAlbum({
    id: mockAlbumId,
    name: 'Test Album',
  });

  const mockImageRecord = buildImage({
    id: 'img-123',
    bucket: FileBucket.public,
    key: 'key.webp',
    url: 'http://bucket/key.webp',
    mimeType: 'image/webp',
  });

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

    albumRepository.findOne.mockResolvedValue(mockAlbum);
    imageService.validateImage.mockResolvedValue(true);
    imageService.resizeToMaxDimension.mockResolvedValue(mockBuffer);
    storageService.uploadFile.mockResolvedValue({
      url: 'http://bucket/key.webp',
      key: 'key.webp',
    });

    prisma.client.image.create.mockResolvedValue(mockImageRecord);

    prisma.client.album.update.mockResolvedValue({
      ...mockAlbum,
      coverId: 'img-123',
    });

    vi.spyOn(ImageSchema, 'safeParse').mockReturnValue({
      success: true,
      data: mockImageRecord,
    });

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

    albumRepository.findOne.mockResolvedValue(mockAlbumWithCover);
    imageService.validateImage.mockResolvedValue(true);
    imageService.resizeToMaxDimension.mockResolvedValue(mockBuffer);
    storageService.uploadFile.mockResolvedValue({
      url: 'new-url',
      key: 'new-key',
    });

    prisma.client.image.findUnique.mockResolvedValue({
      ...mockImageRecord,
      id: 'old-cover-id',
      key: 'old-key',
    });

    prisma.client.image.create.mockResolvedValue({
      ...mockImageRecord,
      id: 'new-cover-id',
      url: 'new-url',
      key: 'new-key',
    });
    prisma.client.album.update.mockResolvedValue(mockAlbum);
    vi.spyOn(ImageSchema, 'safeParse').mockReturnValue({
      success: true,
      data: mockImageRecord,
    });

    await handler.execute(command);

    // DB deletion
    expect(prisma.client.image.delete).toHaveBeenCalledWith({
      where: { id: 'old-cover-id' },
    });

    // S3 deletion
    expect(storageService.deleteFile).toHaveBeenCalledWith(FileBucket.public, 'old-key');
  });

  it('should not attempt to cleanup S3 if old cover image record not found in DB', async () => {
    const command = new UploadLibraryAlbumCoverCommand(
      mockAlbumId,
      mockBuffer,
      mockMimeType,
      mockUserId,
    );
    const mockAlbumWithCover = { ...mockAlbum, coverId: 'old-cover-id' };

    albumRepository.findOne.mockResolvedValue(mockAlbumWithCover);
    imageService.validateImage.mockResolvedValue(true);
    imageService.resizeToMaxDimension.mockResolvedValue(mockBuffer);
    storageService.uploadFile.mockResolvedValue({ url: 'new-url', key: 'new-key' });

    prisma.client.image.findUnique.mockResolvedValue(null); // Not found!

    prisma.client.image.create.mockResolvedValue({ ...mockImageRecord, id: 'new-cover-id' });
    prisma.client.album.update.mockResolvedValue(mockAlbum);
    vi.spyOn(ImageSchema, 'safeParse').mockReturnValue({
      success: true,
      data: mockImageRecord,
    });

    await handler.execute(command);

    expect(storageService.deleteFile).not.toHaveBeenCalledWith('public', expect.any(String));
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
    albumRepository.findOne.mockResolvedValue(mockAlbum);
    imageService.validateImage.mockResolvedValue(false);

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('should throw InternalServerErrorException if image record parsing fails', async () => {
    const command = new UploadLibraryAlbumCoverCommand(
      mockAlbumId,
      mockBuffer,
      mockMimeType,
      mockUserId,
    );

    albumRepository.findOne.mockResolvedValue(mockAlbum);
    imageService.validateImage.mockResolvedValue(true);
    imageService.resizeToMaxDimension.mockResolvedValue(mockBuffer);
    storageService.uploadFile.mockResolvedValue({
      url: 'http://bucket/key.webp',
      key: 'key.webp',
    });

    prisma.client.image.create.mockResolvedValue(mockImageRecord);
    vi.spyOn(ImageSchema, 'safeParse').mockReturnValue({
      success: false,
      error: new z.ZodError([]),
    } as ReturnType<typeof ImageSchema.safeParse>);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);
  });

  it('should log error if old cover cleanup fails', async () => {
    const command = new UploadLibraryAlbumCoverCommand(
      mockAlbumId,
      mockBuffer,
      mockMimeType,
      mockUserId,
    );
    const mockAlbumWithCover = { ...mockAlbum, coverId: 'old-cover-id' };

    albumRepository.findOne.mockResolvedValue(mockAlbumWithCover);
    imageService.validateImage.mockResolvedValue(true);
    imageService.resizeToMaxDimension.mockResolvedValue(mockBuffer);
    storageService.uploadFile.mockResolvedValue({ url: 'new-url', key: 'new-key' });

    prisma.client.image.findUnique.mockResolvedValue({
      ...mockImageRecord,
      id: 'old-cover-id',
      key: 'old-key',
    });

    prisma.client.image.create.mockResolvedValue({ ...mockImageRecord, id: 'new-cover-id' });
    prisma.client.album.update.mockResolvedValue(mockAlbum);

    const loggerSpy = vi.spyOn(Logger.prototype, 'error');
    storageService.deleteFile.mockRejectedValueOnce(new Error('S3 delete failed'));
    vi.spyOn(ImageSchema, 'safeParse').mockReturnValue({
      success: true,
      data: mockImageRecord,
    });

    await handler.execute(command);

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to cleanup old cover file'),
      expect.any(Error),
    );
  });

  it('should cleanup new cover and log error if transaction fails', async () => {
    const command = new UploadLibraryAlbumCoverCommand(
      mockAlbumId,
      mockBuffer,
      mockMimeType,
      mockUserId,
    );

    albumRepository.findOne.mockResolvedValue(mockAlbum);
    imageService.validateImage.mockResolvedValue(true);
    imageService.resizeToMaxDimension.mockResolvedValue(mockBuffer);
    storageService.uploadFile.mockResolvedValue({ url: 'new-url', key: 'new-key' });

    prisma.mainClient.$transaction.mockRejectedValue(new Error('Transaction failed'));

    const loggerSpy = vi.spyOn(Logger.prototype, 'error');
    storageService.deleteFile.mockRejectedValueOnce(new Error('Cleanup delete failed'));

    await expect(handler.execute(command)).rejects.toThrow('Transaction failed');

    expect(storageService.deleteFile).toHaveBeenCalledWith(FileBucket.public, expect.any(String));
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to cleanup new cover file after transaction failure'),
      expect.any(Error),
    );
  });
});
