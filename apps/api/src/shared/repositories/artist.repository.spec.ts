import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArtistRepository } from './artist.repository';
import { PrismaService } from '../services/prisma.service';
import { AccessRole, Artist, Prisma, Visibility } from '@repo/db';

describe('ArtistRepository', () => {
  let repository: ArtistRepository;
  let prismaService: PrismaService;
  let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;
  let mockMainClient: ReturnType<typeof createMockPrismaClient>;

  const createMockPrismaClient = () => ({
    artist: {
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
    playlist: {
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
    report: {
      updateMany: vi.fn(),
    },
    reportTarget: {
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
    artistProfile: {
      updateMany: vi.fn(),
    },
    communityProfile: {
      updateMany: vi.fn(),
    },
    album: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
    track: {
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
    libraryArtist: {
      updateMany: vi.fn(),
    },
    libraryPin: {
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
    repository = new ArtistRepository(prismaService);
  });

  const mockArtist: Artist = {
    id: 'artist-1',
    name: 'Test Artist',
    description: null,
    avatarId: null,
    bannerId: null,
    visibility: Visibility.public,
    isCommunity: false,
    verified: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  describe('getById', () => {
    it('should return artist by id without include', async () => {
      mockPrismaClient.artist.findUnique.mockResolvedValue(mockArtist);

      const result = await repository.getById('artist-1');

      expect(result).toEqual(mockArtist);
      expect(mockPrismaClient.artist.findUnique).toHaveBeenCalledWith({
        where: { id: 'artist-1' },
      });
    });

    it('should return artist by id with include', async () => {
      const artistWithInclude = { ...mockArtist, albums: [] };
      mockPrismaClient.artist.findUnique.mockResolvedValue(artistWithInclude as unknown as Artist);

      const result = await repository.getById('artist-1', { include: { albums: true } });

      expect(result).toEqual(artistWithInclude);
      expect(mockPrismaClient.artist.findUnique).toHaveBeenCalledWith({
        where: { id: 'artist-1' },
        include: { albums: true },
      });
    });

    it('should return null if artist not found', async () => {
      mockPrismaClient.artist.findUnique.mockResolvedValue(null);

      const result = await repository.getById('non-existent');

      expect(result).toBeNull();
    });

    it('should return null if artist is soft-deleted', async () => {
      mockPrismaClient.artist.findUnique.mockResolvedValue({
        ...mockArtist,
        deletedAt: new Date('2024-01-02'),
      });

      const result = await repository.getById('artist-1');

      expect(result).toBeNull();
    });
  });

  describe('getByIdForOwner', () => {
    it('should return artist for owner without include', async () => {
      mockPrismaClient.artist.findFirst.mockResolvedValue(mockArtist);

      const result = await repository.getByIdForOwner('artist-1', 'user-1');

      expect(result).toEqual(mockArtist);
      expect(mockPrismaClient.artist.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'artist-1',
          deletedAt: null,
          access: { some: { userId: 'user-1', role: AccessRole.owner } },
        },
      });
    });

    it('should return artist for owner with include', async () => {
      const artistWithInclude = { ...mockArtist, albums: [] };
      mockPrismaClient.artist.findFirst.mockResolvedValue(artistWithInclude as unknown as Artist);

      const result = await repository.getByIdForOwner('artist-1', 'user-1', {
        include: { albums: true },
      });

      expect(result).toEqual(artistWithInclude);
      expect(mockPrismaClient.artist.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'artist-1',
          deletedAt: null,
          access: { some: { userId: 'user-1', role: AccessRole.owner } },
        },
        include: { albums: true },
      });
    });
  });

  describe('getByNameForOwner', () => {
    it('should return artist by name for owner', async () => {
      mockPrismaClient.artist.findFirst.mockResolvedValue(mockArtist);

      const result = await repository.getByNameForOwner('Test Artist', 'user-1');

      expect(result).toEqual(mockArtist);
      expect(mockPrismaClient.artist.findFirst).toHaveBeenCalledWith({
        where: {
          name: 'Test Artist',
          deletedAt: null,
          access: { some: { userId: 'user-1', role: AccessRole.owner } },
        },
      });
    });

    it('should return artist by name for owner with include', async () => {
      const artistWithInclude = { ...mockArtist, albums: [] };
      mockPrismaClient.artist.findFirst.mockResolvedValue(artistWithInclude as unknown as Artist);

      const result = await repository.getByNameForOwner('Test Artist', 'user-1', {
        include: { albums: true },
      });

      expect(result).toEqual(artistWithInclude);
      expect(mockPrismaClient.artist.findFirst).toHaveBeenCalledWith({
        where: {
          name: 'Test Artist',
          deletedAt: null,
          access: { some: { userId: 'user-1', role: AccessRole.owner } },
        },
        include: { albums: true },
      });
    });
  });

  describe('getPaginated', () => {
    it('should return paginated artists without filter or orderBy', async () => {
      mockPrismaClient.artist.findMany.mockResolvedValue([mockArtist]);

      const result = await repository.getPaginated(1, 10);

      expect(result).toEqual([mockArtist]);
      expect(mockPrismaClient.artist.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return paginated artists with filter and orderBy', async () => {
      mockPrismaClient.artist.findMany.mockResolvedValue([mockArtist]);
      const filter = { name: 'Test' };
      const orderBy = { name: 'asc' } as Prisma.ArtistOrderByWithRelationInput;

      const result = await repository.getPaginated(2, 5, filter, orderBy);

      expect(result).toEqual([mockArtist]);
      expect(mockPrismaClient.artist.findMany).toHaveBeenCalledWith({
        take: 5,
        skip: 5,
        where: { name: 'Test', deletedAt: null },
        orderBy: { name: 'asc' },
      });
    });

    it('should return paginated artists with deletedAt filter', async () => {
      mockPrismaClient.artist.findMany.mockResolvedValue([mockArtist]);
      const filter = { deletedAt: new Date('2024-01-02') };

      const result = await repository.getPaginated(1, 10, filter);

      expect(result).toEqual([mockArtist]);
      expect(mockPrismaClient.artist.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: new Date('2024-01-02') },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return paginated artists with include', async () => {
      const artistWithInclude = { ...mockArtist, albums: [] };
      mockPrismaClient.artist.findMany.mockResolvedValue([
        artistWithInclude,
      ] as unknown as Artist[]);

      const result = await repository.getPaginated(1, 10, undefined, undefined, {
        include: { albums: true },
      });

      expect(result).toEqual([artistWithInclude]);
      expect(mockPrismaClient.artist.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: { albums: true },
      });
    });
  });

  describe('exists', () => {
    it('should return true if artist exists', async () => {
      mockPrismaClient.artist.count.mockResolvedValue(1);

      const result = await repository.exists('artist-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.artist.count).toHaveBeenCalledWith({
        where: { id: 'artist-1', deletedAt: null },
      });
    });

    it('should return false if artist does not exist', async () => {
      mockPrismaClient.artist.count.mockResolvedValue(0);

      const result = await repository.exists('artist-1');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count artists without filter', async () => {
      mockPrismaClient.artist.count.mockResolvedValue(5);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(mockPrismaClient.artist.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });

    it('should count artists with filter', async () => {
      mockPrismaClient.artist.count.mockResolvedValue(3);
      const filter = { name: 'Test' };

      const result = await repository.count(filter);

      expect(result).toBe(3);
      expect(mockPrismaClient.artist.count).toHaveBeenCalledWith({
        where: { name: 'Test', deletedAt: null },
      });
    });

    it('should count artists with deletedAt filter', async () => {
      mockPrismaClient.artist.count.mockResolvedValue(1);
      const filter = { deletedAt: new Date('2024-01-02') };

      const result = await repository.count(filter);

      expect(result).toBe(1);
      expect(mockPrismaClient.artist.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });
  });

  describe('checkAccess', () => {
    it('should return true if public artist is accessible by guest', async () => {
      mockPrismaClient.artist.findFirst.mockResolvedValue({ id: 'artist-1' } as Artist);

      const result = await repository.checkAccess('artist-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.artist.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'artist-1',
          deletedAt: null,
          OR: [{ visibility: Visibility.public }, { access: { some: { userId: 'GUEST' } } }],
        },
        select: { id: true },
      });
    });

    it('should return true if artist is accessible by user', async () => {
      mockPrismaClient.artist.findFirst.mockResolvedValue({ id: 'artist-1' } as Artist);

      const result = await repository.checkAccess('artist-1', 'user-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.artist.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'artist-1',
          deletedAt: null,
          OR: [{ visibility: Visibility.public }, { access: { some: { userId: 'user-1' } } }],
        },
        select: { id: true },
      });
    });

    it('should return false if artist is not accessible', async () => {
      mockPrismaClient.artist.findFirst.mockResolvedValue(null);

      const result = await repository.checkAccess('artist-1', 'user-1');

      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('should create artist without include', async () => {
      const createInput = { name: 'New Artist' } as Prisma.ArtistCreateInput;
      mockPrismaClient.artist.create.mockResolvedValue(mockArtist);

      const result = await repository.create(createInput);

      expect(result).toEqual(mockArtist);
      expect(mockPrismaClient.artist.create).toHaveBeenCalledWith({
        data: createInput,
      });
    });

    it('should create artist with include', async () => {
      const createInput = { name: 'New Artist' } as Prisma.ArtistCreateInput;
      const artistWithInclude = { ...mockArtist, albums: [] };
      mockPrismaClient.artist.create.mockResolvedValue(artistWithInclude as unknown as Artist);

      const result = await repository.create(createInput, { include: { albums: true } });

      expect(result).toEqual(artistWithInclude);
      expect(mockPrismaClient.artist.create).toHaveBeenCalledWith({
        data: createInput,
        include: { albums: true },
      });
    });
  });

  describe('createMany', () => {
    it('should create many artists without include', async () => {
      const createInputs = [
        { name: 'Artist 1' },
        { name: 'Artist 2' },
      ] as Prisma.ArtistCreateManyInput[];
      mockPrismaClient.artist.createManyAndReturn.mockResolvedValue([mockArtist]);

      const result = await repository.createMany(createInputs);

      expect(result).toEqual([mockArtist]);
      expect(mockPrismaClient.artist.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
      });
    });

    it('should create many artists with include', async () => {
      const createInputs = [
        { name: 'Artist 1' },
        { name: 'Artist 2' },
      ] as Prisma.ArtistCreateManyInput[];
      const artistsWithInclude = [{ ...mockArtist, albums: [] }];
      mockPrismaClient.artist.createManyAndReturn.mockResolvedValue(
        artistsWithInclude as unknown as Artist[],
      );

      const result = await repository.createMany(createInputs, { include: { albums: true } });

      expect(result).toEqual(artistsWithInclude);
      expect(mockPrismaClient.artist.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
        include: { albums: true },
      });
    });
  });

  describe('update', () => {
    it('should update artist without include', async () => {
      const updateInput = { name: 'Updated Artist' } as Prisma.ArtistUpdateInput;
      mockPrismaClient.artist.update.mockResolvedValue(mockArtist);

      const result = await repository.update('artist-1', updateInput);

      expect(result).toEqual(mockArtist);
      expect(mockPrismaClient.artist.update).toHaveBeenCalledWith({
        where: { id: 'artist-1' },
        data: updateInput,
      });
    });

    it('should update artist with include', async () => {
      const updateInput = { name: 'Updated Artist' } as Prisma.ArtistUpdateInput;
      const artistWithInclude = { ...mockArtist, albums: [] };
      mockPrismaClient.artist.update.mockResolvedValue(artistWithInclude as unknown as Artist);

      const result = await repository.update('artist-1', updateInput, {
        include: { albums: true },
      });

      expect(result).toEqual(artistWithInclude);
      expect(mockPrismaClient.artist.update).toHaveBeenCalledWith({
        where: { id: 'artist-1' },
        data: updateInput,
        include: { albums: true },
      });
    });
  });

  describe('updateMany', () => {
    it('should update many artists without include', async () => {
      const updates = [
        { id: 'artist-1', data: { name: 'Updated 1' } as Prisma.ArtistUpdateInput },
        { id: 'artist-2', data: { name: 'Updated 2' } as Prisma.ArtistUpdateInput },
      ];
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.artist.update.mockResolvedValue(mockArtist);

      const result = await repository.updateMany(updates);

      expect(mockMainClient.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should update many artists with include', async () => {
      const updates = [{ id: 'artist-1', data: { name: 'Updated 1' } as Prisma.ArtistUpdateInput }];
      const artistWithInclude = { ...mockArtist, albums: [] };
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.artist.update.mockResolvedValue(artistWithInclude as unknown as Artist);

      const result = await repository.updateMany(updates, { include: { albums: true } });

      expect(mockMainClient.$transaction).toHaveBeenCalled();
      expect(result).toEqual([artistWithInclude]);
    });
  });

  describe('delete', () => {
    it('should hard delete artist', async () => {
      mockPrismaClient.artist.delete.mockResolvedValue(mockArtist);

      const result = await repository.delete('artist-1');

      expect(result).toEqual(mockArtist);
      expect(mockPrismaClient.artist.delete).toHaveBeenCalledWith({
        where: { id: 'artist-1' },
      });
    });
  });

  describe('softDelete', () => {
    it('should soft delete artist', async () => {
      const deletedArtist = { ...mockArtist, deletedAt: new Date() };
      mockPrismaClient.artist.update.mockResolvedValue(deletedArtist);

      const result = await repository.softDelete('artist-1');

      expect(result).toEqual(deletedArtist);
      expect(mockPrismaClient.artist.update).toHaveBeenCalledWith({
        where: { id: 'artist-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('deleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.deleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.artist.findMany).not.toHaveBeenCalled();
    });

    it('should hard delete many artists', async () => {
      mockPrismaClient.artist.findMany.mockResolvedValue([mockArtist]);
      mockPrismaClient.artist.deleteMany.mockResolvedValue({ count: 1 });

      const result = await repository.deleteMany(['artist-1', 'artist-2']);

      expect(result).toEqual([mockArtist]);
      expect(mockPrismaClient.artist.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['artist-1', 'artist-2'] } },
      });
      expect(mockPrismaClient.artist.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['artist-1', 'artist-2'] } },
      });
    });
  });

  describe('softDeleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.softDeleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.artist.findMany).not.toHaveBeenCalled();
    });

    it('should soft delete many artists', async () => {
      const artistsToDelete = [
        { ...mockArtist, id: 'artist-1' },
        { ...mockArtist, id: 'artist-2' },
      ];
      mockPrismaClient.artist.findMany.mockResolvedValue(artistsToDelete);
      mockPrismaClient.artist.updateMany.mockResolvedValue({ count: 2 });

      const result = await repository.softDeleteMany(['artist-1', 'artist-2']);

      expect(result).toEqual(artistsToDelete);
      expect(mockPrismaClient.artist.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['artist-1', 'artist-2'] }, deletedAt: null },
      });
      expect(mockPrismaClient.artist.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['artist-1', 'artist-2'] }, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('deleteCascade', () => {
    it('should cascade delete artist with albums and tracks', async () => {
      const mockTx = {
        playlist: { deleteMany: vi.fn() },
        report: { updateMany: vi.fn() },
        reportTarget: { deleteMany: vi.fn() },
        artistProfile: { updateMany: vi.fn() },
        communityProfile: { updateMany: vi.fn() },
        album: { findMany: vi.fn(), deleteMany: vi.fn() },
        track: { deleteMany: vi.fn() },
        artist: { delete: vi.fn() },
      };
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        return await cb(mockTx as unknown as typeof mockPrismaClient);
      });

      mockTx.playlist.deleteMany.mockResolvedValue({ count: 0 });
      mockTx.report.updateMany.mockResolvedValue({ count: 0 });
      mockTx.reportTarget.deleteMany.mockResolvedValue({ count: 0 });
      mockTx.artistProfile.updateMany.mockResolvedValue({ count: 0 });
      mockTx.communityProfile.updateMany.mockResolvedValue({ count: 0 });
      mockTx.album.findMany.mockResolvedValue([{ id: 'album-1' }]);
      mockTx.album.deleteMany.mockResolvedValue({ count: 1 });
      mockTx.track.deleteMany.mockResolvedValue({ count: 0 });
      mockTx.artist.delete.mockResolvedValue(mockArtist);

      const result = await repository.deleteCascade('artist-1');

      expect(result).toEqual(mockArtist);
      expect(mockTx.playlist.deleteMany).toHaveBeenCalledWith({ where: { artistId: 'artist-1' } });
      expect(mockTx.album.findMany).toHaveBeenCalledWith({
        where: { artists: { some: { id: 'artist-1' } } },
        select: { id: true },
      });
      expect(mockTx.album.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['album-1'] } } });
      expect(mockTx.track.deleteMany).toHaveBeenCalledWith({
        where: { artists: { some: { id: 'artist-1' } } },
      });
    });

    it('should cascade delete artist without albums', async () => {
      const mockTx = {
        playlist: { deleteMany: vi.fn() },
        report: { updateMany: vi.fn() },
        reportTarget: { deleteMany: vi.fn() },
        artistProfile: { updateMany: vi.fn() },
        communityProfile: { updateMany: vi.fn() },
        album: { findMany: vi.fn(), deleteMany: vi.fn() },
        track: { deleteMany: vi.fn() },
        artist: { delete: vi.fn() },
      };
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        return await cb(mockTx as unknown as typeof mockPrismaClient);
      });

      mockTx.playlist.deleteMany.mockResolvedValue({ count: 0 });
      mockTx.report.updateMany.mockResolvedValue({ count: 0 });
      mockTx.reportTarget.deleteMany.mockResolvedValue({ count: 0 });
      mockTx.artistProfile.updateMany.mockResolvedValue({ count: 0 });
      mockTx.communityProfile.updateMany.mockResolvedValue({ count: 0 });
      mockTx.album.findMany.mockResolvedValue([]);
      mockTx.track.deleteMany.mockResolvedValue({ count: 0 });
      mockTx.artist.delete.mockResolvedValue(mockArtist);

      const result = await repository.deleteCascade('artist-1');

      expect(result).toEqual(mockArtist);
      expect(mockTx.album.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('softDeleteCascade', () => {
    it('should cascade soft delete artist with albums', async () => {
      const mockTx = {
        playlist: { updateMany: vi.fn() },
        reportTarget: { updateMany: vi.fn() },
        libraryArtist: { updateMany: vi.fn() },
        libraryPin: { updateMany: vi.fn() },
        artistProfile: { updateMany: vi.fn() },
        communityProfile: { updateMany: vi.fn() },
        album: { findMany: vi.fn(), updateMany: vi.fn() },
        track: { updateMany: vi.fn() },
        artist: { update: vi.fn() },
      };
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        return await cb(mockTx as unknown as typeof mockPrismaClient);
      });

      mockTx.playlist.updateMany.mockResolvedValue({ count: 0 });
      mockTx.reportTarget.updateMany.mockResolvedValue({ count: 0 });
      mockTx.libraryArtist.updateMany.mockResolvedValue({ count: 0 });
      mockTx.libraryPin.updateMany.mockResolvedValue({ count: 0 });
      mockTx.artistProfile.updateMany.mockResolvedValue({ count: 0 });
      mockTx.communityProfile.updateMany.mockResolvedValue({ count: 0 });
      mockTx.album.findMany.mockResolvedValue([{ id: 'album-1' }]);
      mockTx.album.updateMany.mockResolvedValue({ count: 1 });
      mockTx.track.updateMany.mockResolvedValue({ count: 0 });
      mockTx.artist.update.mockResolvedValue({ ...mockArtist, deletedAt: new Date() });

      const result = await repository.softDeleteCascade('artist-1');

      expect(result).toEqual({ ...mockArtist, deletedAt: expect.any(Date) });
      expect(mockTx.playlist.updateMany).toHaveBeenCalledWith({
        where: { artistId: 'artist-1', deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mockTx.libraryArtist.updateMany).toHaveBeenCalled();
      expect(mockTx.artistProfile.updateMany).toHaveBeenCalledWith({
        where: { artistId: 'artist-1' },
        data: { artistId: null },
      });
    });

    it('should cascade soft delete artist without albums', async () => {
      const mockTx = {
        playlist: { updateMany: vi.fn() },
        reportTarget: { updateMany: vi.fn() },
        libraryArtist: { updateMany: vi.fn() },
        libraryPin: { updateMany: vi.fn() },
        artistProfile: { updateMany: vi.fn() },
        communityProfile: { updateMany: vi.fn() },
        album: { findMany: vi.fn(), updateMany: vi.fn() },
        track: { updateMany: vi.fn() },
        artist: { update: vi.fn() },
      };
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        return await cb(mockTx as unknown as typeof mockPrismaClient);
      });

      mockTx.playlist.updateMany.mockResolvedValue({ count: 0 });
      mockTx.reportTarget.updateMany.mockResolvedValue({ count: 0 });
      mockTx.libraryArtist.updateMany.mockResolvedValue({ count: 0 });
      mockTx.libraryPin.updateMany.mockResolvedValue({ count: 0 });
      mockTx.artistProfile.updateMany.mockResolvedValue({ count: 0 });
      mockTx.communityProfile.updateMany.mockResolvedValue({ count: 0 });
      mockTx.album.findMany.mockResolvedValue([]);
      mockTx.track.updateMany.mockResolvedValue({ count: 0 });
      mockTx.artist.update.mockResolvedValue({ ...mockArtist, deletedAt: new Date() });

      const result = await repository.softDeleteCascade('artist-1');

      expect(result.deletedAt).not.toBeNull();
      expect(mockTx.album.updateMany).not.toHaveBeenCalled();
    });
  });
});
