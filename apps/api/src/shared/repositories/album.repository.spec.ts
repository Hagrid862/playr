import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlbumRepository } from './album.repository';
import { PrismaService } from '../services/prisma.service';
import { AccessRole, Album, AlbumType, Prisma, Visibility } from '@repo/db';

describe('AlbumRepository', () => {
  let repository: AlbumRepository;
  let prismaService: PrismaService;
  let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;
  let mockMainClient: ReturnType<typeof createMockPrismaClient>;

  const createMockPrismaClient = () => ({
    album: {
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
    report: {
      updateMany: vi.fn(),
    },
    reportTarget: {
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
    image: {
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
    libraryAlbum: {
      updateMany: vi.fn(),
    },
    libraryPin: {
      updateMany: vi.fn(),
    },
    communityComment: {
      updateMany: vi.fn(),
    },
    playlistTrack: {
      updateMany: vi.fn(),
    },
    libraryTrack: {
      updateMany: vi.fn(),
    },
    libraryFavorite: {
      updateMany: vi.fn(),
    },
    track: {
      updateMany: vi.fn(),
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
    repository = new AlbumRepository(prismaService);
  });

  const mockAlbum: Album = {
    id: 'album-1',
    name: 'Test Album',
    description: null,
    type: AlbumType.album,
    totalTracks: 10,
    totalDuration: 1800,
    releaseDate: null,
    coverId: null,
    visibility: Visibility.public,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  describe('getById', () => {
    it('should return album by id without include', async () => {
      mockPrismaClient.album.findUnique.mockResolvedValue(mockAlbum);

      const result = await repository.getById('album-1');

      expect(result).toEqual(mockAlbum);
      expect(mockPrismaClient.album.findUnique).toHaveBeenCalledWith({
        where: { id: 'album-1' },
      });
    });

    it('should return album by id with include', async () => {
      const albumWithInclude = { ...mockAlbum, tracks: [] };
      mockPrismaClient.album.findUnique.mockResolvedValue(albumWithInclude as unknown as Album);

      const result = await repository.getById('album-1', { include: { tracks: true } });

      expect(result).toEqual(albumWithInclude);
      expect(mockPrismaClient.album.findUnique).toHaveBeenCalledWith({
        where: { id: 'album-1' },
        include: { tracks: true },
      });
    });

    it('should return null if album not found', async () => {
      mockPrismaClient.album.findUnique.mockResolvedValue(null);

      const result = await repository.getById('non-existent');

      expect(result).toBeNull();
    });

    it('should return null if album is soft-deleted', async () => {
      mockPrismaClient.album.findUnique.mockResolvedValue({
        ...mockAlbum,
        deletedAt: new Date('2024-01-02'),
      });

      const result = await repository.getById('album-1');

      expect(result).toBeNull();
    });
  });

  describe('getByIdForOwner', () => {
    it('should return album for owner without include', async () => {
      mockPrismaClient.album.findFirst.mockResolvedValue(mockAlbum);

      const result = await repository.getByIdForOwner('album-1', 'user-1');

      expect(result).toEqual(mockAlbum);
      expect(mockPrismaClient.album.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'album-1',
          deletedAt: null,
          OR: [
            { access: { some: { userId: 'user-1', role: AccessRole.owner } } },
            {
              artists: { some: { access: { some: { userId: 'user-1', role: AccessRole.owner } } } },
            },
          ],
        },
      });
    });

    it('should return album for owner with include', async () => {
      const albumWithInclude = { ...mockAlbum, tracks: [] };
      mockPrismaClient.album.findFirst.mockResolvedValue(albumWithInclude as unknown as Album);

      const result = await repository.getByIdForOwner('album-1', 'user-1', {
        include: { tracks: true },
      });

      expect(result).toEqual(albumWithInclude);
      expect(mockPrismaClient.album.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'album-1',
          deletedAt: null,
          OR: [
            { access: { some: { userId: 'user-1', role: AccessRole.owner } } },
            {
              artists: { some: { access: { some: { userId: 'user-1', role: AccessRole.owner } } } },
            },
          ],
        },
        include: { tracks: true },
      });
    });
  });

  describe('getByIdForAlbumOwner', () => {
    it('should return album for album owner without include', async () => {
      mockPrismaClient.album.findFirst.mockResolvedValue(mockAlbum);

      const result = await repository.getByIdForAlbumOwner('album-1', 'user-1');

      expect(result).toEqual(mockAlbum);
      expect(mockPrismaClient.album.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'album-1',
          deletedAt: null,
          access: { some: { userId: 'user-1', role: AccessRole.owner } },
        },
      });
    });

    it('should return album for album owner with include', async () => {
      const albumWithInclude = { ...mockAlbum, tracks: [] };
      mockPrismaClient.album.findFirst.mockResolvedValue(albumWithInclude as unknown as Album);

      const result = await repository.getByIdForAlbumOwner('album-1', 'user-1', {
        include: { tracks: true },
      });

      expect(result).toEqual(albumWithInclude);
      expect(mockPrismaClient.album.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'album-1',
          deletedAt: null,
          access: { some: { userId: 'user-1', role: AccessRole.owner } },
        },
        include: { tracks: true },
      });
    });
  });

  describe('getByNameForOwner', () => {
    it('should return album by name for owner', async () => {
      mockPrismaClient.album.findFirst.mockResolvedValue(mockAlbum);

      const result = await repository.getByNameForOwner('Test Album', 'user-1');

      expect(result).toEqual(mockAlbum);
      expect(mockPrismaClient.album.findFirst).toHaveBeenCalledWith({
        where: {
          name: 'Test Album',
          deletedAt: null,
          OR: [
            { access: { some: { userId: 'user-1', role: AccessRole.owner } } },
            {
              artists: { some: { access: { some: { userId: 'user-1', role: AccessRole.owner } } } },
            },
          ],
        },
      });
    });

    it('should return album by name for owner with include', async () => {
      const albumWithInclude = { ...mockAlbum, tracks: [] };
      mockPrismaClient.album.findFirst.mockResolvedValue(albumWithInclude as unknown as Album);

      const result = await repository.getByNameForOwner('Test Album', 'user-1', {
        include: { tracks: true },
      });

      expect(result).toEqual(albumWithInclude);
      expect(mockPrismaClient.album.findFirst).toHaveBeenCalledWith({
        where: {
          name: 'Test Album',
          deletedAt: null,
          OR: [
            { access: { some: { userId: 'user-1', role: AccessRole.owner } } },
            {
              artists: { some: { access: { some: { userId: 'user-1', role: AccessRole.owner } } } },
            },
          ],
        },
        include: { tracks: true },
      });
    });
  });

  describe('getPaginated', () => {
    it('should return paginated albums without filter or orderBy', async () => {
      mockPrismaClient.album.findMany.mockResolvedValue([mockAlbum]);

      const result = await repository.getPaginated(1, 10);

      expect(result).toEqual([mockAlbum]);
      expect(mockPrismaClient.album.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return paginated albums with filter and orderBy', async () => {
      mockPrismaClient.album.findMany.mockResolvedValue([mockAlbum]);
      const filter = { name: 'Test' };
      const orderBy = { name: 'asc' } as Prisma.AlbumOrderByWithRelationInput;

      const result = await repository.getPaginated(2, 5, filter, orderBy);

      expect(result).toEqual([mockAlbum]);
      expect(mockPrismaClient.album.findMany).toHaveBeenCalledWith({
        take: 5,
        skip: 5,
        where: { name: 'Test', deletedAt: null },
        orderBy: { name: 'asc' },
      });
    });

    it('should return paginated albums with deletedAt filter', async () => {
      mockPrismaClient.album.findMany.mockResolvedValue([mockAlbum]);
      const filter = { deletedAt: new Date('2024-01-02') };

      const result = await repository.getPaginated(1, 10, filter);

      expect(result).toEqual([mockAlbum]);
      expect(mockPrismaClient.album.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: new Date('2024-01-02') },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return paginated albums with include', async () => {
      const albumWithInclude = { ...mockAlbum, tracks: [] };
      mockPrismaClient.album.findMany.mockResolvedValue([albumWithInclude] as unknown as Album[]);

      const result = await repository.getPaginated(1, 10, undefined, undefined, {
        include: { tracks: true },
      });

      expect(result).toEqual([albumWithInclude]);
      expect(mockPrismaClient.album.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: { tracks: true },
      });
    });
  });

  describe('exists', () => {
    it('should return true if album exists', async () => {
      mockPrismaClient.album.count.mockResolvedValue(1);

      const result = await repository.exists('album-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.album.count).toHaveBeenCalledWith({
        where: { id: 'album-1', deletedAt: null },
      });
    });

    it('should return false if album does not exist', async () => {
      mockPrismaClient.album.count.mockResolvedValue(0);

      const result = await repository.exists('album-1');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count albums without filter', async () => {
      mockPrismaClient.album.count.mockResolvedValue(5);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(mockPrismaClient.album.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });

    it('should count albums with filter', async () => {
      mockPrismaClient.album.count.mockResolvedValue(3);
      const filter = { name: 'Test' };

      const result = await repository.count(filter);

      expect(result).toBe(3);
      expect(mockPrismaClient.album.count).toHaveBeenCalledWith({
        where: { name: 'Test', deletedAt: null },
      });
    });

    it('should count albums with deletedAt filter', async () => {
      mockPrismaClient.album.count.mockResolvedValue(1);
      const filter = { deletedAt: new Date('2024-01-02') };

      const result = await repository.count(filter);

      expect(result).toBe(1);
      expect(mockPrismaClient.album.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });
  });

  describe('checkAccess', () => {
    it('should return true if public album is accessible by guest', async () => {
      mockPrismaClient.album.findFirst.mockResolvedValue({ id: 'album-1' } as Album);

      const result = await repository.checkAccess('album-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.album.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'album-1',
          deletedAt: null,
          OR: [
            { visibility: Visibility.public },
            { access: { some: { userId: 'GUEST' } } },
            { artists: { some: { access: { some: { userId: 'GUEST' } } } } },
          ],
        },
        select: { id: true },
      });
    });

    it('should return true if album is accessible by user', async () => {
      mockPrismaClient.album.findFirst.mockResolvedValue({ id: 'album-1' } as Album);

      const result = await repository.checkAccess('album-1', 'user-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.album.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'album-1',
          deletedAt: null,
          OR: [
            { visibility: Visibility.public },
            { access: { some: { userId: 'user-1' } } },
            { artists: { some: { access: { some: { userId: 'user-1' } } } } },
          ],
        },
        select: { id: true },
      });
    });

    it('should return false if album is not accessible', async () => {
      mockPrismaClient.album.findFirst.mockResolvedValue(null);

      const result = await repository.checkAccess('album-1', 'user-1');

      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('should create album without include', async () => {
      const createInput = { name: 'New Album' } as Prisma.AlbumCreateInput;
      mockPrismaClient.album.create.mockResolvedValue(mockAlbum);

      const result = await repository.create(createInput);

      expect(result).toEqual(mockAlbum);
      expect(mockPrismaClient.album.create).toHaveBeenCalledWith({
        data: createInput,
      });
    });

    it('should create album with include', async () => {
      const createInput = { name: 'New Album' } as Prisma.AlbumCreateInput;
      const albumWithInclude = { ...mockAlbum, tracks: [] };
      mockPrismaClient.album.create.mockResolvedValue(albumWithInclude as unknown as Album);

      const result = await repository.create(createInput, { include: { tracks: true } });

      expect(result).toEqual(albumWithInclude);
      expect(mockPrismaClient.album.create).toHaveBeenCalledWith({
        data: createInput,
        include: { tracks: true },
      });
    });
  });

  describe('createMany', () => {
    it('should create many albums without include', async () => {
      const createInputs = [
        { name: 'Album 1' },
        { name: 'Album 2' },
      ] as Prisma.AlbumCreateManyInput[];
      mockPrismaClient.album.createManyAndReturn.mockResolvedValue([mockAlbum]);

      const result = await repository.createMany(createInputs);

      expect(result).toEqual([mockAlbum]);
      expect(mockPrismaClient.album.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
      });
    });

    it('should create many albums with include', async () => {
      const createInputs = [
        { name: 'Album 1' },
        { name: 'Album 2' },
      ] as Prisma.AlbumCreateManyInput[];
      const albumsWithInclude = [{ ...mockAlbum, tracks: [] }];
      mockPrismaClient.album.createManyAndReturn.mockResolvedValue(
        albumsWithInclude as unknown as Album[],
      );

      const result = await repository.createMany(createInputs, { include: { tracks: true } });

      expect(result).toEqual(albumsWithInclude);
      expect(mockPrismaClient.album.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
        include: { tracks: true },
      });
    });
  });

  describe('update', () => {
    it('should update album without include', async () => {
      const updateInput = { name: 'Updated Album' } as Prisma.AlbumUpdateInput;
      mockPrismaClient.album.update.mockResolvedValue(mockAlbum);

      const result = await repository.update('album-1', updateInput);

      expect(result).toEqual(mockAlbum);
      expect(mockPrismaClient.album.update).toHaveBeenCalledWith({
        where: { id: 'album-1' },
        data: updateInput,
      });
    });

    it('should update album with include', async () => {
      const updateInput = { name: 'Updated Album' } as Prisma.AlbumUpdateInput;
      const albumWithInclude = { ...mockAlbum, tracks: [] };
      mockPrismaClient.album.update.mockResolvedValue(albumWithInclude as unknown as Album);

      const result = await repository.update('album-1', updateInput, { include: { tracks: true } });

      expect(result).toEqual(albumWithInclude);
      expect(mockPrismaClient.album.update).toHaveBeenCalledWith({
        where: { id: 'album-1' },
        data: updateInput,
        include: { tracks: true },
      });
    });
  });

  describe('updateMany', () => {
    it('should update many albums without include', async () => {
      const updates = [
        { id: 'album-1', data: { name: 'Updated 1' } as Prisma.AlbumUpdateInput },
        { id: 'album-2', data: { name: 'Updated 2' } as Prisma.AlbumUpdateInput },
      ];
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.album.update.mockResolvedValue(mockAlbum);

      const result = await repository.updateMany(updates);

      expect(mockMainClient.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should update many albums with include', async () => {
      const updates = [{ id: 'album-1', data: { name: 'Updated 1' } as Prisma.AlbumUpdateInput }];
      const albumWithInclude = { ...mockAlbum, tracks: [] };
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.album.update.mockResolvedValue(albumWithInclude as unknown as Album);

      const result = await repository.updateMany(updates, { include: { tracks: true } });

      expect(mockMainClient.$transaction).toHaveBeenCalled();
      expect(result).toEqual([albumWithInclude]);
    });
  });

  describe('delete', () => {
    it('should hard delete album', async () => {
      mockPrismaClient.album.delete.mockResolvedValue(mockAlbum);

      const result = await repository.delete('album-1');

      expect(result).toEqual(mockAlbum);
      expect(mockPrismaClient.album.delete).toHaveBeenCalledWith({
        where: { id: 'album-1' },
      });
    });
  });

  describe('softDelete', () => {
    it('should soft delete album', async () => {
      const deletedAlbum = { ...mockAlbum, deletedAt: new Date() };
      mockPrismaClient.album.update.mockResolvedValue(deletedAlbum);

      const result = await repository.softDelete('album-1');

      expect(result).toEqual(deletedAlbum);
      expect(mockPrismaClient.album.update).toHaveBeenCalledWith({
        where: { id: 'album-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('deleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.deleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.album.findMany).not.toHaveBeenCalled();
    });

    it('should hard delete many albums', async () => {
      mockPrismaClient.album.findMany.mockResolvedValue([mockAlbum]);
      mockPrismaClient.album.deleteMany.mockResolvedValue({ count: 1 });

      const result = await repository.deleteMany(['album-1', 'album-2']);

      expect(result).toEqual([mockAlbum]);
      expect(mockPrismaClient.album.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['album-1', 'album-2'] } },
      });
      expect(mockPrismaClient.album.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['album-1', 'album-2'] } },
      });
    });
  });

  describe('softDeleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.softDeleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.album.findMany).not.toHaveBeenCalled();
    });

    it('should soft delete many albums', async () => {
      const albumsToDelete = [
        { ...mockAlbum, id: 'album-1' },
        { ...mockAlbum, id: 'album-2' },
      ];
      mockPrismaClient.album.findMany.mockResolvedValue(albumsToDelete);
      mockPrismaClient.album.updateMany.mockResolvedValue({ count: 2 });

      const result = await repository.softDeleteMany(['album-1', 'album-2']);

      expect(result).toEqual(albumsToDelete);
      expect(mockPrismaClient.album.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['album-1', 'album-2'] }, deletedAt: null },
      });
      expect(mockPrismaClient.album.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['album-1', 'album-2'] }, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('deleteCascade', () => {
    it('should cascade delete album with cover', async () => {
      const mockTx = {
        album: { findUnique: vi.fn(), delete: vi.fn() },
        report: { updateMany: vi.fn() },
        reportTarget: { deleteMany: vi.fn() },
        image: { deleteMany: vi.fn() },
      };
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        return await cb(mockTx as unknown as typeof mockPrismaClient);
      });

      mockTx.album.findUnique.mockResolvedValue({ coverId: 'image-1' });
      mockTx.album.delete.mockResolvedValue(mockAlbum);
      mockTx.report.updateMany.mockResolvedValue({ count: 0 });
      mockTx.reportTarget.deleteMany.mockResolvedValue({ count: 0 });
      mockTx.image.deleteMany.mockResolvedValue({ count: 1 });

      const result = await repository.deleteCascade('album-1');

      expect(result).toEqual(mockAlbum);
      expect(mockTx.report.updateMany).toHaveBeenCalled();
      expect(mockTx.reportTarget.deleteMany).toHaveBeenCalled();
      expect(mockTx.image.deleteMany).toHaveBeenCalledWith({ where: { id: 'image-1' } });
    });

    it('should cascade delete album without cover', async () => {
      const mockTx = {
        album: { findUnique: vi.fn(), delete: vi.fn() },
        report: { updateMany: vi.fn() },
        reportTarget: { deleteMany: vi.fn() },
        image: { deleteMany: vi.fn() },
      };
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        return await cb(mockTx as unknown as typeof mockPrismaClient);
      });

      mockTx.album.findUnique.mockResolvedValue({ coverId: null });
      mockTx.album.delete.mockResolvedValue(mockAlbum);
      mockTx.report.updateMany.mockResolvedValue({ count: 0 });
      mockTx.reportTarget.deleteMany.mockResolvedValue({ count: 0 });

      const result = await repository.deleteCascade('album-1');

      expect(result).toEqual(mockAlbum);
      expect(mockTx.image.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('softDeleteCascade', () => {
    it('should cascade soft delete album with cover', async () => {
      const mockTx = {
        album: { findUnique: vi.fn(), update: vi.fn() },
        reportTarget: { updateMany: vi.fn() },
        libraryAlbum: { updateMany: vi.fn() },
        libraryPin: { updateMany: vi.fn() },
        communityComment: { updateMany: vi.fn() },
        playlistTrack: { updateMany: vi.fn() },
        libraryTrack: { updateMany: vi.fn() },
        libraryFavorite: { updateMany: vi.fn() },
        track: { updateMany: vi.fn() },
        image: { updateMany: vi.fn() },
      };
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        return await cb(mockTx as unknown as typeof mockPrismaClient);
      });

      mockTx.album.findUnique.mockResolvedValue({ coverId: 'image-1', deletedAt: null });
      mockTx.album.update.mockResolvedValue({ ...mockAlbum, deletedAt: new Date() });
      mockTx.reportTarget.updateMany.mockResolvedValue({ count: 0 });
      mockTx.libraryAlbum.updateMany.mockResolvedValue({ count: 0 });
      mockTx.libraryPin.updateMany.mockResolvedValue({ count: 0 });
      mockTx.communityComment.updateMany.mockResolvedValue({ count: 0 });
      mockTx.playlistTrack.updateMany.mockResolvedValue({ count: 0 });
      mockTx.libraryTrack.updateMany.mockResolvedValue({ count: 0 });
      mockTx.libraryFavorite.updateMany.mockResolvedValue({ count: 0 });
      mockTx.track.updateMany.mockResolvedValue({ count: 0 });
      mockTx.image.updateMany.mockResolvedValue({ count: 1 });

      const result = await repository.softDeleteCascade('album-1');

      expect(result).toEqual({ ...mockAlbum, deletedAt: expect.any(Date) });
      expect(mockTx.reportTarget.updateMany).toHaveBeenCalled();
      expect(mockTx.libraryAlbum.updateMany).toHaveBeenCalled();
      expect(mockTx.track.updateMany).toHaveBeenCalled();
      expect(mockTx.image.updateMany).toHaveBeenCalledWith({
        where: { id: 'image-1', deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should cascade soft delete album that is already deleted', async () => {
      const mockTx = {
        album: { findUnique: vi.fn(), update: vi.fn() },
        reportTarget: { updateMany: vi.fn() },
        libraryAlbum: { updateMany: vi.fn() },
        libraryPin: { updateMany: vi.fn() },
        communityComment: { updateMany: vi.fn() },
        playlistTrack: { updateMany: vi.fn() },
        libraryTrack: { updateMany: vi.fn() },
        libraryFavorite: { updateMany: vi.fn() },
        track: { updateMany: vi.fn() },
        image: { updateMany: vi.fn() },
      };
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        return await cb(mockTx as unknown as typeof mockPrismaClient);
      });

      mockTx.album.findUnique.mockResolvedValue({ coverId: 'image-1', deletedAt: new Date() });
      mockTx.album.update.mockResolvedValue({ ...mockAlbum, deletedAt: new Date() });
      mockTx.reportTarget.updateMany.mockResolvedValue({ count: 0 });
      mockTx.libraryAlbum.updateMany.mockResolvedValue({ count: 0 });
      mockTx.libraryPin.updateMany.mockResolvedValue({ count: 0 });
      mockTx.communityComment.updateMany.mockResolvedValue({ count: 0 });
      mockTx.playlistTrack.updateMany.mockResolvedValue({ count: 0 });
      mockTx.libraryTrack.updateMany.mockResolvedValue({ count: 0 });
      mockTx.libraryFavorite.updateMany.mockResolvedValue({ count: 0 });
      mockTx.track.updateMany.mockResolvedValue({ count: 0 });

      await repository.softDeleteCascade('album-1');

      expect(mockTx.image.updateMany).not.toHaveBeenCalled();
    });
  });
});
