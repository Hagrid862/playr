import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { LibraryAlbum, PrismaClient } from '@repo/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../services/prisma.service';
import { LibraryAlbumRepository } from './library-album.repository';

describe('LibraryAlbumRepository', () => {
  let repository: LibraryAlbumRepository;
  let mockTx: DeepMocked<PrismaClient>;

  const mockLibraryAlbum: LibraryAlbum = {
    id: 'lib-album-123',
    libraryId: 'user-123',
    albumId: 'album-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as any;

  beforeEach(async () => {
    mockTx = createMock<PrismaClient>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibraryAlbumRepository,
        {
          provide: PrismaService,
          useValue: {
            client: mockTx,
            mainClient: mockTx,
          },
        },
      ],
    }).compile();

    repository = module.get<LibraryAlbumRepository>(LibraryAlbumRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return library album and destructure album search', async () => {
      mockTx.libraryAlbum.findFirst.mockResolvedValue(mockLibraryAlbum);
      const result = await repository.findOne({
        libraryId: 'user-123',
        album: { name: 'Test' } as any,
      });

      expect(result).toEqual(mockLibraryAlbum);
      expect(mockTx.libraryAlbum.findFirst).toHaveBeenCalledWith({
        where: {
          libraryId: 'user-123',
          album: {
            name: 'Test',
            deletedAt: null,
          },
        },
        include: {
          album: {
            include: {
              cover: true,
              artists: true,
            },
          },
        },
      });
    });
  });

  describe('findMany', () => {
    it('should return many library albums with correct filtering', async () => {
      mockTx.libraryAlbum.findMany.mockResolvedValue([mockLibraryAlbum]);
      const result = await repository.findMany({
        where: { libraryId: 'user-123' },
        take: 10,
      });

      expect(result).toEqual([mockLibraryAlbum]);
      expect(mockTx.libraryAlbum.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: undefined,
        where: {
          libraryId: 'user-123',
          album: {
            deletedAt: null,
          },
        },
        include: {
          album: {
            include: {
              cover: true,
              artists: true,
            },
          },
        },
        orderBy: undefined,
      });
    });

    it('should handle undefined where in findMany', async () => {
      mockTx.libraryAlbum.findMany.mockResolvedValue([]);
      await repository.findMany({});
      expect(mockTx.libraryAlbum.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            album: {
              deletedAt: null,
            },
          },
        }),
      );
    });
  });

  describe('exists', () => {
    it('should return true if library album exists', async () => {
      mockTx.libraryAlbum.count.mockResolvedValue(1);
      const result = await repository.exists({ id: 'lib-123' });
      expect(result).toBe(true);
      expect(mockTx.libraryAlbum.count).toHaveBeenCalledWith({ where: { id: 'lib-123' } });
    });
  });

  describe('count', () => {
    it('should count library albums', async () => {
      mockTx.libraryAlbum.count.mockResolvedValue(5);
      const result = await repository.count({ libraryId: 'user-123' });
      expect(result).toBe(5);
      expect(mockTx.libraryAlbum.count).toHaveBeenCalledWith({
        where: {
          libraryId: 'user-123',
          album: {
            deletedAt: null,
          },
        },
      });
    });

    it('should handle undefined where in count', async () => {
      mockTx.libraryAlbum.count.mockResolvedValue(0);
      await repository.count();
      expect(mockTx.libraryAlbum.count).toHaveBeenCalledWith({
        where: {
          album: {
            deletedAt: null,
          },
        },
      });
    });
  });

  describe('create', () => {
    it('should create library album', async () => {
      mockTx.libraryAlbum.create.mockResolvedValue(mockLibraryAlbum);
      const data = { userId: 'u1', albumId: 'a1' } as any;
      const result = await repository.create(data);
      expect(result).toEqual(mockLibraryAlbum);
      expect(mockTx.libraryAlbum.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('update', () => {
    it('should update library album', async () => {
      mockTx.libraryAlbum.update.mockResolvedValue(mockLibraryAlbum);
      const result = await repository.update('lib-123', { createdAt: new Date() });
      expect(result).toEqual(mockLibraryAlbum);
      expect(mockTx.libraryAlbum.update).toHaveBeenCalledWith({
        where: { id: 'lib-123' },
        data: expect.any(Object),
      });
    });
  });

  describe('delete', () => {
    it('should delete library album', async () => {
      mockTx.libraryAlbum.delete.mockResolvedValue(mockLibraryAlbum);
      const result = await repository.delete('lib-123');
      expect(result).toEqual(mockLibraryAlbum);
      expect(mockTx.libraryAlbum.delete).toHaveBeenCalledWith({ where: { id: 'lib-123' } });
    });
  });

  describe('deleteMany', () => {
    it('should delete many library albums', async () => {
      mockTx.libraryAlbum.deleteMany.mockResolvedValue({ count: 1 });
      await repository.deleteMany({ libraryId: 'user-123' });
      expect(mockTx.libraryAlbum.deleteMany).toHaveBeenCalledWith({
        where: { libraryId: 'user-123' },
      });
    });
  });
});
