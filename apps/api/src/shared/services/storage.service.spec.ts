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

    it('should throw error if upload fails', async () => {
      mocks.s3Send.mockRejectedValue(new Error('Upload failed'));
      const file = Buffer.from('failed content');
      await expect(service.uploadFile(file, FileBucket.public, 'fail.jpg')).rejects.toThrow(
        'Failed to upload file: Upload failed',
      );
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

    it('should throw error for unknown bucket type', () => {
      // @ts-ignore
      expect(() => service.getFileUrl('unknown' as FileBucket, 'key')).toThrow(
        'Unknown bucket type: unknown',
      );
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

    it('should throw error if getSignedUrl fails', async () => {
      mocks.getSignedUrl.mockRejectedValue(new Error('Signing failed'));
      await expect(service.getPresignedUrl(FileBucket.private, 'fail.jpg')).rejects.toThrow(
        'Failed to generate presigned URL: Signing failed',
      );
    });
  });

  describe('deleteFile', () => {
    it('should call deleteObjectCommand with correct parameters', async () => {
      await service.deleteFile(FileBucket.public, 'delete-me.jpg');

      expect(mocks.s3Send).toHaveBeenCalled();
      const command = mocks.s3Send.mock.calls[0][0];
      expect(command.Bucket).toBe('public-bucket');
    });

    it('should throw error if deletion fails', async () => {
      mocks.s3Send.mockRejectedValue(new Error('Delete failed'));
      await expect(service.deleteFile(FileBucket.public, 'fail-delete.jpg')).rejects.toThrow(
        'Failed to delete file: Delete failed',
      );
    });
  });

  describe('configuration', () => {
    it('should throw error if public bucket is not configured', async () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'S3_PUBLIC_BUCKET') return undefined;
        return 'some-value';
      });

      await expect(service.uploadFile(Buffer.from(''), FileBucket.public, 'key')).rejects.toThrow(
        'S3_PUBLIC_BUCKET is not configured',
      );
    });

    it('should throw error if private bucket is not configured', async () => {
      configServiceMock.get.mockImplementation((key: string) => {
        if (key === 'S3_PRIVATE_BUCKET') return undefined;
        return 'some-value';
      });

      await expect(service.uploadFile(Buffer.from(''), FileBucket.private, 'key')).rejects.toThrow(
        'S3_PRIVATE_BUCKET is not configured',
      );
    });

    it('should handle missing credentials gracefully', () => {
      configServiceMock.get.mockReturnValue(undefined);
      const serviceWithNoCreds = new StorageService(configServiceMock as any);
      expect(serviceWithNoCreds).toBeDefined();
    });
  });
});
