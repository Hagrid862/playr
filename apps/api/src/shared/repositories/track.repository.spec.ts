import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrackRepository } from './track.repository';
import { PrismaService } from '../services/prisma.service';
import { AccessRole, Prisma, Track } from '@repo/db';

describe('TrackRepository', () => {
  let repository: TrackRepository;
  let prismaService: PrismaService;
  let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;
  let mockMainClient: ReturnType<typeof createMockPrismaClient>;

  const createMockPrismaClient = () => ({
    track: {
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
    repository = new TrackRepository(prismaService);
  });

  const mockTrack: Track = {
    id: 'track-1',
    name: 'Test Track',
    albumId: 'album-1',
    duration: 180,
    diskNumber: 1,
    trackNumber: 1,
    explicit: false,
    lyrics: null,
    visibility: 'public',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  describe('getById', () => {
    it('should return track by id without include', async () => {
      mockPrismaClient.track.findUnique.mockResolvedValue(mockTrack);

      const result = await repository.getById('track-1');

      expect(result).toEqual(mockTrack);
      expect(mockPrismaClient.track.findUnique).toHaveBeenCalledWith({
        where: { id: 'track-1' },
      });
    });

    it('should return track by id with include', async () => {
      const trackWithInclude = { ...mockTrack, artists: [] };
      mockPrismaClient.track.findUnique.mockResolvedValue(trackWithInclude as unknown as Track);

      const result = await repository.getById('track-1', { include: { artists: true } });

      expect(result).toEqual(trackWithInclude);
      expect(mockPrismaClient.track.findUnique).toHaveBeenCalledWith({
        where: { id: 'track-1' },
        include: { artists: true },
      });
    });

    it('should return null if track not found', async () => {
      mockPrismaClient.track.findUnique.mockResolvedValue(null);

      const result = await repository.getById('non-existent');

      expect(result).toBeNull();
    });

    it('should return null if track is soft-deleted', async () => {
      mockPrismaClient.track.findUnique.mockResolvedValue({
        ...mockTrack,
        deletedAt: new Date('2024-01-02'),
      });

      const result = await repository.getById('track-1');

      expect(result).toBeNull();
    });
  });

  describe('getByIdForOwner', () => {
    it('should return track for owner without include', async () => {
      mockPrismaClient.track.findFirst.mockResolvedValue(mockTrack);

      const result = await repository.getByIdForOwner('track-1', 'user-1');

      expect(result).toEqual(mockTrack);
      expect(mockPrismaClient.track.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'track-1',
          deletedAt: null,
          access: { some: { userId: 'user-1', role: AccessRole.owner } },
        },
      });
    });

    it('should return track for owner with include', async () => {
      const trackWithInclude = { ...mockTrack, artists: [] };
      mockPrismaClient.track.findFirst.mockResolvedValue(trackWithInclude as unknown as Track);

      const result = await repository.getByIdForOwner('track-1', 'user-1', { include: { artists: true } });

      expect(result).toEqual(trackWithInclude);
      expect(mockPrismaClient.track.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'track-1',
          deletedAt: null,
          access: { some: { userId: 'user-1', role: AccessRole.owner } },
        },
        include: { artists: true },
      });
    });
  });

  describe('listByAlbumId', () => {
    it('should return tracks by album id without include', async () => {
      mockPrismaClient.track.findMany.mockResolvedValue([mockTrack]);

      const result = await repository.listByAlbumId('album-1');

      expect(result).toEqual([mockTrack]);
      expect(mockPrismaClient.track.findMany).toHaveBeenCalledWith({
        where: { albumId: 'album-1', deletedAt: null },
        orderBy: [{ diskNumber: 'asc' }, { trackNumber: 'asc' }],
      });
    });

    it('should return tracks by album id with include', async () => {
      const trackWithInclude = { ...mockTrack, artists: [] };
      mockPrismaClient.track.findMany.mockResolvedValue([trackWithInclude] as unknown as Track[]);

      const result = await repository.listByAlbumId('album-1', { include: { artists: true } });

      expect(mockPrismaClient.track.findMany).toHaveBeenCalledWith({
        where: { albumId: 'album-1', deletedAt: null },
        orderBy: [{ diskNumber: 'asc' }, { trackNumber: 'asc' }],
        include: { artists: true },
      });
    });
  });

  describe('listByArtistId', () => {
    it('should return tracks by artist id without options', async () => {
      mockPrismaClient.track.findMany.mockResolvedValue([mockTrack]);

      const result = await repository.listByArtistId('artist-1');

      expect(result).toEqual([mockTrack]);
      expect(mockPrismaClient.track.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          artists: { some: { id: 'artist-1' } },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return tracks by artist id with pagination', async () => {
      mockPrismaClient.track.findMany.mockResolvedValue([mockTrack]);

      const result = await repository.listByArtistId('artist-1', { take: 10, skip: 5 });

      expect(mockPrismaClient.track.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          artists: { some: { id: 'artist-1' } },
        },
        take: 10,
        skip: 5,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return tracks by artist id with custom orderBy', async () => {
      mockPrismaClient.track.findMany.mockResolvedValue([mockTrack]);
      const orderBy = { name: 'asc' } as Prisma.TrackOrderByWithRelationInput;

      const result = await repository.listByArtistId('artist-1', { orderBy });

      expect(mockPrismaClient.track.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          artists: { some: { id: 'artist-1' } },
        },
        orderBy: { name: 'asc' },
      });
    });

    it('should return tracks by artist id with include', async () => {
      const trackWithInclude = { ...mockTrack, artists: [] };
      mockPrismaClient.track.findMany.mockResolvedValue([trackWithInclude] as unknown as Track[]);

      const result = await repository.listByArtistId('artist-1', { include: { artists: true } });

      expect(mockPrismaClient.track.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          artists: { some: { id: 'artist-1' } },
        },
        orderBy: { createdAt: 'desc' },
        include: { artists: true },
      });
    });
  });

  describe('listAccessibleForPrincipal', () => {
    it('should return accessible tracks for guest without options', async () => {
      mockPrismaClient.track.findMany.mockResolvedValue([mockTrack]);

      const result = await repository.listAccessibleForPrincipal(undefined);

      expect(result).toEqual([mockTrack]);
      expect(mockPrismaClient.track.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          OR: [
            { visibility: 'public' },
            { access: { some: { userId: 'GUEST' } } },
            { album: { access: { some: { userId: 'GUEST' } } } },
            { artists: { some: { access: { some: { userId: 'GUEST' } } } } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return accessible tracks for user', async () => {
      mockPrismaClient.track.findMany.mockResolvedValue([mockTrack]);

      const result = await repository.listAccessibleForPrincipal('user-1');

      expect(mockPrismaClient.track.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          OR: [
            { visibility: 'public' },
            { access: { some: { userId: 'user-1' } } },
            { album: { access: { some: { userId: 'user-1' } } } },
            { artists: { some: { access: { some: { userId: 'user-1' } } } } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return accessible tracks with pagination', async () => {
      mockPrismaClient.track.findMany.mockResolvedValue([mockTrack]);

      const result = await repository.listAccessibleForPrincipal('user-1', { take: 10, skip: 5 });

      expect(mockPrismaClient.track.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          OR: [
            { visibility: 'public' },
            { access: { some: { userId: 'user-1' } } },
            { album: { access: { some: { userId: 'user-1' } } } },
            { artists: { some: { access: { some: { userId: 'user-1' } } } } },
          ],
        },
        take: 10,
        skip: 5,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return accessible tracks with custom orderBy', async () => {
      mockPrismaClient.track.findMany.mockResolvedValue([mockTrack]);
      const orderBy = { name: 'asc' } as Prisma.TrackOrderByWithRelationInput;

      const result = await repository.listAccessibleForPrincipal('user-1', { orderBy });

      expect(mockPrismaClient.track.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          OR: [
            { visibility: 'public' },
            { access: { some: { userId: 'user-1' } } },
            { album: { access: { some: { userId: 'user-1' } } } },
            { artists: { some: { access: { some: { userId: 'user-1' } } } } },
          ],
        },
        orderBy: { name: 'asc' },
      });
    });

    it('should return accessible tracks with include', async () => {
      const trackWithInclude = { ...mockTrack, artists: [] };
      mockPrismaClient.track.findMany.mockResolvedValue([trackWithInclude] as unknown as Track[]);

      const result = await repository.listAccessibleForPrincipal('user-1', { include: { artists: true } });

      expect(mockPrismaClient.track.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          OR: [
            { visibility: 'public' },
            { access: { some: { userId: 'user-1' } } },
            { album: { access: { some: { userId: 'user-1' } } } },
            { artists: { some: { access: { some: { userId: 'user-1' } } } } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: { artists: true },
      });
    });
  });

  describe('getPaginated', () => {
    it('should return paginated tracks without filter or orderBy', async () => {
      mockPrismaClient.track.findMany.mockResolvedValue([mockTrack]);

      const result = await repository.getPaginated(1, 10);

      expect(result).toEqual([mockTrack]);
      expect(mockPrismaClient.track.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: null },
        orderBy: undefined,
      });
    });

    it('should return paginated tracks with filter and orderBy', async () => {
      mockPrismaClient.track.findMany.mockResolvedValue([mockTrack]);
      const filter = { name: 'Test' } as Prisma.TrackWhereInput;
      const orderBy = { name: 'asc' } as Prisma.TrackOrderByWithRelationInput;

      const result = await repository.getPaginated(2, 5, filter, orderBy);

      expect(result).toEqual([mockTrack]);
      expect(mockPrismaClient.track.findMany).toHaveBeenCalledWith({
        take: 5,
        skip: 5,
        where: { name: 'Test', deletedAt: null },
        orderBy: { name: 'asc' },
      });
    });

    it('should return paginated tracks with include', async () => {
      const trackWithInclude = { ...mockTrack, artists: [] };
      mockPrismaClient.track.findMany.mockResolvedValue([trackWithInclude] as unknown as Track[]);

      const result = await repository.getPaginated(1, 10, undefined, undefined, { include: { artists: true } });

      expect(mockPrismaClient.track.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: null },
        orderBy: undefined,
        include: { artists: true },
      });
    });
  });

  describe('exists', () => {
    it('should return true if track exists', async () => {
      mockPrismaClient.track.count.mockResolvedValue(1);

      const result = await repository.exists('track-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.track.count).toHaveBeenCalledWith({
        where: { id: 'track-1', deletedAt: null },
      });
    });

    it('should return false if track does not exist', async () => {
      mockPrismaClient.track.count.mockResolvedValue(0);

      const result = await repository.exists('track-1');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count tracks without filter', async () => {
      mockPrismaClient.track.count.mockResolvedValue(5);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(mockPrismaClient.track.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });

    it('should count tracks with filter', async () => {
      mockPrismaClient.track.count.mockResolvedValue(3);
      const filter = { name: 'Test' } as Prisma.TrackWhereInput;

      const result = await repository.count(filter);

      expect(result).toBe(3);
      expect(mockPrismaClient.track.count).toHaveBeenCalledWith({
        where: { name: 'Test', deletedAt: null },
      });
    });
  });

  describe('checkAccess', () => {
    it('should return true if track is accessible by guest', async () => {
      mockPrismaClient.track.findFirst.mockResolvedValue({ id: 'track-1' } as Track);

      const result = await repository.checkAccess('track-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.track.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'track-1',
          deletedAt: null,
          OR: [
            { visibility: 'public' },
            { access: { some: { userId: 'GUEST' } } },
            { album: { access: { some: { userId: 'GUEST' } } } },
            { artists: { some: { access: { some: { userId: 'GUEST' } } } } },
          ],
        },
        select: { id: true },
      });
    });

    it('should return true if track is accessible by user', async () => {
      mockPrismaClient.track.findFirst.mockResolvedValue({ id: 'track-1' } as Track);

      const result = await repository.checkAccess('track-1', 'user-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.track.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'track-1',
          deletedAt: null,
          OR: [
            { visibility: 'public' },
            { access: { some: { userId: 'user-1' } } },
            { album: { access: { some: { userId: 'user-1' } } } },
            { artists: { some: { access: { some: { userId: 'user-1' } } } } },
          ],
        },
        select: { id: true },
      });
    });

    it('should return false if track is not accessible', async () => {
      mockPrismaClient.track.findFirst.mockResolvedValue(null);

      const result = await repository.checkAccess('track-1', 'user-1');

      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('should create track without include', async () => {
      const createInput = { name: 'New Track', albumId: 'album-1' } as Prisma.TrackCreateInput;
      mockPrismaClient.track.create.mockResolvedValue(mockTrack);

      const result = await repository.create(createInput);

      expect(result).toEqual(mockTrack);
      expect(mockPrismaClient.track.create).toHaveBeenCalledWith({
        data: createInput,
      });
    });

    it('should create track with include', async () => {
      const createInput = { name: 'New Track', albumId: 'album-1' } as Prisma.TrackCreateInput;
      const trackWithInclude = { ...mockTrack, artists: [] };
      mockPrismaClient.track.create.mockResolvedValue(trackWithInclude as unknown as Track);

      const result = await repository.create(createInput, { include: { artists: true } });

      expect(result).toEqual(trackWithInclude);
      expect(mockPrismaClient.track.create).toHaveBeenCalledWith({
        data: createInput,
        include: { artists: true },
      });
    });
  });

  describe('createMany', () => {
    it('should create many tracks without include', async () => {
      const createInputs = [{ name: 'Track 1' }, { name: 'Track 2' }] as Prisma.TrackCreateManyInput[];
      mockPrismaClient.track.createManyAndReturn.mockResolvedValue([mockTrack]);

      const result = await repository.createMany(createInputs);

      expect(result).toEqual([mockTrack]);
      expect(mockPrismaClient.track.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
      });
    });

    it('should create many tracks with include', async () => {
      const createInputs = [{ name: 'Track 1' }] as Prisma.TrackCreateManyInput[];
      const tracksWithInclude = [{ ...mockTrack, artists: [] }];
      mockPrismaClient.track.createManyAndReturn.mockResolvedValue(tracksWithInclude as unknown as Track[]);

      const result = await repository.createMany(createInputs, { include: { artists: true } });

      expect(mockPrismaClient.track.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
        include: { artists: true },
      });
    });
  });

  describe('update', () => {
    it('should update track without include', async () => {
      const updateInput = { name: 'Updated Track' } as Prisma.TrackUpdateInput;
      mockPrismaClient.track.update.mockResolvedValue(mockTrack);

      const result = await repository.update('track-1', updateInput);

      expect(result).toEqual(mockTrack);
      expect(mockPrismaClient.track.update).toHaveBeenCalledWith({
        where: { id: 'track-1' },
        data: updateInput,
      });
    });

    it('should update track with include', async () => {
      const updateInput = { name: 'Updated Track' } as Prisma.TrackUpdateInput;
      const trackWithInclude = { ...mockTrack, artists: [] };
      mockPrismaClient.track.update.mockResolvedValue(trackWithInclude as unknown as Track);

      const result = await repository.update('track-1', updateInput, { include: { artists: true } });

      expect(mockPrismaClient.track.update).toHaveBeenCalledWith({
        where: { id: 'track-1' },
        data: updateInput,
        include: { artists: true },
      });
    });
  });

  describe('updateMany', () => {
    it('should update many tracks without include', async () => {
      const updates = [
        { id: 'track-1', data: { name: 'Updated 1' } as Prisma.TrackUpdateInput },
        { id: 'track-2', data: { name: 'Updated 2' } as Prisma.TrackUpdateInput },
      ];
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.track.update.mockResolvedValue(mockTrack);

      const result = await repository.updateMany(updates);

      expect(mockMainClient.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should update many tracks with include', async () => {
      const updates = [
        { id: 'track-1', data: { name: 'Updated 1' } as Prisma.TrackUpdateInput },
      ];
      const trackWithInclude = { ...mockTrack, artists: [] };
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.track.update.mockResolvedValue(trackWithInclude as unknown as Track);

      const result = await repository.updateMany(updates, { include: { artists: true } });

      expect(mockMainClient.$transaction).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should hard delete track', async () => {
      mockPrismaClient.track.delete.mockResolvedValue(mockTrack);

      const result = await repository.delete('track-1');

      expect(result).toEqual(mockTrack);
      expect(mockPrismaClient.track.delete).toHaveBeenCalledWith({
        where: { id: 'track-1' },
      });
    });
  });

  describe('softDelete', () => {
    it('should soft delete track', async () => {
      const deletedTrack = { ...mockTrack, deletedAt: new Date() };
      mockPrismaClient.track.update.mockResolvedValue(deletedTrack);

      const result = await repository.softDelete('track-1');

      expect(result).toEqual(deletedTrack);
      expect(mockPrismaClient.track.update).toHaveBeenCalledWith({
        where: { id: 'track-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('deleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.deleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.track.findMany).not.toHaveBeenCalled();
    });

    it('should hard delete many tracks', async () => {
      mockPrismaClient.track.findMany.mockResolvedValue([mockTrack]);
      mockPrismaClient.track.deleteMany.mockResolvedValue({ count: 1 });

      const result = await repository.deleteMany(['track-1', 'track-2']);

      expect(result).toEqual([mockTrack]);
      expect(mockPrismaClient.track.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['track-1', 'track-2'] } },
      });
      expect(mockPrismaClient.track.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['track-1', 'track-2'] } },
      });
    });
  });

  describe('softDeleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.softDeleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.track.findMany).not.toHaveBeenCalled();
    });

    it('should soft delete many tracks', async () => {
      const tracksToDelete = [
        { ...mockTrack, id: 'track-1' },
        { ...mockTrack, id: 'track-2' },
      ];
      mockPrismaClient.track.findMany.mockResolvedValue(tracksToDelete);
      mockPrismaClient.track.updateMany.mockResolvedValue({ count: 2 });

      const result = await repository.softDeleteMany(['track-1', 'track-2']);

      expect(result).toEqual(tracksToDelete);
      expect(mockPrismaClient.track.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['track-1', 'track-2'] }, deletedAt: null },
      });
      expect(mockPrismaClient.track.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['track-1', 'track-2'] }, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
