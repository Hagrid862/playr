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
          },
        },
      ],
    }).compile();

    repository = module.get<ArtistRepository>(ArtistRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getPaginated', () => {
    it('should return paginated artists with deletedAt: null filter', async () => {
      mockTx.artist.findMany.mockResolvedValue([mockArtist]);

      const result = await repository.getPaginated(1, 10);

      expect(result).toEqual([mockArtist]);
      expect(mockTx.artist.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: {
          deletedAt: null,
        },
        orderBy: undefined,
      });
    });

    it('should merge provided filter with deletedAt: null', async () => {
      mockTx.artist.findMany.mockResolvedValue([]);
      const customFilter = { name: { contains: 'Test' } };

      await repository.getPaginated(1, 10, customFilter);

      expect(mockTx.artist.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: {
          name: { contains: 'Test' },
          deletedAt: null,
        },
        orderBy: undefined,
      });
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
});
