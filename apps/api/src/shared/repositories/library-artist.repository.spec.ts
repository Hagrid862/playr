import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LibraryArtistRepository } from './library-artist.repository';
import { PrismaService } from '../services/prisma.service';
import { LibraryArtist, Prisma } from '@repo/db';

describe('LibraryArtistRepository', () => {
  let repository: LibraryArtistRepository;
  let prismaService: PrismaService;
  let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;
  let mockMainClient: ReturnType<typeof createMockPrismaClient>;

  const createMockPrismaClient = () => ({
    libraryArtist: {
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
    repository = new LibraryArtistRepository(prismaService);
  });

  const mockLibraryArtist: LibraryArtist = {
    id: 'library-artist-1',
    libraryId: 'library-1',
    artistId: 'artist-1',
    addedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  describe('getById', () => {
    it('should return library artist by id without include', async () => {
      mockPrismaClient.libraryArtist.findUnique.mockResolvedValue(mockLibraryArtist);

      const result = await repository.getById('library-artist-1');

      expect(result).toEqual(mockLibraryArtist);
      expect(mockPrismaClient.libraryArtist.findUnique).toHaveBeenCalledWith({
        where: { id: 'library-artist-1' },
      });
    });

    it('should return library artist by id with include', async () => {
      const libraryArtistWithInclude = { ...mockLibraryArtist, artist: { id: 'artist-1' } };
      mockPrismaClient.libraryArtist.findUnique.mockResolvedValue(libraryArtistWithInclude as unknown as LibraryArtist);

      const result = await repository.getById('library-artist-1', { include: { artist: true } });

      expect(result).toEqual(libraryArtistWithInclude);
      expect(mockPrismaClient.libraryArtist.findUnique).toHaveBeenCalledWith({
        where: { id: 'library-artist-1' },
        include: { artist: true },
      });
    });

    it('should return null if library artist not found', async () => {
      mockPrismaClient.libraryArtist.findUnique.mockResolvedValue(null);

      const result = await repository.getById('non-existent');

      expect(result).toBeNull();
    });

    it('should return null if library artist is soft-deleted', async () => {
      mockPrismaClient.libraryArtist.findUnique.mockResolvedValue({
        ...mockLibraryArtist,
        deletedAt: new Date('2024-01-02'),
      });

      const result = await repository.getById('library-artist-1');

      expect(result).toBeNull();
    });
  });

  describe('getByLibraryAndArtist', () => {
    it('should return library artist by library and artist ids without include', async () => {
      mockPrismaClient.libraryArtist.findFirst.mockResolvedValue(mockLibraryArtist);

      const result = await repository.getByLibraryAndArtist('library-1', 'artist-1');

      expect(result).toEqual(mockLibraryArtist);
      expect(mockPrismaClient.libraryArtist.findFirst).toHaveBeenCalledWith({
        where: {
          libraryId: 'library-1',
          artistId: 'artist-1',
          artist: { deletedAt: null },
        },
      });
    });

    it('should return library artist by library and artist with include', async () => {
      const libraryArtistWithInclude = { ...mockLibraryArtist, artist: { id: 'artist-1', name: 'Test Artist' } };
      mockPrismaClient.libraryArtist.findFirst.mockResolvedValue(libraryArtistWithInclude as unknown as LibraryArtist);

      const result = await repository.getByLibraryAndArtist('library-1', 'artist-1', { include: { artist: true } });

      expect(result).toEqual(libraryArtistWithInclude);
      expect(mockPrismaClient.libraryArtist.findFirst).toHaveBeenCalledWith({
        where: {
          libraryId: 'library-1',
          artistId: 'artist-1',
          artist: { deletedAt: null },
        },
        include: { artist: true },
      });
    });

    it('should merge artist filter with deletedAt constraint', async () => {
      mockPrismaClient.libraryArtist.findFirst.mockResolvedValue(mockLibraryArtist);

      await repository.getByLibraryAndArtist('library-1', 'artist-1');

      expect(mockPrismaClient.libraryArtist.findFirst).toHaveBeenCalledWith({
        where: {
          libraryId: 'library-1',
          artistId: 'artist-1',
          artist: { deletedAt: null },
        },
      });
    });
  });

  describe('getPaginated', () => {
    it('should return paginated library artists without filter or orderBy', async () => {
      mockPrismaClient.libraryArtist.findMany.mockResolvedValue([mockLibraryArtist]);

      const result = await repository.getPaginated(1, 10);

      expect(result).toEqual([mockLibraryArtist]);
      expect(mockPrismaClient.libraryArtist.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: {
          deletedAt: null,
          artist: { deletedAt: null },
        },
        orderBy: undefined,
      });
    });

    it('should return paginated library artists with filter and orderBy', async () => {
      mockPrismaClient.libraryArtist.findMany.mockResolvedValue([mockLibraryArtist]);
      const filter = { libraryId: 'library-1' } as Prisma.LibraryArtistWhereInput;
      const orderBy = { addedAt: 'desc' } as Prisma.LibraryArtistOrderByWithRelationInput;

      const result = await repository.getPaginated(2, 5, filter, orderBy);

      expect(result).toEqual([mockLibraryArtist]);
      expect(mockPrismaClient.libraryArtist.findMany).toHaveBeenCalledWith({
        take: 5,
        skip: 5,
        where: {
          libraryId: 'library-1',
          deletedAt: null,
          artist: { deletedAt: null },
        },
        orderBy: { addedAt: 'desc' },
      });
    });

    it('should return paginated library artists with deletedAt filter', async () => {
      mockPrismaClient.libraryArtist.findMany.mockResolvedValue([mockLibraryArtist]);
      const filter = { deletedAt: new Date('2024-01-02') };

      const result = await repository.getPaginated(1, 10, filter);

      expect(mockPrismaClient.libraryArtist.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: {
          deletedAt: new Date('2024-01-02'),
          artist: { deletedAt: null },
        },
        orderBy: undefined,
      });
    });

    it('should return paginated library artists with artist filter', async () => {
      mockPrismaClient.libraryArtist.findMany.mockResolvedValue([mockLibraryArtist]);
      const filter = { artist: { name: 'Test' } } as Prisma.LibraryArtistWhereInput;

      const result = await repository.getPaginated(1, 10, filter);

      expect(mockPrismaClient.libraryArtist.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: {
          deletedAt: null,
          artist: { name: 'Test', deletedAt: null },
        },
        orderBy: undefined,
      });
    });

    it('should return paginated library artists with include', async () => {
      const libraryArtistWithInclude = { ...mockLibraryArtist, artist: { id: 'artist-1' } };
      mockPrismaClient.libraryArtist.findMany.mockResolvedValue([libraryArtistWithInclude] as unknown as LibraryArtist[]);

      const result = await repository.getPaginated(1, 10, undefined, undefined, { include: { artist: true } });

      expect(mockPrismaClient.libraryArtist.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: {
          deletedAt: null,
          artist: { deletedAt: null },
        },
        orderBy: undefined,
        include: { artist: true },
      });
    });
  });

  describe('exists', () => {
    it('should return true if library artist exists', async () => {
      mockPrismaClient.libraryArtist.count.mockResolvedValue(1);

      const result = await repository.exists('library-artist-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.libraryArtist.count).toHaveBeenCalledWith({
        where: { id: 'library-artist-1', deletedAt: null },
      });
    });

    it('should return false if library artist does not exist', async () => {
      mockPrismaClient.libraryArtist.count.mockResolvedValue(0);

      const result = await repository.exists('library-artist-1');

      expect(result).toBe(false);
    });
  });

  describe('existsForLibraryAndArtist', () => {
    it('should return true if library artist exists for library and artist', async () => {
      mockPrismaClient.libraryArtist.count.mockResolvedValue(1);

      const result = await repository.existsForLibraryAndArtist('library-1', 'artist-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.libraryArtist.count).toHaveBeenCalledWith({
        where: {
          libraryId: 'library-1',
          artistId: 'artist-1',
          artist: { deletedAt: null },
        },
      });
    });

    it('should return false if library artist does not exist', async () => {
      mockPrismaClient.libraryArtist.count.mockResolvedValue(0);

      const result = await repository.existsForLibraryAndArtist('library-1', 'artist-1');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count library artists without filter', async () => {
      mockPrismaClient.libraryArtist.count.mockResolvedValue(5);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(mockPrismaClient.libraryArtist.count).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          artist: { deletedAt: null },
        },
      });
    });

    it('should count library artists with filter', async () => {
      mockPrismaClient.libraryArtist.count.mockResolvedValue(3);
      const filter = { libraryId: 'library-1' } as Prisma.LibraryArtistWhereInput;

      const result = await repository.count(filter);

      expect(result).toBe(3);
      expect(mockPrismaClient.libraryArtist.count).toHaveBeenCalledWith({
        where: {
          libraryId: 'library-1',
          deletedAt: null,
          artist: { deletedAt: null },
        },
      });
    });

    it('should count library artists with deletedAt filter', async () => {
      mockPrismaClient.libraryArtist.count.mockResolvedValue(1);
      const filter = { deletedAt: new Date('2024-01-02') };

      const result = await repository.count(filter);

      expect(mockPrismaClient.libraryArtist.count).toHaveBeenCalledWith({
        where: {
          deletedAt: new Date('2024-01-02'),
          artist: { deletedAt: null },
        },
      });
    });

    it('should count library artists with artist filter', async () => {
      mockPrismaClient.libraryArtist.count.mockResolvedValue(2);
      const filter = { artist: { name: 'Test' } } as Prisma.LibraryArtistWhereInput;

      const result = await repository.count(filter);

      expect(mockPrismaClient.libraryArtist.count).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          artist: { name: 'Test', deletedAt: null },
        },
      });
    });
  });

  describe('create', () => {
    it('should create library artist without include', async () => {
      const createInput = { libraryId: 'library-1', artistId: 'artist-1', addedAt: new Date() } as Prisma.LibraryArtistCreateInput;
      mockPrismaClient.libraryArtist.create.mockResolvedValue(mockLibraryArtist);

      const result = await repository.create(createInput);

      expect(result).toEqual(mockLibraryArtist);
      expect(mockPrismaClient.libraryArtist.create).toHaveBeenCalledWith({
        data: createInput,
      });
    });

    it('should create library artist with include', async () => {
      const createInput = { libraryId: 'library-1', artistId: 'artist-1', addedAt: new Date() } as Prisma.LibraryArtistCreateInput;
      const libraryArtistWithInclude = { ...mockLibraryArtist, artist: { id: 'artist-1' } };
      mockPrismaClient.libraryArtist.create.mockResolvedValue(libraryArtistWithInclude as unknown as LibraryArtist);

      const result = await repository.create(createInput, { include: { artist: true } });

      expect(result).toEqual(libraryArtistWithInclude);
      expect(mockPrismaClient.libraryArtist.create).toHaveBeenCalledWith({
        data: createInput,
        include: { artist: true },
      });
    });
  });

  describe('createMany', () => {
    it('should create many library artists without include', async () => {
      const createInputs = [{ libraryId: 'library-1', artistId: 'artist-1' }, { libraryId: 'library-1', artistId: 'artist-2' }] as Prisma.LibraryArtistCreateManyInput[];
      mockPrismaClient.libraryArtist.createManyAndReturn.mockResolvedValue([mockLibraryArtist]);

      const result = await repository.createMany(createInputs);

      expect(result).toEqual([mockLibraryArtist]);
      expect(mockPrismaClient.libraryArtist.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
      });
    });

    it('should create many library artists with include', async () => {
      const createInputs = [{ libraryId: 'library-1', artistId: 'artist-1' }] as Prisma.LibraryArtistCreateManyInput[];
      const libraryArtistsWithInclude = [{ ...mockLibraryArtist, artist: { id: 'artist-1' } }];
      mockPrismaClient.libraryArtist.createManyAndReturn.mockResolvedValue(libraryArtistsWithInclude as unknown as LibraryArtist[]);

      const result = await repository.createMany(createInputs, { include: { artist: true } });

      expect(mockPrismaClient.libraryArtist.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
        include: { artist: true },
      });
    });
  });

  describe('update', () => {
    it('should update library artist without include', async () => {
      const updateInput = { addedAt: new Date('2024-02-01') } as Prisma.LibraryArtistUpdateInput;
      mockPrismaClient.libraryArtist.update.mockResolvedValue(mockLibraryArtist);

      const result = await repository.update('library-artist-1', updateInput);

      expect(result).toEqual(mockLibraryArtist);
      expect(mockPrismaClient.libraryArtist.update).toHaveBeenCalledWith({
        data: updateInput,
        where: { id: 'library-artist-1' },
      });
    });

    it('should update library artist with include', async () => {
      const updateInput = { addedAt: new Date('2024-02-01') } as Prisma.LibraryArtistUpdateInput;
      const libraryArtistWithInclude = { ...mockLibraryArtist, artist: { id: 'artist-1' } };
      mockPrismaClient.libraryArtist.update.mockResolvedValue(libraryArtistWithInclude as unknown as LibraryArtist);

      const result = await repository.update('library-artist-1', updateInput, { include: { artist: true } });

      expect(mockPrismaClient.libraryArtist.update).toHaveBeenCalledWith({
        data: updateInput,
        where: { id: 'library-artist-1' },
        include: { artist: true },
      });
    });
  });

  describe('updateMany', () => {
    it('should update many library artists without include', async () => {
      const updates = [
        { id: 'library-artist-1', data: { addedAt: new Date('2024-02-01') } as Prisma.LibraryArtistUpdateInput },
        { id: 'library-artist-2', data: { addedAt: new Date('2024-02-02') } as Prisma.LibraryArtistUpdateInput },
      ];
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.libraryArtist.update.mockResolvedValue(mockLibraryArtist);

      const result = await repository.updateMany(updates);

      expect(mockMainClient.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should update many library artists with include', async () => {
      const updates = [
        { id: 'library-artist-1', data: { addedAt: new Date('2024-02-01') } as Prisma.LibraryArtistUpdateInput },
      ];
      const libraryArtistWithInclude = { ...mockLibraryArtist, artist: { id: 'artist-1' } };
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.libraryArtist.update.mockResolvedValue(libraryArtistWithInclude as unknown as LibraryArtist);

      const result = await repository.updateMany(updates, { include: { artist: true } });

      expect(mockMainClient.$transaction).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should hard delete library artist', async () => {
      mockPrismaClient.libraryArtist.delete.mockResolvedValue(mockLibraryArtist);

      const result = await repository.delete('library-artist-1');

      expect(result).toEqual(mockLibraryArtist);
      expect(mockPrismaClient.libraryArtist.delete).toHaveBeenCalledWith({
        where: { id: 'library-artist-1' },
      });
    });
  });

  describe('softDelete', () => {
    it('should soft delete library artist', async () => {
      const deletedLibraryArtist = { ...mockLibraryArtist, deletedAt: new Date() };
      mockPrismaClient.libraryArtist.update.mockResolvedValue(deletedLibraryArtist);

      const result = await repository.softDelete('library-artist-1');

      expect(result).toEqual(deletedLibraryArtist);
      expect(mockPrismaClient.libraryArtist.update).toHaveBeenCalledWith({
        where: { id: 'library-artist-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('deleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.deleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.libraryArtist.findMany).not.toHaveBeenCalled();
    });

    it('should hard delete many library artists', async () => {
      mockPrismaClient.libraryArtist.findMany.mockResolvedValue([mockLibraryArtist]);
      mockPrismaClient.libraryArtist.deleteMany.mockResolvedValue({ count: 1 });

      const result = await repository.deleteMany(['library-artist-1', 'library-artist-2']);

      expect(result).toEqual([mockLibraryArtist]);
      expect(mockPrismaClient.libraryArtist.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['library-artist-1', 'library-artist-2'] } },
      });
      expect(mockPrismaClient.libraryArtist.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['library-artist-1', 'library-artist-2'] } },
      });
    });
  });

  describe('softDeleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.softDeleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.libraryArtist.findMany).not.toHaveBeenCalled();
    });

    it('should soft delete many library artists', async () => {
      const libraryArtistsToDelete = [
        { ...mockLibraryArtist, id: 'library-artist-1' },
        { ...mockLibraryArtist, id: 'library-artist-2' },
      ];
      mockPrismaClient.libraryArtist.findMany.mockResolvedValue(libraryArtistsToDelete);
      mockPrismaClient.libraryArtist.updateMany.mockResolvedValue({ count: 2 });

      const result = await repository.softDeleteMany(['library-artist-1', 'library-artist-2']);

      expect(result).toEqual(libraryArtistsToDelete);
      expect(mockPrismaClient.libraryArtist.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['library-artist-1', 'library-artist-2'] }, deletedAt: null },
      });
      expect(mockPrismaClient.libraryArtist.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['library-artist-1', 'library-artist-2'] }, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
