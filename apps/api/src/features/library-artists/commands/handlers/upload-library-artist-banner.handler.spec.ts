import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { ImageService } from '@/shared/services/image.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { StorageService } from '@/shared/services/storage.service';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FileBucket } from '@repo/db';
import { artistBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadLibraryArtistBannerCommand } from '../impl/upload-library-artist-banner.command';
import { UploadLibraryArtistBannerHandler } from './upload-library-artist-banner.handler';

describe('UploadLibraryArtistBannerHandler', () => {
  let handler: UploadLibraryArtistBannerHandler;
  let artistRepository: DeepMocked<ArtistRepository>;
  let storageService: DeepMocked<StorageService>;
  let imageService: DeepMocked<ImageService>;
  let prismaService: DeepMocked<PrismaService>;

  const mockTx = {
    image: {
      create: vi.fn().mockResolvedValue({
        id: 'img-new',
        alt: null,
        bucket: FileBucket.public,
        key: 'new-key',
        url: 'new-url',
        mimeType: 'image/webp',
        blurhash: null,
        reportId: null,
        uploadStatus: 'uploaded',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }),
      delete: vi.fn(),
    },
    artist: {
      update: vi.fn(),
    },
  };
  const buildArtistWithRelations = (
    overrides?: Parameters<typeof artistBuilder>[0],
  ): NonNullable<Awaited<ReturnType<ArtistRepository['findOne']>>> => ({
    ...artistBuilder(overrides),
    avatar: null,
    banner: null,
  });

  beforeEach(async () => {
    artistRepository = createMock<ArtistRepository>();
    storageService = createMock<StorageService>();
    imageService = createMock<ImageService>();
    prismaService = createMock<PrismaService>();

    storageService.deleteFile.mockResolvedValue(undefined);
    // DeepMocked<PrismaService> does not expose client/mainClient; these casts are a deliberate
    // workaround to inject mocked implementations (image.findUnique, mainClient.$transaction with
    // mockTx) so transactional code in the handler can be tested.
    (prismaService as any).client = {
      image: { findUnique: vi.fn() },
    };
    (prismaService as any).mainClient = {
      $transaction: vi.fn((cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadLibraryArtistBannerHandler,
        { provide: ArtistRepository, useValue: artistRepository },
        { provide: StorageService, useValue: storageService },
        { provide: ImageService, useValue: imageService },
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    handler = module.get<UploadLibraryArtistBannerHandler>(UploadLibraryArtistBannerHandler);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should upload artist banner and cleanup old one successfully', async () => {
    const command = new UploadLibraryArtistBannerCommand(
      'artist-123',
      Buffer.from('test'),
      'image/jpeg',
      'user-123',
    );

    const mockArtist = buildArtistWithRelations({ id: 'artist-123', bannerId: 'img-old' });
    artistRepository.findOne.mockResolvedValue(mockArtist);
    vi.mocked((prismaService as any).client.image.findUnique).mockResolvedValue({
      id: 'img-old',
      bucket: FileBucket.public,
      key: 'old-key',
    } as any);
    imageService.validateImage.mockResolvedValue(true);
    imageService.resizeToMaxDimension.mockResolvedValue(Buffer.from('processed'));
    storageService.uploadFile.mockResolvedValue({ url: 'new-url', key: 'new-key' });

    const result = await handler.execute(command);
    const expectedNewKey = `artists/artist-123/banner-${new Date('2024-01-01').getTime()}.webp`;

    expect(result.id).toBe('img-new');
    expect(storageService.uploadFile).toHaveBeenCalledWith(
      expect.any(Buffer),
      FileBucket.public,
      expectedNewKey,
      expect.any(Object),
    );
    expect(mockTx.image.delete).toHaveBeenCalledWith({ where: { id: 'img-old' } });

    expect(storageService.deleteFile).toHaveBeenCalledWith(FileBucket.public, 'old-key');
  });

  it('should cleanup newly uploaded file if transaction fails', async () => {
    const command = new UploadLibraryArtistBannerCommand(
      'artist-123',
      Buffer.from('test'),
      'image/jpeg',
      'user-123',
    );

    artistRepository.findOne.mockResolvedValue(buildArtistWithRelations({ id: 'artist-123' }));
    imageService.validateImage.mockResolvedValue(true);
    imageService.resizeToMaxDimension.mockResolvedValue(Buffer.from('processed'));
    storageService.uploadFile.mockImplementation(async (_buf, _bucket, key) => ({
      url: 'new-url',
      key,
    }));

    vi.mocked((prismaService as any).mainClient.$transaction).mockRejectedValue(
      new Error('DB Error'),
    );

    await expect(handler.execute(command)).rejects.toThrow('DB Error');

    const expectedNewKey = `artists/artist-123/banner-${new Date('2024-01-01').getTime()}.webp`;
    expect(storageService.deleteFile).toHaveBeenCalledWith(FileBucket.public, expectedNewKey);
  });

  it('should throw NotFoundException if artist not found', async () => {
    const command = new UploadLibraryArtistBannerCommand(
      'artist-123',
      Buffer.from('test'),
      'image/jpeg',
      'user-123',
    );

    artistRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if image is invalid', async () => {
    const command = new UploadLibraryArtistBannerCommand(
      'artist-123',
      Buffer.from('test'),
      'image/jpeg',
      'user-123',
    );

    artistRepository.findOne.mockResolvedValue(buildArtistWithRelations({ id: 'artist-123' }));
    imageService.validateImage.mockResolvedValue(false);

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('should throw InternalServerErrorException if created image is invalid', async () => {
    const command = new UploadLibraryArtistBannerCommand(
      'artist-123',
      Buffer.from('test'),
      'image/jpeg',
      'user-123',
    );

    artistRepository.findOne.mockResolvedValue(buildArtistWithRelations({ id: 'artist-123' }));
    imageService.validateImage.mockResolvedValue(true);
    imageService.resizeToMaxDimension.mockResolvedValue(Buffer.from('processed'));
    storageService.uploadFile.mockResolvedValue({ url: 'new-url', key: 'new-key' });

    vi.mocked(mockTx.image.create).mockResolvedValueOnce({
      id: 'img-new',
      // missing other required fields
    } as any);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);

    const expectedNewKey = `artists/artist-123/banner-${new Date('2024-01-01').getTime()}.webp`;
    expect(storageService.deleteFile).toHaveBeenCalledWith(FileBucket.public, expectedNewKey);
  });

  it('should log error if old file cleanup fails', async () => {
    const command = new UploadLibraryArtistBannerCommand(
      'artist-123',
      Buffer.from('test'),
      'image/jpeg',
      'user-123',
    );

    artistRepository.findOne.mockResolvedValue(
      buildArtistWithRelations({ id: 'artist-123', bannerId: 'img-old' }),
    );
    vi.mocked((prismaService as any).client.image.findUnique).mockResolvedValue({
      id: 'img-old',
      bucket: FileBucket.public,
      key: 'old-key',
    } as any);
    imageService.validateImage.mockResolvedValue(true);
    imageService.resizeToMaxDimension.mockResolvedValue(Buffer.from('processed'));
    storageService.uploadFile.mockResolvedValue({ url: 'new-url', key: 'new-key' });

    const loggerSpy = vi.spyOn((handler as any).logger, 'error').mockImplementation(() => {});
    storageService.deleteFile.mockRejectedValue(new Error('Delete error'));

    await handler.execute(command);

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to cleanup old banner file'),
      expect.any(Error),
    );
  });

  it('should log error if new file cleanup fails after DB error', async () => {
    const command = new UploadLibraryArtistBannerCommand(
      'artist-123',
      Buffer.from('test'),
      'image/jpeg',
      'user-123',
    );

    artistRepository.findOne.mockResolvedValue(buildArtistWithRelations({ id: 'artist-123' }));
    imageService.validateImage.mockResolvedValue(true);
    imageService.resizeToMaxDimension.mockResolvedValue(Buffer.from('processed'));
    storageService.uploadFile.mockResolvedValue({ url: 'new-url', key: 'new-key' });

    vi.mocked((prismaService as any).mainClient.$transaction).mockRejectedValue(
      new Error('DB Error'),
    );

    const loggerSpy = vi.spyOn((handler as any).logger, 'error').mockImplementation(() => {});
    storageService.deleteFile.mockRejectedValue(new Error('Delete error'));

    await expect(handler.execute(command)).rejects.toThrow('DB Error');

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to cleanup new banner file'),
      expect.any(Error),
    );
  });

  it('should handle orphaned old banner (exists in artist but not in image table) successfully', async () => {
    const command = new UploadLibraryArtistBannerCommand(
      'artist-123',
      Buffer.from('test'),
      'image/jpeg',
      'user-123',
    );

    artistRepository.findOne.mockResolvedValue(
      buildArtistWithRelations({ id: 'artist-123', bannerId: 'img-old' }),
    );
    vi.mocked((prismaService as any).client.image.findUnique).mockResolvedValue(null);
    imageService.validateImage.mockResolvedValue(true);
    imageService.resizeToMaxDimension.mockResolvedValue(Buffer.from('processed'));
    storageService.uploadFile.mockResolvedValue({ url: 'new-url', key: 'new-key' });

    const result = await handler.execute(command);
    const expectedNewKey = `artists/artist-123/banner-${new Date('2024-01-01').getTime()}.webp`;

    expect(result.id).toBe('img-new');
    expect(storageService.uploadFile).toHaveBeenCalledWith(
      expect.any(Buffer),
      FileBucket.public,
      expectedNewKey,
      expect.any(Object),
    );
    expect(mockTx.image.delete).toHaveBeenCalledWith({ where: { id: 'img-old' } });

    expect(storageService.deleteFile).not.toHaveBeenCalledWith(FileBucket.public, 'old-key');
  });
});
