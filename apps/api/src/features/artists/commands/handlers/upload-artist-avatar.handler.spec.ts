import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { PrivateProfileRepository } from '@/shared/repositories/private-profile.repository';
import { ImageService } from '@/shared/services/image.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { StorageService } from '@/shared/services/storage.service';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FileBucket } from '@repo/db';
import { vi } from 'vitest';
import { UploadArtistAvatarCommand } from '../impl/upload-artist-avatar.command';
import { UploadArtistAvatarHandler } from './upload-artist-avatar.handler';

describe('UploadArtistAvatarHandler', () => {
  let handler: UploadArtistAvatarHandler;
  let artistRepository: ArtistRepository;
  let privateProfileRepository: PrivateProfileRepository;
  let storageService: StorageService;
  let imageService: ImageService;
  let prismaService: PrismaService;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadArtistAvatarHandler,
        {
          provide: ArtistRepository,
          useValue: {
            getByIdAndOwnerId: vi.fn(),
          },
        },
        {
          provide: PrivateProfileRepository,
          useValue: {
            getByUserId: vi.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            uploadFile: vi.fn(),
            deleteFile: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ImageService,
          useValue: {
            validateImage: vi.fn(),
            resizeToMaxDimension: vi.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            client: {
              image: {
                findUnique: vi.fn(),
              },
            },
            mainClient: {
              $transaction: vi.fn((cb) => cb(mockTx)),
            },
          },
        },
      ],
    }).compile();

    handler = module.get<UploadArtistAvatarHandler>(UploadArtistAvatarHandler);
    artistRepository = module.get<ArtistRepository>(ArtistRepository);
    privateProfileRepository = module.get<PrivateProfileRepository>(PrivateProfileRepository);
    storageService = module.get<StorageService>(StorageService);
    imageService = module.get<ImageService>(ImageService);
    prismaService = module.get<PrismaService>(PrismaService);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should upload artist avatar and cleanup old one successfully', async () => {
    const command = new UploadArtistAvatarCommand(
      'artist-123',
      Buffer.from('test'),
      'image/jpeg',
      'user-123',
    );

    vi.mocked(privateProfileRepository.getByUserId).mockResolvedValue({ id: 'pp-123' } as any);
    vi.mocked(artistRepository.getByIdAndOwnerId).mockResolvedValue({
      id: 'artist-123',
      avatarId: 'img-old',
    } as any);
    vi.mocked(prismaService.client.image.findUnique).mockResolvedValue({
      id: 'img-old',
      bucket: FileBucket.public,
      key: 'old-key',
    } as any);
    vi.mocked(imageService.validateImage).mockResolvedValue(true);
    vi.mocked(imageService.resizeToMaxDimension).mockResolvedValue(Buffer.from('processed'));
    vi.mocked(storageService.uploadFile).mockResolvedValue({ url: 'new-url', key: 'new-key' });

    const result = await handler.execute(command);
    const expectedNewKey = `artists/artist-123/avatar-${new Date('2024-01-01').getTime()}.webp`;

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
    const command = new UploadArtistAvatarCommand(
      'artist-123',
      Buffer.from('test'),
      'image/jpeg',
      'user-123',
    );

    vi.mocked(privateProfileRepository.getByUserId).mockResolvedValue({ id: 'pp-123' } as any);
    vi.mocked(artistRepository.getByIdAndOwnerId).mockResolvedValue({ id: 'artist-123' } as any);
    vi.mocked(imageService.validateImage).mockResolvedValue(true);
    vi.mocked(imageService.resizeToMaxDimension).mockResolvedValue(Buffer.from('processed'));
    vi.mocked(storageService.uploadFile).mockImplementation(async (_buf, _bucket, key) => ({
      url: 'new-url',
      key,
    }));

    vi.mocked(prismaService.mainClient.$transaction).mockRejectedValue(new Error('DB Error'));

    await expect(handler.execute(command)).rejects.toThrow('DB Error');

    const expectedNewKey = `artists/artist-123/avatar-${new Date('2024-01-01').getTime()}.webp`;
    expect(storageService.deleteFile).toHaveBeenCalledWith(FileBucket.public, expectedNewKey);
  });

  it('should throw PreconditionFailedException if user private profile not found', async () => {
    const command = new UploadArtistAvatarCommand(
      'artist-123',
      Buffer.from('test'),
      'image/jpeg',
      'user-123',
    );

    vi.mocked(privateProfileRepository.getByUserId).mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(PreconditionFailedException);
  });

  it('should throw NotFoundException if artist not found', async () => {
    const command = new UploadArtistAvatarCommand(
      'artist-123',
      Buffer.from('test'),
      'image/jpeg',
      'user-123',
    );

    vi.mocked(privateProfileRepository.getByUserId).mockResolvedValue({ id: 'pp-123' } as any);
    vi.mocked(artistRepository.getByIdAndOwnerId).mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if image is invalid', async () => {
    const command = new UploadArtistAvatarCommand(
      'artist-123',
      Buffer.from('test'),
      'image/jpeg',
      'user-123',
    );

    vi.mocked(privateProfileRepository.getByUserId).mockResolvedValue({ id: 'pp-123' } as any);
    vi.mocked(artistRepository.getByIdAndOwnerId).mockResolvedValue({ id: 'artist-123' } as any);
    vi.mocked(imageService.validateImage).mockResolvedValue(false);

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('should throw InternalServerErrorException if created image is invalid', async () => {
    const command = new UploadArtistAvatarCommand(
      'artist-123',
      Buffer.from('test'),
      'image/jpeg',
      'user-123',
    );

    vi.mocked(privateProfileRepository.getByUserId).mockResolvedValue({ id: 'pp-123' } as any);
    vi.mocked(artistRepository.getByIdAndOwnerId).mockResolvedValue({ id: 'artist-123' } as any);
    vi.mocked(imageService.validateImage).mockResolvedValue(true);
    vi.mocked(imageService.resizeToMaxDimension).mockResolvedValue(Buffer.from('processed'));
    vi.mocked(storageService.uploadFile).mockResolvedValue({ url: 'new-url', key: 'new-key' });

    // Mock create to return invalid image (missing required fields for ZodImage)
    vi.mocked(mockTx.image.create).mockResolvedValueOnce({
      id: 'img-new',
      // missing other required fields
    } as any);

    await expect(handler.execute(command)).rejects.toThrow(InternalServerErrorException);

    // Cleanup should be called
    const expectedNewKey = `artists/artist-123/avatar-${new Date('2024-01-01').getTime()}.webp`;
    expect(storageService.deleteFile).toHaveBeenCalledWith(FileBucket.public, expectedNewKey);
  });

  it('should log error if old file cleanup fails', async () => {
    const command = new UploadArtistAvatarCommand(
      'artist-123',
      Buffer.from('test'),
      'image/jpeg',
      'user-123',
    );

    vi.mocked(privateProfileRepository.getByUserId).mockResolvedValue({ id: 'pp-123' } as any);
    vi.mocked(artistRepository.getByIdAndOwnerId).mockResolvedValue({
      id: 'artist-123',
      avatarId: 'img-old',
    } as any);
    vi.mocked(prismaService.client.image.findUnique).mockResolvedValue({
      id: 'img-old',
      bucket: FileBucket.public,
      key: 'old-key',
    } as any);
    vi.mocked(imageService.validateImage).mockResolvedValue(true);
    vi.mocked(imageService.resizeToMaxDimension).mockResolvedValue(Buffer.from('processed'));
    vi.mocked(storageService.uploadFile).mockResolvedValue({ url: 'new-url', key: 'new-key' });

    const loggerSpy = vi.spyOn((handler as any).logger, 'error').mockImplementation(() => {});
    vi.mocked(storageService.deleteFile).mockRejectedValue(new Error('Delete error'));

    await handler.execute(command);

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to cleanup old avatar file'),
      expect.any(Error),
    );
  });

  it('should log error if new file cleanup fails after DB error', async () => {
    const command = new UploadArtistAvatarCommand(
      'artist-123',
      Buffer.from('test'),
      'image/jpeg',
      'user-123',
    );

    vi.mocked(privateProfileRepository.getByUserId).mockResolvedValue({ id: 'pp-123' } as any);
    vi.mocked(artistRepository.getByIdAndOwnerId).mockResolvedValue({ id: 'artist-123' } as any);
    vi.mocked(imageService.validateImage).mockResolvedValue(true);
    vi.mocked(imageService.resizeToMaxDimension).mockResolvedValue(Buffer.from('processed'));
    vi.mocked(storageService.uploadFile).mockResolvedValue({ url: 'new-url', key: 'new-key' });

    vi.mocked(prismaService.mainClient.$transaction).mockRejectedValue(new Error('DB Error'));

    const loggerSpy = vi.spyOn((handler as any).logger, 'error').mockImplementation(() => {});
    vi.mocked(storageService.deleteFile).mockRejectedValue(new Error('Delete error'));

    // Should still throw the original DB error
    await expect(handler.execute(command)).rejects.toThrow('DB Error');

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to cleanup new avatar file'),
      expect.any(Error),
    );
  });

  it('should handle orphaned old avatar (exists in artist but not in image table) successfully', async () => {
    const command = new UploadArtistAvatarCommand(
      'artist-123',
      Buffer.from('test'),
      'image/jpeg',
      'user-123',
    );

    vi.mocked(privateProfileRepository.getByUserId).mockResolvedValue({ id: 'pp-123' } as any);
    vi.mocked(artistRepository.getByIdAndOwnerId).mockResolvedValue({
      id: 'artist-123',
      avatarId: 'img-old',
    } as any);
    vi.mocked(prismaService.client.image.findUnique).mockResolvedValue(null); // Orphaned
    vi.mocked(imageService.validateImage).mockResolvedValue(true);
    vi.mocked(imageService.resizeToMaxDimension).mockResolvedValue(Buffer.from('processed'));
    vi.mocked(storageService.uploadFile).mockResolvedValue({ url: 'new-url', key: 'new-key' });

    const result = await handler.execute(command);
    const expectedNewKey = `artists/artist-123/avatar-${new Date('2024-01-01').getTime()}.webp`;

    expect(result.id).toBe('img-new');
    expect(storageService.uploadFile).toHaveBeenCalledWith(
      expect.any(Buffer),
      FileBucket.public,
      expectedNewKey,
      expect.any(Object),
    );
    expect(mockTx.image.delete).toHaveBeenCalledWith({ where: { id: 'img-old' } });

    // Should NOT attempt to delete old file from storage because it wasn't found
    expect(storageService.deleteFile).not.toHaveBeenCalledWith(FileBucket.public, 'old-key');
  });
});
