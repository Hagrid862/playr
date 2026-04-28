import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageRepository } from './image.repository';
import { PrismaService } from '../services/prisma.service';
import { Image, Prisma } from '@repo/db';

describe('ImageRepository', () => {
  let repository: ImageRepository;
  let prismaService: PrismaService;
  let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;
  let mockMainClient: ReturnType<typeof createMockPrismaClient>;

  const createMockPrismaClient = () => ({
    image: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createManyAndReturn: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  });

  beforeEach(() => {
    mockPrismaClient = createMockPrismaClient();
    mockMainClient = createMockPrismaClient();

    const mockPrismaService = {
      get client() {
        return mockPrismaClient;
      },
      get mainClient() {
        return mockMainClient;
      },
    } as unknown as PrismaService;

    prismaService = mockPrismaService;
    repository = new ImageRepository(prismaService);
  });

  const mockImage: Image = {
    id: 'image-1',
    originalFileName: 'photo.jpg',
    path: '/path/to/photo.jpg',
    size: 1000000,
    mimeType: 'image/jpeg',
    width: 1920,
    height: 1080,
    storageBackend: 's3',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  describe('getById', () => {
    it('should return image by id without include', async () => {
      mockPrismaClient.image.findUnique.mockResolvedValue(mockImage);

      const result = await repository.getById('image-1');

      expect(result).toEqual(mockImage);
      expect(mockPrismaClient.image.findUnique).toHaveBeenCalledWith({
        where: { id: 'image-1' },
      });
    });

    it('should return image by id with include', async () => {
      const imageWithInclude = { ...mockImage, albums: [] };
      mockPrismaClient.image.findUnique.mockResolvedValue(imageWithInclude as unknown as Image);

      const result = await repository.getById('image-1', { include: { albums: true } });

      expect(result).toEqual(imageWithInclude);
      expect(mockPrismaClient.image.findUnique).toHaveBeenCalledWith({
        where: { id: 'image-1' },
        include: { albums: true },
      });
    });

    it('should return null if image not found', async () => {
      mockPrismaClient.image.findUnique.mockResolvedValue(null);

      const result = await repository.getById('non-existent');

      expect(result).toBeNull();
    });

    it('should return null if image is soft-deleted', async () => {
      mockPrismaClient.image.findUnique.mockResolvedValue({
        ...mockImage,
        deletedAt: new Date('2024-01-02'),
      });

      const result = await repository.getById('image-1');

      expect(result).toBeNull();
    });
  });

  describe('getPaginated', () => {
    it('should return paginated images without filter or orderBy', async () => {
      mockPrismaClient.image.findMany.mockResolvedValue([mockImage]);

      const result = await repository.getPaginated(1, 10);

      expect(result).toEqual([mockImage]);
      expect(mockPrismaClient.image.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return paginated images with filter and orderBy', async () => {
      mockPrismaClient.image.findMany.mockResolvedValue([mockImage]);
      const filter = { mimeType: 'image/jpeg' } as Prisma.ImageWhereInput;
      const orderBy = { createdAt: 'asc' } as Prisma.ImageOrderByWithRelationInput;

      const result = await repository.getPaginated(2, 5, filter, orderBy);

      expect(result).toEqual([mockImage]);
      expect(mockPrismaClient.image.findMany).toHaveBeenCalledWith({
        take: 5,
        skip: 5,
        where: { mimeType: 'image/jpeg', deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return paginated images with deletedAt filter', async () => {
      mockPrismaClient.image.findMany.mockResolvedValue([mockImage]);
      const filter = { deletedAt: new Date('2024-01-02') };

      const result = await repository.getPaginated(1, 10, filter);

      expect(mockPrismaClient.image.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: new Date('2024-01-02') },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return paginated images with include', async () => {
      const imageWithInclude = { ...mockImage, albums: [] };
      mockPrismaClient.image.findMany.mockResolvedValue([imageWithInclude] as unknown as Image[]);

      const result = await repository.getPaginated(1, 10, undefined, undefined, { include: { albums: true } });

      expect(mockPrismaClient.image.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: { albums: true },
      });
    });
  });

  describe('exists', () => {
    it('should return true if image exists', async () => {
      mockPrismaClient.image.count.mockResolvedValue(1);

      const result = await repository.exists('image-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.image.count).toHaveBeenCalledWith({
        where: { id: 'image-1', deletedAt: null },
      });
    });

    it('should return false if image does not exist', async () => {
      mockPrismaClient.image.count.mockResolvedValue(0);

      const result = await repository.exists('image-1');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count images without filter', async () => {
      mockPrismaClient.image.count.mockResolvedValue(5);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(mockPrismaClient.image.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });

    it('should count images with filter', async () => {
      mockPrismaClient.image.count.mockResolvedValue(3);
      const filter = { mimeType: 'image/jpeg' } as Prisma.ImageWhereInput;

      const result = await repository.count(filter);

      expect(result).toBe(3);
      expect(mockPrismaClient.image.count).toHaveBeenCalledWith({
        where: { mimeType: 'image/jpeg', deletedAt: null },
      });
    });

    it('should count images with deletedAt filter', async () => {
      mockPrismaClient.image.count.mockResolvedValue(1);
      const filter = { deletedAt: new Date('2024-01-02') };

      const result = await repository.count(filter);

      expect(mockPrismaClient.image.count).toHaveBeenCalledWith({
        where: { deletedAt: new Date('2024-01-02') },
      });
    });
  });

  describe('create', () => {
    it('should create image without include', async () => {
      const createInput = { originalFileName: 'new.jpg', path: '/new.jpg' } as Prisma.ImageCreateInput;
      mockPrismaClient.image.create.mockResolvedValue(mockImage);

      const result = await repository.create(createInput);

      expect(result).toEqual(mockImage);
      expect(mockPrismaClient.image.create).toHaveBeenCalledWith({
        data: createInput,
      });
    });

    it('should create image with include', async () => {
      const createInput = { originalFileName: 'new.jpg', path: '/new.jpg' } as Prisma.ImageCreateInput;
      const imageWithInclude = { ...mockImage, albums: [] };
      mockPrismaClient.image.create.mockResolvedValue(imageWithInclude as unknown as Image);

      const result = await repository.create(createInput, { include: { albums: true } });

      expect(result).toEqual(imageWithInclude);
      expect(mockPrismaClient.image.create).toHaveBeenCalledWith({
        data: createInput,
        include: { albums: true },
      });
    });
  });

  describe('createMany', () => {
    it('should create many images without include', async () => {
      const createInputs = [{ originalFileName: 'img1.jpg' }, { originalFileName: 'img2.jpg' }] as Prisma.ImageCreateManyInput[];
      mockPrismaClient.image.createManyAndReturn.mockResolvedValue([mockImage]);

      const result = await repository.createMany(createInputs);

      expect(result).toEqual([mockImage]);
      expect(mockPrismaClient.image.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
      });
    });

    it('should create many images with include', async () => {
      const createInputs = [{ originalFileName: 'img1.jpg' }] as Prisma.ImageCreateManyInput[];
      const imagesWithInclude = [{ ...mockImage, albums: [] }];
      mockPrismaClient.image.createManyAndReturn.mockResolvedValue(imagesWithInclude as unknown as Image[]);

      const result = await repository.createMany(createInputs, { include: { albums: true } });

      expect(mockPrismaClient.image.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
        include: { albums: true },
      });
    });
  });

  describe('update', () => {
    it('should update image without include', async () => {
      const updateInput = { originalFileName: 'updated.jpg' } as Prisma.ImageUpdateInput;
      mockPrismaClient.image.update.mockResolvedValue(mockImage);

      const result = await repository.update('image-1', updateInput);

      expect(result).toEqual(mockImage);
      expect(mockPrismaClient.image.update).toHaveBeenCalledWith({
        where: { id: 'image-1' },
        data: updateInput,
      });
    });

    it('should update image with include', async () => {
      const updateInput = { originalFileName: 'updated.jpg' } as Prisma.ImageUpdateInput;
      const imageWithInclude = { ...mockImage, albums: [] };
      mockPrismaClient.image.update.mockResolvedValue(imageWithInclude as unknown as Image);

      const result = await repository.update('image-1', updateInput, { include: { albums: true } });

      expect(mockPrismaClient.image.update).toHaveBeenCalledWith({
        where: { id: 'image-1' },
        data: updateInput,
        include: { albums: true },
      });
    });
  });

  describe('updateMany', () => {
    it('should update many images without include', async () => {
      const updates = [
        { id: 'image-1', data: { originalFileName: 'updated1.jpg' } as Prisma.ImageUpdateInput },
        { id: 'image-2', data: { originalFileName: 'updated2.jpg' } as Prisma.ImageUpdateInput },
      ];
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.image.update.mockResolvedValue(mockImage);

      const result = await repository.updateMany(updates);

      expect(mockMainClient.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should update many images with include', async () => {
      const updates = [
        { id: 'image-1', data: { originalFileName: 'updated1.jpg' } as Prisma.ImageUpdateInput },
      ];
      const imageWithInclude = { ...mockImage, albums: [] };
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.image.update.mockResolvedValue(imageWithInclude as unknown as Image);

      const result = await repository.updateMany(updates, { include: { albums: true } });

      expect(mockMainClient.$transaction).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should hard delete image', async () => {
      mockPrismaClient.image.delete.mockResolvedValue(mockImage);

      const result = await repository.delete('image-1');

      expect(result).toEqual(mockImage);
      expect(mockPrismaClient.image.delete).toHaveBeenCalledWith({
        where: { id: 'image-1' },
      });
    });
  });

  describe('softDelete', () => {
    it('should soft delete image', async () => {
      const deletedImage = { ...mockImage, deletedAt: new Date() };
      mockPrismaClient.image.update.mockResolvedValue(deletedImage);

      const result = await repository.softDelete('image-1');

      expect(result).toEqual(deletedImage);
      expect(mockPrismaClient.image.update).toHaveBeenCalledWith({
        where: { id: 'image-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('deleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.deleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.image.findMany).not.toHaveBeenCalled();
    });

    it('should hard delete many images', async () => {
      mockPrismaClient.image.findMany.mockResolvedValue([mockImage]);
      mockPrismaClient.image.deleteMany.mockResolvedValue({ count: 1 });

      const result = await repository.deleteMany(['image-1', 'image-2']);

      expect(result).toEqual([mockImage]);
      expect(mockPrismaClient.image.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['image-1', 'image-2'] } },
      });
      expect(mockPrismaClient.image.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['image-1', 'image-2'] } },
      });
    });
  });

  describe('softDeleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.softDeleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.image.findMany).not.toHaveBeenCalled();
    });

    it('should soft delete many images', async () => {
      const imagesToDelete = [
        { ...mockImage, id: 'image-1' },
        { ...mockImage, id: 'image-2' },
      ];
      mockPrismaClient.image.findMany.mockResolvedValue(imagesToDelete);
      mockPrismaClient.image.updateMany.mockResolvedValue({ count: 2 });

      const result = await repository.softDeleteMany(['image-1', 'image-2']);

      expect(result).toEqual(imagesToDelete);
      expect(mockPrismaClient.image.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['image-1', 'image-2'] }, deletedAt: null },
      });
      expect(mockPrismaClient.image.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['image-1', 'image-2'] }, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
