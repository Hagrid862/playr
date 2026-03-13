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
// @ts-expect-error - ignore type errors from testing package imports
import { buildArtist, buildImage } from '@repo/testing';
import { UploadLibraryArtistBannerCommand } from '../impl/upload-library-artist-banner.command';
import { UploadLibraryArtistBannerHandler } from './upload-library-artist-banner.handler';

describe('UploadLibraryArtistBannerHandler', () => {
  let handler: UploadLibraryArtistBannerHandler;
  let artistRepository: ArtistRepository;
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
        UploadLibraryArtistBannerHandler,
        {
          provide: ArtistRepository,
          useValue: {
            findOne: vi.fn(),
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

    handler = module.get<UploadLibraryArtistBannerHandler>(UploadLibraryArtistBannerHandler);
    artistRepository = module.get<ArtistRepository>(ArtistRepository);
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

  it('should upload artist banner and cleanup old one successfully', async () => {
    const command = new UploadLibraryArtistBannerCommand(
      'artist-123',
      Buffer.from('test'),
      'image/jpeg',
      'user-123',
    );

    vi.mocked(artistRepository.findOne).mockResolvedValue(
      buildArtist({ id: 'artist-123', bannerId: 'img-old' }),
    );
    vi.mocked(prismaService.client.image.findUnique).mockResolvedValue(
      buildImage({ id: 'img-old', bucket: FileBucket.public, key: 'old-key' }),
    );
    vi.mocked(imageService.validateImage).mockResolvedValue(true);
    vi.mocked(imageService.resizeToMaxDimension).mockResolvedValue(Buffer.from('processed'));
    vi.mocked(storageService.uploadFile).mockResolvedValue({ url: 'new-url', key: 'new-key' });

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

    vi.mocked(artistRepository.findOne).mockResolvedValue(buildArtist({ id: 'artist-123' }));
    vi.mocked(imageService.validateImage).mockResolvedValue(true);
    vi.mocked(imageService.resizeToMaxDimension).mockResolvedValue(Buffer.from('processed'));
    vi.mocked(storageService.uploadFile).mockImplementation(async (_buf, _bucket, key) => ({
      url: 'new-url',
      key,
    }));

    vi.mocked(prismaService.mainClient.$transaction).mockRejectedValue(new Error('DB Error'));

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

    vi.mocked(artistRepository.findOne).mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if image is invalid', async () => {
    const command = new UploadLibraryArtistBannerCommand(
      'artist-123',
      Buffer.from('test'),
      'image/jpeg',
      'user-123',
    );

    vi.mocked(artistRepository.findOne).mockResolvedValue(buildArtist({ id: 'artist-123' }));
    vi.mocked(imageService.validateImage).mockResolvedValue(false);

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('should throw InternalServerErrorException if created image is invalid', async () => {
    const command = new UploadLibraryArtistBannerCommand(
      'artist-123',
      Buffer.from('test'),
      'image/jpeg',
      'user-123',
    );

    vi.mocked(artistRepository.findOne).mockResolvedValue(buildArtist({ id: 'artist-123' }));
    vi.mocked(imageService.validateImage).mockResolvedValue(true);
    vi.mocked(imageService.resizeToMaxDimension).mockResolvedValue(Buffer.from('processed'));
    vi.mocked(storageService.uploadFile).mockResolvedValue({ url: 'new-url', key: 'new-key' });

    vi.mocked(mockTx.image.create).mockResolvedValueOnce(JSON.parse('{"id":"img-new"}'));

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

    vi.mocked(artistRepository.findOne).mockResolvedValue(
      buildArtist({ id: 'artist-123', bannerId: 'img-old' }),
    );
    vi.mocked(prismaService.client.image.findUnique).mockResolvedValue(
      buildImage({ id: 'img-old', bucket: FileBucket.public, key: 'old-key' }),
    );
    vi.mocked(imageService.validateImage).mockResolvedValue(true);
    vi.mocked(imageService.resizeToMaxDimension).mockResolvedValue(Buffer.from('processed'));
    vi.mocked(storageService.uploadFile).mockResolvedValue({ url: 'new-url', key: 'new-key' });

    const loggerSpy = vi.spyOn(handler['logger'], 'error').mockImplementation(() => {});
    vi.mocked(storageService.deleteFile).mockRejectedValue(new Error('Delete error'));

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

    vi.mocked(artistRepository.findOne).mockResolvedValue(buildArtist({ id: 'artist-123' }));
    vi.mocked(imageService.validateImage).mockResolvedValue(true);
    vi.mocked(imageService.resizeToMaxDimension).mockResolvedValue(Buffer.from('processed'));
    vi.mocked(storageService.uploadFile).mockResolvedValue({ url: 'new-url', key: 'new-key' });

    vi.mocked(prismaService.mainClient.$transaction).mockRejectedValue(new Error('DB Error'));

    const loggerSpy = vi.spyOn(handler['logger'], 'error').mockImplementation(() => {});
    vi.mocked(storageService.deleteFile).mockRejectedValue(new Error('Delete error'));

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

    vi.mocked(artistRepository.findOne).mockResolvedValue(
      buildArtist({ id: 'artist-123', bannerId: 'img-old' }),
    );
    vi.mocked(prismaService.client.image.findUnique).mockResolvedValue(null); // Orphaned
    vi.mocked(imageService.validateImage).mockResolvedValue(true);
    vi.mocked(imageService.resizeToMaxDimension).mockResolvedValue(Buffer.from('processed'));
    vi.mocked(storageService.uploadFile).mockResolvedValue({ url: 'new-url', key: 'new-key' });

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

    // Should NOT attempt to delete old file from storage because it wasn't found
    expect(storageService.deleteFile).not.toHaveBeenCalledWith(FileBucket.public, 'old-key');
  });
});
