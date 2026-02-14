import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Artist, PrismaClient } from '@repo/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../services/prisma.service';
import { ArtistRepository } from './artist.repository';

describe('ArtistRepository', () => {
  let repository: ArtistRepository;
  let mockTx: DeepMocked<PrismaClient>;

  const mockArtist: Artist = {
    id: 'artist-123',
    name: 'Test Artist',
    description: null,
    isCommunity: false,
    verified: false,
    bannerId: null,
    avatarId: null,
    visibility: 'private',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    mockTx = createMock<PrismaClient>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArtistRepository,
        {
          provide: PrismaService,
          useValue: {
            client: mockTx,
            mainClient: mockTx,
          },
        },
      ],
    }).compile();

    repository = module.get<ArtistRepository>(ArtistRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return artist matching where clause', async () => {
      mockTx.artist.findFirst.mockResolvedValue(mockArtist);
      const result = await repository.findOne({ id: 'artist-123' });
      expect(result).toEqual(mockArtist);
      expect(mockTx.artist.findFirst).toHaveBeenCalledWith({
        where: { id: 'artist-123', deletedAt: null },
        include: { avatar: true, banner: true },
      });
    });
  });

  describe('findMany', () => {
    it('should return multiple artists matching options', async () => {
      mockTx.artist.findMany.mockResolvedValue([mockArtist]);
      const result = await repository.findMany({ take: 5 });
      expect(result).toEqual([mockArtist]);
      expect(mockTx.artist.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        take: 5,
        skip: undefined,
        include: { avatar: true, banner: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('checkAccess', () => {
    it('should return true if artist is public', async () => {
      mockTx.artist.findFirst.mockResolvedValue({ id: 'artist-123' } as any);
      const result = await repository.checkAccess('artist-123');
      expect(result).toBe(true);
    });

    it('should return true if user has access', async () => {
      mockTx.artist.findFirst.mockResolvedValue({ id: 'artist-123' } as any);
      const result = await repository.checkAccess('artist-123', 'user-123');
      expect(result).toBe(true);
    });

    it('should return false if no access', async () => {
      mockTx.artist.findFirst.mockResolvedValue(null);
      const result = await repository.checkAccess('artist-123', 'user-123');
      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count artists with deletedAt: null filter', async () => {
      mockTx.artist.count.mockResolvedValue(5);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(mockTx.artist.count).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
        },
      });
    });
  });

  describe('exists', () => {
    it('should return true if artist exists', async () => {
      mockTx.artist.count.mockResolvedValue(1);
      const result = await repository.exists('artist-123');
      expect(result).toBe(true);
      expect(mockTx.artist.count).toHaveBeenCalledWith({ where: { id: 'artist-123' } });
    });

    it('should return false if artist does not exist', async () => {
      mockTx.artist.count.mockResolvedValue(0);
      const result = await repository.exists('artist-123');
      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('should create an artist', async () => {
      mockTx.artist.create.mockResolvedValue(mockArtist);
      const data = { name: 'New Artist', visibility: 'private' } as any;
      const result = await repository.create(data);
      expect(result).toEqual(mockArtist);
      expect(mockTx.artist.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('createMany', () => {
    it('should create many artists', async () => {
      mockTx.artist.createManyAndReturn.mockResolvedValue([mockArtist]);
      const data = [{ name: 'Artist 1', visibility: 'private' }] as any;
      const result = await repository.createMany(data);
      expect(result).toEqual([mockArtist]);
      expect(mockTx.artist.createManyAndReturn).toHaveBeenCalledWith({ data });
    });
  });

  describe('update', () => {
    it('should update an artist', async () => {
      mockTx.artist.update.mockResolvedValue(mockArtist);
      const data = { name: 'Updated Artist' };
      const result = await repository.update('artist-123', data);
      expect(result).toEqual(mockArtist);
      expect(mockTx.artist.update).toHaveBeenCalledWith({ where: { id: 'artist-123' }, data });
    });
  });

  describe('updateMany', () => {
    it('should update many artists in transaction', async () => {
      // Mock $transaction properly using mockImplementation
      (mockTx as any).$transaction = vi.fn().mockImplementation(async (arg) => {
        if (Array.isArray(arg)) {
          return Promise.all(arg);
        }
        return arg;
      });

      mockTx.artist.update.mockResolvedValue(mockArtist);

      const updates = [{ id: 'artist-123', data: { name: 'Updated' } }];
      const result = await repository.updateMany(updates);

      expect(result).toEqual([mockArtist]);
      expect(mockTx.$transaction).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete an artist', async () => {
      mockTx.artist.delete.mockResolvedValue(mockArtist);
      const result = await repository.delete('artist-123');
      expect(result).toEqual(mockArtist);
      expect(mockTx.artist.delete).toHaveBeenCalledWith({ where: { id: 'artist-123' } });
    });
  });

  describe('deleteMany', () => {
    it('should delete many artists and return them', async () => {
      mockTx.artist.findMany.mockResolvedValue([mockArtist]);
      mockTx.artist.deleteMany.mockResolvedValue({ count: 1 });

      const filter = { name: 'Old' };
      const result = await repository.deleteMany(filter);

      expect(result).toEqual([mockArtist]);
      expect(mockTx.artist.findMany).toHaveBeenCalledWith({ where: filter });
      expect(mockTx.artist.deleteMany).toHaveBeenCalledWith({ where: filter });
    });
  });
});
