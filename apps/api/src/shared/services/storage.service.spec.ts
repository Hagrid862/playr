import { ConfigService } from '@nestjs/config';
import { FileBucket } from '@repo/db';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { StorageService } from './storage.service';

const mocks = vi.hoisted(() => ({
  s3Send: vi.fn(),
  getSignedUrl: vi.fn(),
}));

vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: class {
      send = mocks.s3Send;
    },
    PutObjectCommand: class {
      constructor(public input: any) {
        Object.assign(this, input);
      }
    },
    GetObjectCommand: class {
      constructor(public input: any) {
        Object.assign(this, input);
      }
    },
    DeleteObjectCommand: class {
      constructor(public input: any) {
        Object.assign(this, input);
      }
    },
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mocks.getSignedUrl,
}));

describe('StorageService', () => {
  let service: StorageService;
  const configServiceMock = mockDeep<ConfigService>();

  beforeEach(() => {
    mockReset(configServiceMock);
    mocks.s3Send.mockReset();
    mocks.getSignedUrl.mockReset();

    // Mock ConfigService returns
    configServiceMock.get.mockImplementation((key: string) => {
      switch (key) {
        case 'S3_ENDPOINT':
          return 'http://localhost:9000';
        case 'S3_ACCESS_KEY':
          return 'access';
        case 'S3_SECRET_KEY':
          return 'secret';
        case 'S3_USE_SSL':
          return false;
        case 'S3_PUBLIC_BUCKET':
          return 'public-bucket';
        case 'S3_PRIVATE_BUCKET':
          return 'private-bucket';
        case 'S3_PUBLIC_URL':
          return 'https://cdn.playr.com';
        default:
          return undefined;
      }
    });

    service = new StorageService(configServiceMock as any);
  });

  describe('uploadFile', () => {
    it('should upload file to public bucket and return direct URL', async () => {
      const file = Buffer.from('test content');
      const key = 'test.jpg';

      await service.uploadFile(file, FileBucket.public, key);

      expect(mocks.s3Send).toHaveBeenCalled();
      const command = mocks.s3Send.mock.calls[0][0];
      expect(command.Bucket).toBe('public-bucket');
      expect(command.Key).toBe(key);
      expect(command.Body).toBe(file);
    });

    it('should upload file to private bucket', async () => {
      const file = Buffer.from('test content');
      const key = 'secret.jpg';

      await service.uploadFile(file, FileBucket.private, key);

      expect(mocks.s3Send).toHaveBeenCalled();
      const command = mocks.s3Send.mock.calls[0][0];
      expect(command.Bucket).toBe('private-bucket');
    });
  });

  describe('getFileUrl', () => {
    it('should return direct CDN URL for public bucket if configured', () => {
      const url = service.getFileUrl(FileBucket.public, 'test.jpg');
      expect(url).toBe('https://cdn.playr.com/test.jpg');
    });

    it('should return S3 endpoint URL for public bucket if CDN not configured', () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'S3_PUBLIC_URL') return undefined;
        if (key === 'S3_ENDPOINT') return 'http://localhost:9000';
        if (key === 'S3_PUBLIC_BUCKET') return 'public-bucket';
        return undefined;
      });

      const url = service.getFileUrl(FileBucket.public, 'test.jpg');
      expect(url).toBe('http://localhost:9000/public-bucket/test.jpg');
    });

    it('should return S3 endpoint URL for private bucket', () => {
      const url = service.getFileUrl(FileBucket.private, 'secret.jpg');
      expect(url).toBe('http://localhost:9000/private-bucket/secret.jpg');
    });
  });

  describe('getPresignedUrl', () => {
    it('should call getSignedUrl with correct parameters', async () => {
      mocks.getSignedUrl.mockResolvedValue('https://signed-url.com');

      const url = await service.getPresignedUrl(FileBucket.private, 'secret.jpg');

      expect(url).toBe('https://signed-url.com');
      expect(mocks.getSignedUrl).toHaveBeenCalledWith(
        expect.any(Object), // S3Client instance
        expect.any(Object), // Command instance
        expect.objectContaining({ expiresIn: 3600 }),
      );
    });
  });

  describe('deleteFile', () => {
    it('should call deleteObjectCommand with correct parameters', async () => {
      await service.deleteFile(FileBucket.public, 'delete-me.jpg');

      expect(mocks.s3Send).toHaveBeenCalled();
      const command = mocks.s3Send.mock.calls[0][0];
      expect(command.Bucket).toBe('public-bucket');
      expect(command.Key).toBe('delete-me.jpg');
    });
  });
});
