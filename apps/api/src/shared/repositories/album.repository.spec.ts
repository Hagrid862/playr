import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Album, PrismaClient } from '@repo/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../services/prisma.service';
import { AlbumRepository } from './album.repository';

describe('AlbumRepository', () => {
  let repository: AlbumRepository;
  let mockTx: DeepMocked<PrismaClient>;

  const mockAlbum: Album = {
    id: 'album-123',
    name: 'Test Album',
    description: null,
    type: 'album',
    releaseDate: new Date(),
    visibility: 'private',
    coverId: null,
    totalTracks: 0,
    totalDuration: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    mockTx = createMock<PrismaClient>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlbumRepository,
        {
          provide: PrismaService,
          useValue: {
            client: mockTx,
            mainClient: mockTx,
          },
        },
      ],
    }).compile();

    repository = module.get<AlbumRepository>(AlbumRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return album with simple include when detailed is false', async () => {
      mockTx.album.findFirst.mockResolvedValue(mockAlbum);
      const result = await repository.findOne({ id: 'album-123' });
      expect(result).toEqual(mockAlbum);
      expect(mockTx.album.findFirst).toHaveBeenCalledWith({
        where: { id: 'album-123', deletedAt: null },
        include: {
          cover: true,
          artists: true,
        },
      });
    });

    it('should return album with detailed include when detailed is true', async () => {
      mockTx.album.findFirst.mockResolvedValue(mockAlbum);
      const result = await repository.findOne({ id: 'album-123' }, true);
      expect(result).toEqual(mockAlbum);
      expect(mockTx.album.findFirst).toHaveBeenCalledWith({
        where: { id: 'album-123', deletedAt: null },
        include: {
          cover: true,
          artists: true,
          tracks: {
            where: { deletedAt: null },
            orderBy: {
              trackNumber: 'asc',
            },
            include: {
              artists: true,
              audioFiles: true,
            },
          },
        },
      });
    });
  });

  describe('findMany', () => {
    it('should return multiple albums matching options', async () => {
      mockTx.album.findMany.mockResolvedValue([mockAlbum]);
      const result = await repository.findMany({ take: 5 });
      expect(result).toEqual([mockAlbum]);
      expect(mockTx.album.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        take: 5,
        skip: undefined,
        include: {
          cover: true,
          artists: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should use provided orderBy', async () => {
      mockTx.album.findMany.mockResolvedValue([mockAlbum]);
      const orderBy = { name: 'asc' as const };
      await repository.findMany({ orderBy });
      expect(mockTx.album.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy }));
    });
  });

  describe('checkAccess', () => {
    it('should return true if album matches access conditions (Public)', async () => {
      mockTx.album.findFirst.mockResolvedValue({ id: 'album-123' } as any);
      const result = await repository.checkAccess('album-123');
      expect(result).toBe(true);
      expect(mockTx.album.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { visibility: 'public' },
              expect.objectContaining({ access: { some: { userId: 'GUEST' } } }),
              expect.objectContaining({
                artists: { some: { access: { some: { userId: 'GUEST' } } } },
              }),
            ]),
          }),
        }),
      );
    });

    it('should return true if album matches access conditions (User)', async () => {
      mockTx.album.findFirst.mockResolvedValue({ id: 'album-123' } as any);
      const result = await repository.checkAccess('album-123', 'user-123');
      expect(result).toBe(true);
      expect(mockTx.album.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { visibility: 'public' },
              expect.objectContaining({ access: { some: { userId: 'user-123' } } }),
            ]),
          }),
        }),
      );
    });

    it('should return false if album does not match access conditions', async () => {
      mockTx.album.findFirst.mockResolvedValue(null);
      const result = await repository.checkAccess('album-123', 'user-123');
      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return true if album exists', async () => {
      mockTx.album.count.mockResolvedValue(1);
      const result = await repository.exists('album-123');
      expect(result).toBe(true);
      expect(mockTx.album.count).toHaveBeenCalledWith({ where: { id: 'album-123' } });
    });

    it('should return false if album does not exist', async () => {
      mockTx.album.count.mockResolvedValue(0);
      const result = await repository.exists('album-123');
      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count albums with deletedAt: null filter', async () => {
      mockTx.album.count.mockResolvedValue(10);
      const result = await repository.count({ type: 'album' });
      expect(result).toBe(10);
      expect(mockTx.album.count).toHaveBeenCalledWith({
        where: {
          type: 'album',
          deletedAt: null,
        },
      });
    });
  });

  describe('create', () => {
    it('should create an album', async () => {
      mockTx.album.create.mockResolvedValue(mockAlbum);
      const data = { name: 'New Album', type: 'album', visibility: 'private' } as any;
      const result = await repository.create(data);
      expect(result).toEqual(mockAlbum);
      expect(mockTx.album.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('createMany', () => {
    it('should create many albums', async () => {
      mockTx.album.createManyAndReturn.mockResolvedValue([mockAlbum]);
      const data = [{ name: 'Album 1' }] as any;
      const result = await repository.createMany(data);
      expect(result).toEqual([mockAlbum]);
      expect(mockTx.album.createManyAndReturn).toHaveBeenCalledWith({ data });
    });
  });

  describe('update', () => {
    it('should update an album', async () => {
      mockTx.album.update.mockResolvedValue(mockAlbum);
      const data = { name: 'Updated' };
      const result = await repository.update('album-123', data);
      expect(result).toEqual(mockAlbum);
      expect(mockTx.album.update).toHaveBeenCalledWith({ where: { id: 'album-123' }, data });
    });
  });

  describe('updateMany', () => {
    it('should update many albums in transaction', async () => {
      (mockTx as any).$transaction = vi.fn().mockImplementation(async (arg) => {
        if (Array.isArray(arg)) return Promise.all(arg);
        return arg;
      });
      mockTx.album.update.mockResolvedValue(mockAlbum);

      const updates = [{ id: 'album-123', data: { name: 'Updated' } }];
      const result = await repository.updateMany(updates);

      expect(result).toEqual([mockAlbum]);
      expect(mockTx.$transaction).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete an album', async () => {
      mockTx.album.delete.mockResolvedValue(mockAlbum);
      const result = await repository.delete('album-123');
      expect(result).toEqual(mockAlbum);
      expect(mockTx.album.delete).toHaveBeenCalledWith({ where: { id: 'album-123' } });
    });
  });

  describe('deleteMany', () => {
    it('should delete many and return them', async () => {
      mockTx.album.findMany.mockResolvedValue([mockAlbum]);
      mockTx.album.deleteMany.mockResolvedValue({ count: 1 });
      const result = await repository.deleteMany({ name: 'Old' });
      expect(result).toEqual([mockAlbum]);
      expect(mockTx.album.findMany).toHaveBeenCalledWith({ where: { name: 'Old' } });
      expect(mockTx.album.deleteMany).toHaveBeenCalledWith({ where: { name: 'Old' } });
    });
  });
});
