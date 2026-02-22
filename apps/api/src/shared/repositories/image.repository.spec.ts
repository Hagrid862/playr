import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient, Image, FileBucket } from '@repo/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../services/prisma.service';
import { ImageRepository } from './image.repository';

describe('ImageRepository', () => {
  let repository: ImageRepository;
  let mockTx: DeepMocked<PrismaClient>;

  const mockImage: Image = {
    id: 'image-123',
    bucket: FileBucket.private,
    key: 'test-key.jpg',
    url: 'https://test.com/test-key.jpg',
    mimeType: 'image/jpeg',
    alt: null,
    reportId: null,
    uploadStatus: 'pending',
    blurhash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    mockTx = createMock<PrismaClient>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageRepository,
        {
          provide: PrismaService,
          useValue: {
            client: mockTx,
            mainClient: mockTx,
          },
        },
      ],
    }).compile();

    repository = module.get<ImageRepository>(ImageRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return image matching where clause', async () => {
      mockTx.image.findFirst.mockResolvedValue(mockImage);
      const result = await repository.findOne({ id: 'image-123' });
      expect(result).toEqual(mockImage);
      expect(mockTx.image.findFirst).toHaveBeenCalledWith({
        where: { id: 'image-123' },
      });
    });
  });

  describe('findMany', () => {
    it('should return multiple images matching options', async () => {
      mockTx.image.findMany.mockResolvedValue([mockImage]);
      const result = await repository.findMany({ take: 5 });
      expect(result).toEqual([mockImage]);
      expect(mockTx.image.findMany).toHaveBeenCalledWith({
        where: undefined,
        take: 5,
        skip: undefined,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('exists', () => {
    it('should return true if image exists', async () => {
      mockTx.image.count.mockResolvedValue(1);
      const result = await repository.exists('image-123');
      expect(result).toBe(true);
      expect(mockTx.image.count).toHaveBeenCalledWith({ where: { id: 'image-123' } });
    });

    it('should return false if image does not exist', async () => {
      mockTx.image.count.mockResolvedValue(0);
      const result = await repository.exists('image-123');
      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should return count of images matching filter', async () => {
      mockTx.image.count.mockResolvedValue(5);
      const result = await repository.count({ bucket: FileBucket.private });
      expect(result).toBe(5);
      expect(mockTx.image.count).toHaveBeenCalledWith({ where: { bucket: FileBucket.private } });
    });
  });

  describe('create', () => {
    it('should create an image', async () => {
      mockTx.image.create.mockResolvedValue(mockImage);
      const data = {
        bucket: FileBucket.private,
        key: 'test-key.jpg',
        url: 'https://test.com/test-key.jpg',
        mimeType: 'image/jpeg',
      } as any;
      const result = await repository.create(data);
      expect(result).toEqual(mockImage);
      expect(mockTx.image.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('update', () => {
    it('should update an image', async () => {
      mockTx.image.update.mockResolvedValue(mockImage);
      const data = { blurhash: 'new-hash' };
      const result = await repository.update('image-123', data);
      expect(result).toEqual(mockImage);
      expect(mockTx.image.update).toHaveBeenCalledWith({ where: { id: 'image-123' }, data });
    });
  });

  describe('delete', () => {
    it('should delete an image', async () => {
      mockTx.image.delete.mockResolvedValue(mockImage);
      const result = await repository.delete('image-123');
      expect(result).toEqual(mockImage);
      expect(mockTx.image.delete).toHaveBeenCalledWith({ where: { id: 'image-123' } });
    });
  });
});
