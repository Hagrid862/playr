import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { ConfigService } from '@nestjs/config';
import { FileBucket } from '@repo/db';
import { Env } from '../../common/config/env.schema';
import { StorageService } from './storage.service';

const mocks = vi.hoisted(() => ({
  s3Send: vi.fn(),
  getSignedUrl: vi.fn(),
}));

vi.mock('@aws-sdk/client-s3', async (importActual) => {
  const actual = await importActual<typeof import('@aws-sdk/client-s3')>();
  return {
    ...actual,
    S3Client: class extends actual.S3Client {
      override send = mocks.s3Send;
    },
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mocks.getSignedUrl,
}));

describe('StorageService', () => {
  let service: StorageService;
  let configService: DeepMocked<ConfigService<Env>>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.s3Send.mockReset();
    mocks.getSignedUrl.mockReset();
    configService = createMock<ConfigService<Env>>();

    // Mock ConfigService returns
    configService.get.mockImplementation((key: string) => {
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

    service = new StorageService(configService);
  });

  describe('uploadFile', () => {
    it('should upload file to public bucket and return direct URL', async () => {
      const file = Buffer.from('test content');
      const key = 'test.jpg';

      await service.uploadFile(file, FileBucket.public, key);

      expect(mocks.s3Send).toHaveBeenCalled();
      const command = mocks.s3Send.mock.calls[0][0];
      expect(command).toBeInstanceOf(PutObjectCommand);
      const putCommand = command;
      expect(putCommand.input.Bucket).toBe('public-bucket');
      expect(putCommand.input.Key).toBe(key);
      expect(putCommand.input.Body).toBe(file);
    });

    it('should upload file to private bucket', async () => {
      const file = Buffer.from('test content');
      const key = 'secret.jpg';

      await service.uploadFile(file, FileBucket.private, key);

      expect(mocks.s3Send).toHaveBeenCalled();
      const command = mocks.s3Send.mock.calls[0][0];
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect(command.input.Bucket).toBe('private-bucket');
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
      configService.get.mockImplementation((key: string) => {
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
      expect(command).toBeInstanceOf(DeleteObjectCommand);
      expect(command.input.Bucket).toBe('public-bucket');
    });

    it('should throw error if deletion fails', async () => {
      mocks.s3Send.mockRejectedValue(new Error('Delete failed'));
      await expect(service.deleteFile(FileBucket.public, 'fail-delete.jpg')).rejects.toThrow(
        'Failed to delete file: Delete failed',
      );
    });
  });

  describe('getFile', () => {
    it('should get file as buffer', async () => {
      mocks.s3Send.mockResolvedValue({
        Body: (async function* () {
          yield Buffer.from('chunk1');
          yield Buffer.from('chunk2');
        })(),
      });

      const buffer = await service.getFile(FileBucket.private, 'test.txt');
      expect(buffer.toString()).toBe('chunk1chunk2');
      expect(mocks.s3Send).toHaveBeenCalled();
      const command = mocks.s3Send.mock.calls[0][0];
      expect(command).toBeInstanceOf(GetObjectCommand);
      expect(command.input.Bucket).toBe('private-bucket');
    });

    it('should throw error if getFile fails', async () => {
      mocks.s3Send.mockRejectedValue(new Error('Get failed'));
      await expect(service.getFile(FileBucket.private, 'fail.txt')).rejects.toThrow(
        'Failed to get file: Get failed',
      );
    });
  });

  describe('getFileStats', () => {
    it('should return file stats', async () => {
      const date = new Date();
      mocks.s3Send.mockResolvedValue({
        ContentLength: 1024,
        LastModified: date,
      });

      const stats = await service.getFileStats(FileBucket.public, 'test.jpg');
      expect(stats.size).toBe(1024);
      expect(stats.lastModified).toBe(date);

      const command = mocks.s3Send.mock.calls[0][0];
      expect(command).toBeInstanceOf(HeadObjectCommand);
      expect(command.input.Bucket).toBe('public-bucket');
    });

    it('should handle undefined ContentLength in stats', async () => {
      mocks.s3Send.mockResolvedValue({});
      const stats = await service.getFileStats(FileBucket.public, 'test.jpg');
      expect(stats.size).toBe(0);
    });

    it('should throw error if getFileStats fails', async () => {
      mocks.s3Send.mockRejectedValue(new Error('Head failed'));
      await expect(service.getFileStats(FileBucket.public, 'fail.jpg')).rejects.toThrow(
        'Failed to get file stats: Head failed',
      );
    });
  });

  describe('getFileStream', () => {
    it('should return stream and size', async () => {
      const mockStream = { pipe: vi.fn() };
      mocks.s3Send.mockResolvedValue({
        Body: mockStream,
        ContentLength: 500,
        ContentRange: 'bytes 0-499/1000',
      });

      const result = await service.getFileStream(FileBucket.private, 'test.mp3', {
        start: 0,
        end: 499,
      });

      expect(result.stream).toBe(mockStream);
      expect(result.size).toBe(500);
      expect(result.totalSize).toBe(1000);
      const command = mocks.s3Send.mock.calls[0][0];
      expect(command).toBeInstanceOf(GetObjectCommand);
      expect(command.input.Range).toBe('bytes=0-499');
    });

    it('should return stream and size without range options', async () => {
      const mockStream = { pipe: vi.fn() };
      mocks.s3Send.mockResolvedValue({
        Body: mockStream,
        ContentLength: 1000,
      });

      const result = await service.getFileStream(FileBucket.private, 'test-norange.mp3');

      expect(result.stream).toBe(mockStream);
      expect(result.size).toBe(1000);
      expect(result.totalSize).toBe(1000);
      const command = mocks.s3Send.mock.calls[0][0];
      expect(command).toBeInstanceOf(GetObjectCommand);
      expect(command.input.Range).toBeUndefined();
    });

    it('should return stream with start only', async () => {
      const mockStream = { pipe: vi.fn() };
      mocks.s3Send.mockResolvedValue({
        Body: mockStream,
      });

      await service.getFileStream(FileBucket.private, 'test.mp3', { start: 0 });

      const command = mocks.s3Send.mock.calls[0][0];
      expect(command).toBeInstanceOf(GetObjectCommand);
      expect(command.input.Range).toBe('bytes=0-');
    });

    it('should return stream with end only', async () => {
      const mockStream = { pipe: vi.fn() };
      mocks.s3Send.mockResolvedValue({
        Body: mockStream,
      });

      await service.getFileStream(FileBucket.private, 'test.mp3', { end: 499 });

      const command = mocks.s3Send.mock.calls[0][0];
      expect(command).toBeInstanceOf(GetObjectCommand);
      expect(command.input.Range).toBe('bytes=-499');
    });

    it('should fallback to 0 size if ContentLength not defined', async () => {
      const mockStream = { pipe: vi.fn() };
      mocks.s3Send.mockResolvedValue({
        Body: mockStream,
      });

      const result = await service.getFileStream(FileBucket.private, 'test.mp3');
      expect(result.size).toBe(0);
      expect(result.totalSize).toBe(0);
    });

    it('should throw error if getFileStream fails', async () => {
      mocks.s3Send.mockRejectedValue(new Error('Stream failed'));
      await expect(service.getFileStream(FileBucket.private, 'fail.mp3')).rejects.toThrow(
        'Failed to get file stream: Stream failed',
      );
    });
  });

  describe('configuration', () => {
    it('should throw error if public bucket is not configured', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'S3_PUBLIC_BUCKET') return undefined;
        return 'some-value';
      });

      await expect(service.uploadFile(Buffer.from(''), FileBucket.public, 'key')).rejects.toThrow(
        'S3_PUBLIC_BUCKET is not configured',
      );
    });

    it('should throw error if private bucket is not configured', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'S3_PRIVATE_BUCKET') return undefined;
        return 'some-value';
      });

      await expect(service.uploadFile(Buffer.from(''), FileBucket.private, 'key')).rejects.toThrow(
        'S3_PRIVATE_BUCKET is not configured',
      );
    });

    it('should handle missing credentials gracefully', () => {
      configService.get.mockReturnValue(undefined);
      const serviceWithNoCreds = new StorageService(configService);
      expect(serviceWithNoCreds).toBeDefined();
    });
  });
});
