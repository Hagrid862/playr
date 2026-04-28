import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LibraryRepository } from './library.repository';
import { PrismaService } from '../services/prisma.service';
import { Library, Prisma } from '@repo/db';

describe('LibraryRepository', () => {
  let repository: LibraryRepository;
  let prismaService: PrismaService;
  let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;
  let mockMainClient: ReturnType<typeof createMockPrismaClient>;

  const createMockPrismaClient = () => ({
    library: {
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
    repository = new LibraryRepository(prismaService);
  });

  const mockLibrary: Library = {
    id: 'library-1',
    userId: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  describe('getById', () => {
    it('should return library by id without include', async () => {
      mockPrismaClient.library.findUnique.mockResolvedValue(mockLibrary);

      const result = await repository.getById('library-1');

      expect(result).toEqual(mockLibrary);
      expect(mockPrismaClient.library.findUnique).toHaveBeenCalledWith({
        where: { id: 'library-1' },
      });
    });

    it('should return library by id with include', async () => {
      const libraryWithInclude = { ...mockLibrary, user: { id: 'user-1' } };
      mockPrismaClient.library.findUnique.mockResolvedValue(libraryWithInclude as unknown as Library);

      const result = await repository.getById('library-1', { include: { user: true } });

      expect(result).toEqual(libraryWithInclude);
      expect(mockPrismaClient.library.findUnique).toHaveBeenCalledWith({
        where: { id: 'library-1' },
        include: { user: true },
      });
    });

    it('should return null if library not found', async () => {
      mockPrismaClient.library.findUnique.mockResolvedValue(null);

      const result = await repository.getById('non-existent');

      expect(result).toBeNull();
    });

    it('should return null if library is soft-deleted', async () => {
      mockPrismaClient.library.findUnique.mockResolvedValue({
        ...mockLibrary,
        deletedAt: new Date('2024-01-02'),
      });

      const result = await repository.getById('library-1');

      expect(result).toBeNull();
    });
  });

  describe('getByUserId', () => {
    it('should return library by user id without include', async () => {
      mockPrismaClient.library.findUnique.mockResolvedValue(mockLibrary);

      const result = await repository.getByUserId('user-1');

      expect(result).toEqual(mockLibrary);
      expect(mockPrismaClient.library.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should return library by user id with include', async () => {
      const libraryWithInclude = { ...mockLibrary, user: { id: 'user-1' } };
      mockPrismaClient.library.findUnique.mockResolvedValue(libraryWithInclude as unknown as Library);

      const result = await repository.getByUserId('user-1', { include: { user: true } });

      expect(result).toEqual(libraryWithInclude);
      expect(mockPrismaClient.library.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { user: true },
      });
    });

    it('should return null if library not found', async () => {
      mockPrismaClient.library.findUnique.mockResolvedValue(null);

      const result = await repository.getByUserId('user-1');

      expect(result).toBeNull();
    });

    it('should return null if library is soft-deleted', async () => {
      mockPrismaClient.library.findUnique.mockResolvedValue({
        ...mockLibrary,
        deletedAt: new Date('2024-01-02'),
      });

      const result = await repository.getByUserId('user-1');

      expect(result).toBeNull();
    });
  });

  describe('getPaginated', () => {
    it('should return paginated libraries without filter or orderBy', async () => {
      mockPrismaClient.library.findMany.mockResolvedValue([mockLibrary]);

      const result = await repository.getPaginated(1, 10);

      expect(result).toEqual([mockLibrary]);
      expect(mockPrismaClient.library.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: null },
        orderBy: undefined,
      });
    });

    it('should return paginated libraries with filter and orderBy', async () => {
      mockPrismaClient.library.findMany.mockResolvedValue([mockLibrary]);
      const filter = { userId: 'user-1' } as Prisma.LibraryWhereInput;
      const orderBy = { createdAt: 'desc' } as Prisma.LibraryOrderByWithRelationInput;

      const result = await repository.getPaginated(2, 5, filter, orderBy);

      expect(result).toEqual([mockLibrary]);
      expect(mockPrismaClient.library.findMany).toHaveBeenCalledWith({
        take: 5,
        skip: 5,
        where: { userId: 'user-1', deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return paginated libraries with deletedAt filter', async () => {
      mockPrismaClient.library.findMany.mockResolvedValue([mockLibrary]);
      const filter = { deletedAt: new Date('2024-01-02') };

      await repository.getPaginated(1, 10, filter);

      expect(mockPrismaClient.library.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: new Date('2024-01-02') },
        orderBy: undefined,
      });
    });

    it('should return paginated libraries with include', async () => {
      const libraryWithInclude = { ...mockLibrary, user: { id: 'user-1' } };
      mockPrismaClient.library.findMany.mockResolvedValue([libraryWithInclude] as unknown as Library[]);

      await repository.getPaginated(1, 10, undefined, undefined, { include: { user: true } });

      expect(mockPrismaClient.library.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: null },
        orderBy: undefined,
        include: { user: true },
      });
    });
  });

  describe('exists', () => {
    it('should return true if library exists', async () => {
      mockPrismaClient.library.count.mockResolvedValue(1);

      const result = await repository.exists('library-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.library.count).toHaveBeenCalledWith({
        where: { id: 'library-1', deletedAt: null },
      });
    });

    it('should return false if library does not exist', async () => {
      mockPrismaClient.library.count.mockResolvedValue(0);

      const result = await repository.exists('library-1');

      expect(result).toBe(false);
    });
  });

  describe('existsForUser', () => {
    it('should return true if library exists for user', async () => {
      mockPrismaClient.library.count.mockResolvedValue(1);

      const result = await repository.existsForUser('user-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.library.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null },
      });
    });

    it('should return false if library does not exist for user', async () => {
      mockPrismaClient.library.count.mockResolvedValue(0);

      const result = await repository.existsForUser('user-1');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count libraries without filter', async () => {
      mockPrismaClient.library.count.mockResolvedValue(5);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(mockPrismaClient.library.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });

    it('should count libraries with filter', async () => {
      mockPrismaClient.library.count.mockResolvedValue(3);
      const filter = { userId: 'user-1' } as Prisma.LibraryWhereInput;

      const result = await repository.count(filter);

      expect(result).toBe(3);
      expect(mockPrismaClient.library.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null },
      });
    });

    it('should count libraries with deletedAt filter', async () => {
      mockPrismaClient.library.count.mockResolvedValue(1);
      const filter = { deletedAt: new Date('2024-01-02') };

      const result = await repository.count(filter);

      expect(result).toBe(1);
      expect(mockPrismaClient.library.count).toHaveBeenCalledWith({
        where: { deletedAt: new Date('2024-01-02') },
      });
    });
  });

  describe('create', () => {
    it('should create library without include', async () => {
      const createInput = { user: { connect: { id: 'user-1' } } } as Prisma.LibraryCreateInput;
      mockPrismaClient.library.create.mockResolvedValue(mockLibrary);

      const result = await repository.create(createInput);

      expect(result).toEqual(mockLibrary);
      expect(mockPrismaClient.library.create).toHaveBeenCalledWith({
        data: createInput,
      });
    });

    it('should create library with include', async () => {
      const createInput = { user: { connect: { id: 'user-1' } } } as Prisma.LibraryCreateInput;
      const libraryWithInclude = { ...mockLibrary, user: { id: 'user-1' } };
      mockPrismaClient.library.create.mockResolvedValue(libraryWithInclude as unknown as Library);

      const result = await repository.create(createInput, { include: { user: true } });

      expect(result).toEqual(libraryWithInclude);
      expect(mockPrismaClient.library.create).toHaveBeenCalledWith({
        data: createInput,
        include: { user: true },
      });
    });
  });

  describe('createMany', () => {
    it('should create many libraries without include', async () => {
      const createInputs = [{ userId: 'user-1' }, { userId: 'user-2' }] as Prisma.LibraryCreateManyInput[];
      mockPrismaClient.library.createManyAndReturn.mockResolvedValue([mockLibrary]);

      const result = await repository.createMany(createInputs);

      expect(result).toEqual([mockLibrary]);
      expect(mockPrismaClient.library.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
      });
    });

    it('should create many libraries with include', async () => {
      const createInputs = [{ userId: 'user-1' }] as Prisma.LibraryCreateManyInput[];
      const librariesWithInclude = [{ ...mockLibrary, user: { id: 'user-1' } }];
      mockPrismaClient.library.createManyAndReturn.mockResolvedValue(librariesWithInclude as unknown as Library[]);

      await repository.createMany(createInputs, { include: { user: true } });

      expect(mockPrismaClient.library.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
        include: { user: true },
      });
    });
  });

  describe('update', () => {
    it('should update library without include', async () => {
      const updateInput = {} as Prisma.LibraryUpdateInput;
      mockPrismaClient.library.update.mockResolvedValue(mockLibrary);

      const result = await repository.update('library-1', updateInput);

      expect(result).toEqual(mockLibrary);
      expect(mockPrismaClient.library.update).toHaveBeenCalledWith({
        data: updateInput,
        where: { id: 'library-1' },
      });
    });

    it('should update library with include', async () => {
      const updateInput = {} as Prisma.LibraryUpdateInput;
      const libraryWithInclude = { ...mockLibrary, user: { id: 'user-1' } };
      mockPrismaClient.library.update.mockResolvedValue(libraryWithInclude as unknown as Library);

      await repository.update('library-1', updateInput, { include: { user: true } });

      expect(mockPrismaClient.library.update).toHaveBeenCalledWith({
        data: updateInput,
        where: { id: 'library-1' },
        include: { user: true },
      });
    });
  });

  describe('updateMany', () => {
    it('should update many libraries without include', async () => {
      const updates = [
        { id: 'library-1', data: {} as Prisma.LibraryUpdateInput },
        { id: 'library-2', data: {} as Prisma.LibraryUpdateInput },
      ];
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.library.update.mockResolvedValue(mockLibrary);

      const result = await repository.updateMany(updates);

      expect(mockMainClient.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should update many libraries with include', async () => {
      const updates = [
        { id: 'library-1', data: {} as Prisma.LibraryUpdateInput },
      ];
      const libraryWithInclude = { ...mockLibrary, user: { id: 'user-1' } };
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.library.update.mockResolvedValue(libraryWithInclude as unknown as Library);

      await repository.updateMany(updates, { include: { user: true } });

      expect(mockMainClient.$transaction).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should hard delete library', async () => {
      mockPrismaClient.library.delete.mockResolvedValue(mockLibrary);

      const result = await repository.delete('library-1');

      expect(result).toEqual(mockLibrary);
      expect(mockPrismaClient.library.delete).toHaveBeenCalledWith({
        where: { id: 'library-1' },
      });
    });
  });

  describe('softDelete', () => {
    it('should soft delete library', async () => {
      const deletedLibrary = { ...mockLibrary, deletedAt: new Date() };
      mockPrismaClient.library.update.mockResolvedValue(deletedLibrary);

      const result = await repository.softDelete('library-1');

      expect(result).toEqual(deletedLibrary);
      expect(mockPrismaClient.library.update).toHaveBeenCalledWith({
        where: { id: 'library-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('deleteByUserId', () => {
    it('should hard delete library by user id', async () => {
      mockPrismaClient.library.delete.mockResolvedValue(mockLibrary);

      const result = await repository.deleteByUserId('user-1');

      expect(result).toEqual(mockLibrary);
      expect(mockPrismaClient.library.delete).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });

  describe('deleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.deleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.library.findMany).not.toHaveBeenCalled();
    });

    it('should hard delete many libraries', async () => {
      mockPrismaClient.library.findMany.mockResolvedValue([mockLibrary]);
      mockPrismaClient.library.deleteMany.mockResolvedValue({ count: 1 });

      const result = await repository.deleteMany(['library-1', 'library-2']);

      expect(result).toEqual([mockLibrary]);
      expect(mockPrismaClient.library.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['library-1', 'library-2'] } },
      });
      expect(mockPrismaClient.library.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['library-1', 'library-2'] } },
      });
    });
  });

  describe('softDeleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.softDeleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.library.findMany).not.toHaveBeenCalled();
    });

    it('should soft delete many libraries', async () => {
      const librariesToDelete = [
        { ...mockLibrary, id: 'library-1' },
        { ...mockLibrary, id: 'library-2' },
      ];
      mockPrismaClient.library.findMany.mockResolvedValue(librariesToDelete);
      mockPrismaClient.library.updateMany.mockResolvedValue({ count: 2 });

      const result = await repository.softDeleteMany(['library-1', 'library-2']);

      expect(result).toEqual(librariesToDelete);
      expect(mockPrismaClient.library.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['library-1', 'library-2'] }, deletedAt: null },
      });
      expect(mockPrismaClient.library.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['library-1', 'library-2'] }, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
