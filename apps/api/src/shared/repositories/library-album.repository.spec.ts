import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LibraryAlbumRepository } from './library-album.repository';
import { PrismaService } from '../services/prisma.service';
import { LibraryAlbum, Prisma } from '@repo/db';

describe('LibraryAlbumRepository', () => {
  let repository: LibraryAlbumRepository;
  let prismaService: PrismaService;
  let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;
  let mockMainClient: ReturnType<typeof createMockPrismaClient>;

  const createMockPrismaClient = () => ({
    libraryAlbum: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
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
    repository = new LibraryAlbumRepository(prismaService);
  });

  const mockLibraryAlbum: LibraryAlbum = {
    id: 'library-album-1',
    libraryId: 'library-1',
    albumId: 'album-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  describe('getById', () => {
    it('should return library album by id without include', async () => {
      mockPrismaClient.libraryAlbum.findUnique.mockResolvedValue(mockLibraryAlbum);

      const result = await repository.getById('library-album-1');

      expect(result).toEqual(mockLibraryAlbum);
      expect(mockPrismaClient.libraryAlbum.findUnique).toHaveBeenCalledWith({
        where: { id: 'library-album-1' },
      });
    });

    it('should return library album by id with include', async () => {
      const libraryAlbumWithInclude = { ...mockLibraryAlbum, album: { id: 'album-1' } };
      mockPrismaClient.libraryAlbum.findUnique.mockResolvedValue(libraryAlbumWithInclude as unknown as LibraryAlbum);

      const result = await repository.getById('library-album-1', { include: { album: true } });

      expect(result).toEqual(libraryAlbumWithInclude);
      expect(mockPrismaClient.libraryAlbum.findUnique).toHaveBeenCalledWith({
        where: { id: 'library-album-1' },
        include: { album: true },
      });
    });

    it('should return null if library album not found', async () => {
      mockPrismaClient.libraryAlbum.findUnique.mockResolvedValue(null);

      const result = await repository.getById('non-existent');

      expect(result).toBeNull();
    });

    it('should return null if library album is soft-deleted', async () => {
      mockPrismaClient.libraryAlbum.findUnique.mockResolvedValue({
        ...mockLibraryAlbum,
        deletedAt: new Date('2024-01-02'),
      });

      const result = await repository.getById('library-album-1');

      expect(result).toBeNull();
    });
  });

  describe('getByLibraryAndAlbum', () => {
    it('should return library album by library and album ids without include', async () => {
      mockPrismaClient.libraryAlbum.findFirst.mockResolvedValue(mockLibraryAlbum);

      const result = await repository.getByLibraryAndAlbum('library-1', 'album-1');

      expect(result).toEqual(mockLibraryAlbum);
      expect(mockPrismaClient.libraryAlbum.findFirst).toHaveBeenCalledWith({
        where: {
          libraryId: 'library-1',
          albumId: 'album-1',
          album: { deletedAt: null },
        },
      });
    });

    it('should return library album by library and album with include', async () => {
      const libraryAlbumWithInclude = { ...mockLibraryAlbum, album: { id: 'album-1', name: 'Test Album' } };
      mockPrismaClient.libraryAlbum.findFirst.mockResolvedValue(libraryAlbumWithInclude as unknown as LibraryAlbum);

      const result = await repository.getByLibraryAndAlbum('library-1', 'album-1', { include: { album: true } });

      expect(result).toEqual(libraryAlbumWithInclude);
      expect(mockPrismaClient.libraryAlbum.findFirst).toHaveBeenCalledWith({
        where: {
          libraryId: 'library-1',
          albumId: 'album-1',
          album: { deletedAt: null },
        },
        include: { album: true },
      });
    });

    it('should merge album filter with deletedAt constraint', async () => {
      mockPrismaClient.libraryAlbum.findFirst.mockResolvedValue(mockLibraryAlbum);

      await repository.getByLibraryAndAlbum('library-1', 'album-1');

      expect(mockPrismaClient.libraryAlbum.findFirst).toHaveBeenCalledWith({
        where: {
          libraryId: 'library-1',
          albumId: 'album-1',
          album: { deletedAt: null },
        },
      });
    });
  });

  describe('getPaginated', () => {
    it('should return paginated library albums without filter or orderBy', async () => {
      mockPrismaClient.libraryAlbum.findMany.mockResolvedValue([mockLibraryAlbum]);

      const result = await repository.getPaginated(1, 10);

      expect(result).toEqual([mockLibraryAlbum]);
      expect(mockPrismaClient.libraryAlbum.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: {
          deletedAt: null,
          album: { deletedAt: null },
        },
        orderBy: undefined,
      });
    });

    it('should return paginated library albums with filter and orderBy', async () => {
      mockPrismaClient.libraryAlbum.findMany.mockResolvedValue([mockLibraryAlbum]);
      const filter = { libraryId: 'library-1' } as Prisma.LibraryAlbumWhereInput;
      const orderBy = { createdAt: 'desc' } as Prisma.LibraryAlbumOrderByWithRelationInput;

      const result = await repository.getPaginated(2, 5, filter, orderBy);

      expect(result).toEqual([mockLibraryAlbum]);
      expect(mockPrismaClient.libraryAlbum.findMany).toHaveBeenCalledWith({
        take: 5,
        skip: 5,
        where: {
          libraryId: 'library-1',
          deletedAt: null,
          album: { deletedAt: null },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return paginated library albums with deletedAt filter', async () => {
      mockPrismaClient.libraryAlbum.findMany.mockResolvedValue([mockLibraryAlbum]);
      const filter = { deletedAt: new Date('2024-01-02') };

      const result = await repository.getPaginated(1, 10, filter);

      expect(result).toEqual([mockLibraryAlbum]);
      expect(mockPrismaClient.libraryAlbum.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: {
          deletedAt: new Date('2024-01-02'),
          album: { deletedAt: null },
        },
        orderBy: undefined,
      });
    });

    it('should return paginated library albums with album filter', async () => {
      mockPrismaClient.libraryAlbum.findMany.mockResolvedValue([mockLibraryAlbum]);
      const filter = { album: { name: 'Test' } } as Prisma.LibraryAlbumWhereInput;

      const result = await repository.getPaginated(1, 10, filter);

      expect(result).toEqual([mockLibraryAlbum]);
      expect(mockPrismaClient.libraryAlbum.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: {
          deletedAt: null,
          album: { name: 'Test', deletedAt: null },
        },
        orderBy: undefined,
      });
    });

    it('should return paginated library albums with include', async () => {
      const libraryAlbumWithInclude = { ...mockLibraryAlbum, album: { id: 'album-1' } };
      mockPrismaClient.libraryAlbum.findMany.mockResolvedValue([libraryAlbumWithInclude] as unknown as LibraryAlbum[]);

      const result = await repository.getPaginated(1, 10, undefined, undefined, { include: { album: true } });

      expect(result).toEqual([libraryAlbumWithInclude]);
      expect(mockPrismaClient.libraryAlbum.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: {
          deletedAt: null,
          album: { deletedAt: null },
        },
        orderBy: undefined,
        include: { album: true },
      });
    });
  });

  describe('exists', () => {
    it('should return true if library album exists', async () => {
      mockPrismaClient.libraryAlbum.count.mockResolvedValue(1);

      const result = await repository.exists('library-album-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.libraryAlbum.count).toHaveBeenCalledWith({
        where: { id: 'library-album-1', deletedAt: null },
      });
    });

    it('should return false if library album does not exist', async () => {
      mockPrismaClient.libraryAlbum.count.mockResolvedValue(0);

      const result = await repository.exists('library-album-1');

      expect(result).toBe(false);
    });
  });

  describe('existsForLibraryAndAlbum', () => {
    it('should return true if library album exists for library and album', async () => {
      mockPrismaClient.libraryAlbum.count.mockResolvedValue(1);

      const result = await repository.existsForLibraryAndAlbum('library-1', 'album-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.libraryAlbum.count).toHaveBeenCalledWith({
        where: {
          libraryId: 'library-1',
          albumId: 'album-1',
          album: { deletedAt: null },
        },
      });
    });

    it('should return false if library album does not exist', async () => {
      mockPrismaClient.libraryAlbum.count.mockResolvedValue(0);

      const result = await repository.existsForLibraryAndAlbum('library-1', 'album-1');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count library albums without filter', async () => {
      mockPrismaClient.libraryAlbum.count.mockResolvedValue(5);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(mockPrismaClient.libraryAlbum.count).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          album: { deletedAt: null },
        },
      });
    });

    it('should count library albums with filter', async () => {
      mockPrismaClient.libraryAlbum.count.mockResolvedValue(3);
      const filter = { libraryId: 'library-1' } as Prisma.LibraryAlbumWhereInput;

      const result = await repository.count(filter);

      expect(result).toBe(3);
      expect(mockPrismaClient.libraryAlbum.count).toHaveBeenCalledWith({
        where: {
          libraryId: 'library-1',
          deletedAt: null,
          album: { deletedAt: null },
        },
      });
    });

    it('should count library albums with deletedAt filter', async () => {
      mockPrismaClient.libraryAlbum.count.mockResolvedValue(1);
      const filter = { deletedAt: new Date('2024-01-02') };

      const result = await repository.count(filter);

      expect(result).toBe(1);
      expect(mockPrismaClient.libraryAlbum.count).toHaveBeenCalledWith({
        where: {
          deletedAt: new Date('2024-01-02'),
          album: { deletedAt: null },
        },
      });
    });

    it('should count library albums with album filter', async () => {
      mockPrismaClient.libraryAlbum.count.mockResolvedValue(2);
      const filter = { album: { name: 'Test' } } as Prisma.LibraryAlbumWhereInput;

      const result = await repository.count(filter);

      expect(result).toBe(2);
      expect(mockPrismaClient.libraryAlbum.count).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          album: { name: 'Test', deletedAt: null },
        },
      });
    });
  });

  describe('create', () => {
    it('should create library album without include', async () => {
      const createInput = {
        library: { connect: { id: 'library-1' } },
        album: { connect: { id: 'album-1' } },
      } as Prisma.LibraryAlbumCreateInput;
      mockPrismaClient.libraryAlbum.create.mockResolvedValue(mockLibraryAlbum);

      const result = await repository.create(createInput);

      expect(result).toEqual(mockLibraryAlbum);
      expect(mockPrismaClient.libraryAlbum.create).toHaveBeenCalledWith({
        data: createInput,
      });
    });

    it('should create library album with include', async () => {
      const createInput = {
        library: { connect: { id: 'library-1' } },
        album: { connect: { id: 'album-1' } },
      } as Prisma.LibraryAlbumCreateInput;
      const libraryAlbumWithInclude = { ...mockLibraryAlbum, album: { id: 'album-1' } };
      mockPrismaClient.libraryAlbum.create.mockResolvedValue(libraryAlbumWithInclude as unknown as LibraryAlbum);

      const result = await repository.create(createInput, { include: { album: true } });

      expect(result).toEqual(libraryAlbumWithInclude);
      expect(mockPrismaClient.libraryAlbum.create).toHaveBeenCalledWith({
        data: createInput,
        include: { album: true },
      });
    });
  });

  describe('createMany', () => {
    it('should create many library albums without include', async () => {
      const createInputs = [{ libraryId: 'library-1', albumId: 'album-1' }, { libraryId: 'library-1', albumId: 'album-2' }] as Prisma.LibraryAlbumCreateManyInput[];
      mockPrismaClient.libraryAlbum.createManyAndReturn.mockResolvedValue([mockLibraryAlbum]);

      const result = await repository.createMany(createInputs);

      expect(result).toEqual([mockLibraryAlbum]);
      expect(mockPrismaClient.libraryAlbum.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
      });
    });

    it('should create many library albums with include', async () => {
      const createInputs = [{ libraryId: 'library-1', albumId: 'album-1' }] as Prisma.LibraryAlbumCreateManyInput[];
      const libraryAlbumsWithInclude = [{ ...mockLibraryAlbum, album: { id: 'album-1' } }];
      mockPrismaClient.libraryAlbum.createManyAndReturn.mockResolvedValue(libraryAlbumsWithInclude as unknown as LibraryAlbum[]);

      const result = await repository.createMany(createInputs, { include: { album: true } });

      expect(result).toEqual(libraryAlbumsWithInclude);
      expect(mockPrismaClient.libraryAlbum.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
        include: { album: true },
      });
    });
  });

  describe('update', () => {
    it('should update library album without include', async () => {
      const updateInput = {} as Prisma.LibraryAlbumUpdateInput;
      mockPrismaClient.libraryAlbum.update.mockResolvedValue(mockLibraryAlbum);

      const result = await repository.update('library-album-1', updateInput);

      expect(result).toEqual(mockLibraryAlbum);
      expect(mockPrismaClient.libraryAlbum.update).toHaveBeenCalledWith({
        data: updateInput,
        where: { id: 'library-album-1' },
      });
    });

    it('should update library album with include', async () => {
      const updateInput = {} as Prisma.LibraryAlbumUpdateInput;
      const libraryAlbumWithInclude = { ...mockLibraryAlbum, album: { id: 'album-1' } };
      mockPrismaClient.libraryAlbum.update.mockResolvedValue(libraryAlbumWithInclude as unknown as LibraryAlbum);

      const result = await repository.update('library-album-1', updateInput, { include: { album: true } });

      expect(result).toEqual(libraryAlbumWithInclude);
      expect(mockPrismaClient.libraryAlbum.update).toHaveBeenCalledWith({
        data: updateInput,
        where: { id: 'library-album-1' },
        include: { album: true },
      });
    });
  });

  describe('updateMany', () => {
    it('should update many library albums without include', async () => {
      const updates = [
        { id: 'library-album-1', data: {} as Prisma.LibraryAlbumUpdateInput },
        { id: 'library-album-2', data: {} as Prisma.LibraryAlbumUpdateInput },
      ];
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.libraryAlbum.update.mockResolvedValue(mockLibraryAlbum);

      const result = await repository.updateMany(updates);

      expect(mockMainClient.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should update many library albums with include', async () => {
      const updates = [
        { id: 'library-album-1', data: {} as Prisma.LibraryAlbumUpdateInput },
      ];
      const libraryAlbumWithInclude = { ...mockLibraryAlbum, album: { id: 'album-1' } };
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.libraryAlbum.update.mockResolvedValue(libraryAlbumWithInclude as unknown as LibraryAlbum);

      const result = await repository.updateMany(updates, { include: { album: true } });

      expect(mockMainClient.$transaction).toHaveBeenCalled();
      expect(result).toEqual([libraryAlbumWithInclude]);
    });
  });

  describe('delete', () => {
    it('should hard delete library album', async () => {
      mockPrismaClient.libraryAlbum.delete.mockResolvedValue(mockLibraryAlbum);

      const result = await repository.delete('library-album-1');

      expect(result).toEqual(mockLibraryAlbum);
      expect(mockPrismaClient.libraryAlbum.delete).toHaveBeenCalledWith({
        where: { id: 'library-album-1' },
      });
    });
  });

  describe('softDelete', () => {
    it('should soft delete library album', async () => {
      const deletedLibraryAlbum = { ...mockLibraryAlbum, deletedAt: new Date() };
      mockPrismaClient.libraryAlbum.update.mockResolvedValue(deletedLibraryAlbum);

      const result = await repository.softDelete('library-album-1');

      expect(result).toEqual(deletedLibraryAlbum);
      expect(mockPrismaClient.libraryAlbum.update).toHaveBeenCalledWith({
        where: { id: 'library-album-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('deleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.deleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.libraryAlbum.findMany).not.toHaveBeenCalled();
    });

    it('should hard delete many library albums', async () => {
      mockPrismaClient.libraryAlbum.findMany.mockResolvedValue([mockLibraryAlbum]);
      mockPrismaClient.libraryAlbum.deleteMany.mockResolvedValue({ count: 1 });

      const result = await repository.deleteMany(['library-album-1', 'library-album-2']);

      expect(result).toEqual([mockLibraryAlbum]);
      expect(mockPrismaClient.libraryAlbum.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['library-album-1', 'library-album-2'] } },
      });
      expect(mockPrismaClient.libraryAlbum.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['library-album-1', 'library-album-2'] } },
      });
    });
  });

  describe('softDeleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.softDeleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.libraryAlbum.findMany).not.toHaveBeenCalled();
    });

    it('should soft delete many library albums', async () => {
      const libraryAlbumsToDelete = [
        { ...mockLibraryAlbum, id: 'library-album-1' },
        { ...mockLibraryAlbum, id: 'library-album-2' },
      ];
      mockPrismaClient.libraryAlbum.findMany.mockResolvedValue(libraryAlbumsToDelete);
      mockPrismaClient.libraryAlbum.updateMany.mockResolvedValue({ count: 2 });

      const result = await repository.softDeleteMany(['library-album-1', 'library-album-2']);

      expect(result).toEqual(libraryAlbumsToDelete);
      expect(mockPrismaClient.libraryAlbum.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['library-album-1', 'library-album-2'] }, deletedAt: null },
      });
      expect(mockPrismaClient.libraryAlbum.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['library-album-1', 'library-album-2'] }, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
