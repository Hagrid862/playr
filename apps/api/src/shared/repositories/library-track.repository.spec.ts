import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LibraryTrackRepository } from './library-track.repository';
import { PrismaService } from '../services/prisma.service';
import { LibraryTrack, Prisma } from '@repo/db';

describe('LibraryTrackRepository', () => {
  let repository: LibraryTrackRepository;
  let prismaService: PrismaService;
  let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;
  let mockMainClient: ReturnType<typeof createMockPrismaClient>;

  const createMockPrismaClient = () => ({
    libraryTrack: {
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
    repository = new LibraryTrackRepository(prismaService);
  });

  const mockLibraryTrack: LibraryTrack = {
    id: 'library-track-1',
    listenedCount: 0,
    libraryId: 'library-1',
    trackId: 'track-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    listenCountResetAt: null,
    deletedAt: null,
  };

  describe('getById', () => {
    it('should return library track by id without include', async () => {
      mockPrismaClient.libraryTrack.findUnique.mockResolvedValue(mockLibraryTrack);

      const result = await repository.getById('library-track-1');

      expect(result).toEqual(mockLibraryTrack);
      expect(mockPrismaClient.libraryTrack.findUnique).toHaveBeenCalledWith({
        where: { id: 'library-track-1' },
      });
    });

    it('should return library track by id with include', async () => {
      const libraryTrackWithInclude = { ...mockLibraryTrack, track: { id: 'track-1' } };
      mockPrismaClient.libraryTrack.findUnique.mockResolvedValue(libraryTrackWithInclude as unknown as LibraryTrack);

      const result = await repository.getById('library-track-1', { include: { track: true } });

      expect(result).toEqual(libraryTrackWithInclude);
      expect(mockPrismaClient.libraryTrack.findUnique).toHaveBeenCalledWith({
        where: { id: 'library-track-1' },
        include: { track: true },
      });
    });

    it('should return null if library track not found', async () => {
      mockPrismaClient.libraryTrack.findUnique.mockResolvedValue(null);

      const result = await repository.getById('non-existent');

      expect(result).toBeNull();
    });

    it('should return null if library track is soft-deleted', async () => {
      mockPrismaClient.libraryTrack.findUnique.mockResolvedValue({
        ...mockLibraryTrack,
        deletedAt: new Date('2024-01-02'),
      });

      const result = await repository.getById('library-track-1');

      expect(result).toBeNull();
    });
  });

  describe('getByLibraryAndTrack', () => {
    it('should return library track by library and track ids without include', async () => {
      mockPrismaClient.libraryTrack.findFirst.mockResolvedValue(mockLibraryTrack);

      const result = await repository.getByLibraryAndTrack('library-1', 'track-1');

      expect(result).toEqual(mockLibraryTrack);
      expect(mockPrismaClient.libraryTrack.findFirst).toHaveBeenCalledWith({
        where: {
          libraryId: 'library-1',
          trackId: 'track-1',
          track: { deletedAt: null },
        },
      });
    });

    it('should return library track by library and track with include', async () => {
      const libraryTrackWithInclude = { ...mockLibraryTrack, track: { id: 'track-1', name: 'Test Track' } };
      mockPrismaClient.libraryTrack.findFirst.mockResolvedValue(libraryTrackWithInclude as unknown as LibraryTrack);

      const result = await repository.getByLibraryAndTrack('library-1', 'track-1', { include: { track: true } });

      expect(result).toEqual(libraryTrackWithInclude);
      expect(mockPrismaClient.libraryTrack.findFirst).toHaveBeenCalledWith({
        where: {
          libraryId: 'library-1',
          trackId: 'track-1',
          track: { deletedAt: null },
        },
        include: { track: true },
      });
    });

    it('should merge track filter with deletedAt constraint', async () => {
      mockPrismaClient.libraryTrack.findFirst.mockResolvedValue(mockLibraryTrack);

      await repository.getByLibraryAndTrack('library-1', 'track-1');

      expect(mockPrismaClient.libraryTrack.findFirst).toHaveBeenCalledWith({
        where: {
          libraryId: 'library-1',
          trackId: 'track-1',
          track: { deletedAt: null },
        },
      });
    });
  });

  describe('getPaginated', () => {
    it('should return paginated library tracks without filter or orderBy', async () => {
      mockPrismaClient.libraryTrack.findMany.mockResolvedValue([mockLibraryTrack]);

      const result = await repository.getPaginated(1, 10);

      expect(result).toEqual([mockLibraryTrack]);
      expect(mockPrismaClient.libraryTrack.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: {
          deletedAt: null,
          track: { deletedAt: null },
        },
        orderBy: undefined,
      });
    });

    it('should return paginated library tracks with filter and orderBy', async () => {
      mockPrismaClient.libraryTrack.findMany.mockResolvedValue([mockLibraryTrack]);
      const filter = { libraryId: 'library-1' } as Prisma.LibraryTrackWhereInput;
      const orderBy = { createdAt: 'desc' } as Prisma.LibraryTrackOrderByWithRelationInput;

      const result = await repository.getPaginated(2, 5, filter, orderBy);

      expect(result).toEqual([mockLibraryTrack]);
      expect(mockPrismaClient.libraryTrack.findMany).toHaveBeenCalledWith({
        take: 5,
        skip: 5,
        where: {
          libraryId: 'library-1',
          deletedAt: null,
          track: { deletedAt: null },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return paginated library tracks with deletedAt filter', async () => {
      mockPrismaClient.libraryTrack.findMany.mockResolvedValue([mockLibraryTrack]);
      const filter = { deletedAt: new Date('2024-01-02') };

      await repository.getPaginated(1, 10, filter);

      expect(mockPrismaClient.libraryTrack.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: {
          deletedAt: new Date('2024-01-02'),
          track: { deletedAt: null },
        },
        orderBy: undefined,
      });
    });

    it('should return paginated library tracks with track filter', async () => {
      mockPrismaClient.libraryTrack.findMany.mockResolvedValue([mockLibraryTrack]);
      const filter = { track: { name: 'Test' } } as Prisma.LibraryTrackWhereInput;

      await repository.getPaginated(1, 10, filter);

      expect(mockPrismaClient.libraryTrack.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: {
          deletedAt: null,
          track: { name: 'Test', deletedAt: null },
        },
        orderBy: undefined,
      });
    });

    it('should return paginated library tracks with include', async () => {
      const libraryTrackWithInclude = { ...mockLibraryTrack, track: { id: 'track-1' } };
      mockPrismaClient.libraryTrack.findMany.mockResolvedValue([libraryTrackWithInclude] as unknown as LibraryTrack[]);

      await repository.getPaginated(1, 10, undefined, undefined, { include: { track: true } });

      expect(mockPrismaClient.libraryTrack.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: {
          deletedAt: null,
          track: { deletedAt: null },
        },
        orderBy: undefined,
        include: { track: true },
      });
    });
  });

  describe('listByLibraryAndAlbum', () => {
    it('should return library tracks by library and album without options', async () => {
      mockPrismaClient.libraryTrack.findMany.mockResolvedValue([mockLibraryTrack]);

      const result = await repository.listByLibraryAndAlbum('library-1', 'album-1');

      expect(result).toEqual([mockLibraryTrack]);
      expect(mockPrismaClient.libraryTrack.findMany).toHaveBeenCalledWith({
        where: {
          libraryId: 'library-1',
          track: { albumId: 'album-1', deletedAt: null },
          deletedAt: null,
        },
      });
    });

    it('should return library tracks by library and album with orderBy', async () => {
      mockPrismaClient.libraryTrack.findMany.mockResolvedValue([mockLibraryTrack]);
      const orderBy = { createdAt: 'desc' } as Prisma.LibraryTrackOrderByWithRelationInput;

      await repository.listByLibraryAndAlbum('library-1', 'album-1', { orderBy });

      expect(mockPrismaClient.libraryTrack.findMany).toHaveBeenCalledWith({
        where: {
          libraryId: 'library-1',
          track: { albumId: 'album-1', deletedAt: null },
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return library tracks by library and album with include', async () => {
      const libraryTrackWithInclude = { ...mockLibraryTrack, track: { id: 'track-1' } };
      mockPrismaClient.libraryTrack.findMany.mockResolvedValue([libraryTrackWithInclude] as unknown as LibraryTrack[]);

      await repository.listByLibraryAndAlbum('library-1', 'album-1', { include: { track: true } });

      expect(mockPrismaClient.libraryTrack.findMany).toHaveBeenCalledWith({
        where: {
          libraryId: 'library-1',
          track: { albumId: 'album-1', deletedAt: null },
          deletedAt: null,
        },
        include: { track: true },
      });
    });

    it('should return library tracks with array orderBy', async () => {
      mockPrismaClient.libraryTrack.findMany.mockResolvedValue([mockLibraryTrack]);
      const orderBy = [{ createdAt: 'desc' }] as Prisma.LibraryTrackOrderByWithRelationInput[];

      await repository.listByLibraryAndAlbum('library-1', 'album-1', { orderBy });

      expect(mockPrismaClient.libraryTrack.findMany).toHaveBeenCalledWith({
        where: {
          libraryId: 'library-1',
          track: { albumId: 'album-1', deletedAt: null },
          deletedAt: null,
        },
        orderBy: [{ createdAt: 'desc' }],
      });
    });
  });

  describe('listIdsByTrackAndUser', () => {
    it('should return library track ids by track and user', async () => {
      mockPrismaClient.libraryTrack.findMany.mockResolvedValue([
        { id: 'library-track-1' },
        { id: 'library-track-2' },
      ] as unknown as LibraryTrack[]);

      const result = await repository.listIdsByTrackAndUser('track-1', 'user-1');

      expect(result).toEqual(['library-track-1', 'library-track-2']);
      expect(mockPrismaClient.libraryTrack.findMany).toHaveBeenCalledWith({
        where: {
          trackId: 'track-1',
          deletedAt: null,
          library: { userId: 'user-1' },
        },
        select: { id: true },
      });
    });

    it('should return empty array when no library tracks found', async () => {
      mockPrismaClient.libraryTrack.findMany.mockResolvedValue([]);

      const result = await repository.listIdsByTrackAndUser('track-1', 'user-1');

      expect(result).toEqual([]);
    });
  });

  describe('exists', () => {
    it('should return true if library track exists', async () => {
      mockPrismaClient.libraryTrack.count.mockResolvedValue(1);

      const result = await repository.exists('library-track-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.libraryTrack.count).toHaveBeenCalledWith({
        where: { id: 'library-track-1', deletedAt: null },
      });
    });

    it('should return false if library track does not exist', async () => {
      mockPrismaClient.libraryTrack.count.mockResolvedValue(0);

      const result = await repository.exists('library-track-1');

      expect(result).toBe(false);
    });
  });

  describe('existsForLibraryAndTrack', () => {
    it('should return true if library track exists for library and track', async () => {
      mockPrismaClient.libraryTrack.count.mockResolvedValue(1);

      const result = await repository.existsForLibraryAndTrack('library-1', 'track-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.libraryTrack.count).toHaveBeenCalledWith({
        where: {
          libraryId: 'library-1',
          trackId: 'track-1',
          track: { deletedAt: null },
        },
      });
    });

    it('should return false if library track does not exist', async () => {
      mockPrismaClient.libraryTrack.count.mockResolvedValue(0);

      const result = await repository.existsForLibraryAndTrack('library-1', 'track-1');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count library tracks without filter', async () => {
      mockPrismaClient.libraryTrack.count.mockResolvedValue(5);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(mockPrismaClient.libraryTrack.count).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          track: { deletedAt: null },
        },
      });
    });

    it('should count library tracks with filter', async () => {
      mockPrismaClient.libraryTrack.count.mockResolvedValue(3);
      const filter = { libraryId: 'library-1' } as Prisma.LibraryTrackWhereInput;

      const result = await repository.count(filter);

      expect(result).toBe(3);
      expect(mockPrismaClient.libraryTrack.count).toHaveBeenCalledWith({
        where: {
          libraryId: 'library-1',
          deletedAt: null,
          track: { deletedAt: null },
        },
      });
    });

    it('should count library tracks with deletedAt filter', async () => {
      mockPrismaClient.libraryTrack.count.mockResolvedValue(1);
      const filter = { deletedAt: new Date('2024-01-02') };

      await repository.count(filter);

      expect(mockPrismaClient.libraryTrack.count).toHaveBeenCalledWith({
        where: {
          deletedAt: new Date('2024-01-02'),
          track: { deletedAt: null },
        },
      });
    });

    it('should count library tracks with track filter', async () => {
      mockPrismaClient.libraryTrack.count.mockResolvedValue(2);
      const filter = { track: { name: 'Test' } } as Prisma.LibraryTrackWhereInput;

      const result = await repository.count(filter);

      expect(result).toBe(2);
      expect(mockPrismaClient.libraryTrack.count).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          track: { name: 'Test', deletedAt: null },
        },
      });
    });
  });

  describe('create', () => {
    it('should create library track without include', async () => {
      const createInput = {
        library: { connect: { id: 'library-1' } },
        track: { connect: { id: 'track-1' } },
      } as Prisma.LibraryTrackCreateInput;
      mockPrismaClient.libraryTrack.create.mockResolvedValue(mockLibraryTrack);

      const result = await repository.create(createInput);

      expect(result).toEqual(mockLibraryTrack);
      expect(mockPrismaClient.libraryTrack.create).toHaveBeenCalledWith({
        data: createInput,
      });
    });

    it('should create library track with include', async () => {
      const createInput = {
        library: { connect: { id: 'library-1' } },
        track: { connect: { id: 'track-1' } },
      } as Prisma.LibraryTrackCreateInput;
      const libraryTrackWithInclude = { ...mockLibraryTrack, track: { id: 'track-1' } };
      mockPrismaClient.libraryTrack.create.mockResolvedValue(libraryTrackWithInclude as unknown as LibraryTrack);

      const result = await repository.create(createInput, { include: { track: true } });

      expect(result).toEqual(libraryTrackWithInclude);
      expect(mockPrismaClient.libraryTrack.create).toHaveBeenCalledWith({
        data: createInput,
        include: { track: true },
      });
    });
  });

  describe('createMany', () => {
    it('should create many library tracks without include', async () => {
      const createInputs = [{ libraryId: 'library-1', trackId: 'track-1' }, { libraryId: 'library-1', trackId: 'track-2' }] as Prisma.LibraryTrackCreateManyInput[];
      mockPrismaClient.libraryTrack.createManyAndReturn.mockResolvedValue([mockLibraryTrack]);

      const result = await repository.createMany(createInputs);

      expect(result).toEqual([mockLibraryTrack]);
      expect(mockPrismaClient.libraryTrack.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
      });
    });

    it('should create many library tracks with include', async () => {
      const createInputs = [{ libraryId: 'library-1', trackId: 'track-1' }] as Prisma.LibraryTrackCreateManyInput[];
      const libraryTracksWithInclude = [{ ...mockLibraryTrack, track: { id: 'track-1' } }];
      mockPrismaClient.libraryTrack.createManyAndReturn.mockResolvedValue(libraryTracksWithInclude as unknown as LibraryTrack[]);

      await repository.createMany(createInputs, { include: { track: true } });

      expect(mockPrismaClient.libraryTrack.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
        include: { track: true },
      });
    });
  });

  describe('update', () => {
    it('should update library track without include', async () => {
      const updateInput = {} as Prisma.LibraryTrackUpdateInput;
      mockPrismaClient.libraryTrack.update.mockResolvedValue(mockLibraryTrack);

      const result = await repository.update('library-track-1', updateInput);

      expect(result).toEqual(mockLibraryTrack);
      expect(mockPrismaClient.libraryTrack.update).toHaveBeenCalledWith({
        data: updateInput,
        where: { id: 'library-track-1' },
      });
    });

    it('should update library track with include', async () => {
      const updateInput = {} as Prisma.LibraryTrackUpdateInput;
      const libraryTrackWithInclude = { ...mockLibraryTrack, track: { id: 'track-1' } };
      mockPrismaClient.libraryTrack.update.mockResolvedValue(libraryTrackWithInclude as unknown as LibraryTrack);

      await repository.update('library-track-1', updateInput, { include: { track: true } });

      expect(mockPrismaClient.libraryTrack.update).toHaveBeenCalledWith({
        data: updateInput,
        where: { id: 'library-track-1' },
        include: { track: true },
      });
    });
  });

  describe('updateMany', () => {
    it('should update many library tracks without include', async () => {
      const updates = [
        { id: 'library-track-1', data: {} as Prisma.LibraryTrackUpdateInput },
        { id: 'library-track-2', data: {} as Prisma.LibraryTrackUpdateInput },
      ];
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.libraryTrack.update.mockResolvedValue(mockLibraryTrack);

      const result = await repository.updateMany(updates);

      expect(mockMainClient.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should update many library tracks with include', async () => {
      const updates = [
        { id: 'library-track-1', data: {} as Prisma.LibraryTrackUpdateInput },
      ];
      const libraryTrackWithInclude = { ...mockLibraryTrack, track: { id: 'track-1' } };
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.libraryTrack.update.mockResolvedValue(libraryTrackWithInclude as unknown as LibraryTrack);

      await repository.updateMany(updates, { include: { track: true } });

      expect(mockMainClient.$transaction).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should hard delete library track', async () => {
      mockPrismaClient.libraryTrack.delete.mockResolvedValue(mockLibraryTrack);

      const result = await repository.delete('library-track-1');

      expect(result).toEqual(mockLibraryTrack);
      expect(mockPrismaClient.libraryTrack.delete).toHaveBeenCalledWith({
        where: { id: 'library-track-1' },
      });
    });
  });

  describe('softDelete', () => {
    it('should soft delete library track', async () => {
      const deletedLibraryTrack = { ...mockLibraryTrack, deletedAt: new Date() };
      mockPrismaClient.libraryTrack.update.mockResolvedValue(deletedLibraryTrack);

      const result = await repository.softDelete('library-track-1');

      expect(result).toEqual(deletedLibraryTrack);
      expect(mockPrismaClient.libraryTrack.update).toHaveBeenCalledWith({
        where: { id: 'library-track-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('deleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.deleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.libraryTrack.findMany).not.toHaveBeenCalled();
    });

    it('should hard delete many library tracks', async () => {
      mockPrismaClient.libraryTrack.findMany.mockResolvedValue([mockLibraryTrack]);
      mockPrismaClient.libraryTrack.deleteMany.mockResolvedValue({ count: 1 });

      const result = await repository.deleteMany(['library-track-1', 'library-track-2']);

      expect(result).toEqual([mockLibraryTrack]);
      expect(mockPrismaClient.libraryTrack.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['library-track-1', 'library-track-2'] } },
      });
      expect(mockPrismaClient.libraryTrack.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['library-track-1', 'library-track-2'] } },
      });
    });
  });

  describe('softDeleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.softDeleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.libraryTrack.findMany).not.toHaveBeenCalled();
    });

    it('should soft delete many library tracks', async () => {
      const libraryTracksToDelete = [
        { ...mockLibraryTrack, id: 'library-track-1' },
        { ...mockLibraryTrack, id: 'library-track-2' },
      ];
      mockPrismaClient.libraryTrack.findMany.mockResolvedValue(libraryTracksToDelete);
      mockPrismaClient.libraryTrack.updateMany.mockResolvedValue({ count: 2 });

      const result = await repository.softDeleteMany(['library-track-1', 'library-track-2']);

      expect(result).toEqual(libraryTracksToDelete);
      expect(mockPrismaClient.libraryTrack.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['library-track-1', 'library-track-2'] }, deletedAt: null },
      });
      expect(mockPrismaClient.libraryTrack.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['library-track-1', 'library-track-2'] }, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
