import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { PrivateProfileRepository } from '@/shared/repositories/private-profile.repository';
import { ImageService } from '@/shared/services/image.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { StorageService } from '@/shared/services/storage.service';
import { Test, TestingModule } from '@nestjs/testing';
import { FileBucket } from '@repo/db';
import { vi } from 'vitest';
import { UploadArtistBannerCommand } from '../impl/upload-artist-banner.command';
import { UploadArtistBannerHandler } from './upload-artist-banner.handler';

describe('UploadArtistBannerHandler', () => {
  let handler: UploadArtistBannerHandler;
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
        UploadArtistBannerHandler,
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

    handler = module.get<UploadArtistBannerHandler>(UploadArtistBannerHandler);
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

  it('should upload artist banner and cleanup old one successfully', async () => {
    const command = new UploadArtistBannerCommand(
      'artist-123',
      Buffer.from('test'),
      'image/jpeg',
      'user-123',
    );

    vi.mocked(privateProfileRepository.getByUserId).mockResolvedValue({ id: 'pp-123' } as any);
    vi.mocked(artistRepository.getByIdAndOwnerId).mockResolvedValue({
      id: 'artist-123',
      bannerId: 'img-old',
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
    const command = new UploadArtistBannerCommand(
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

    const expectedNewKey = `artists/artist-123/banner-${new Date('2024-01-01').getTime()}.webp`;
    expect(storageService.deleteFile).toHaveBeenCalledWith(FileBucket.public, expectedNewKey);
  });
});
