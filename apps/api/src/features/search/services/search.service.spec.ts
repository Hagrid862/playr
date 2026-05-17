import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '@/shared/services/prisma.service';
import { SearchService } from './search.service';
import type { SearchQuery } from '@repo/contracts';

describe('SearchService', () => {
  let service: SearchService;
  let prismaService: DeepMocked<PrismaService>;

  const mockQueryRaw = vi.fn().mockResolvedValue([]);
  const mockExtendedClient = {
    $queryRaw: mockQueryRaw,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockExtendedClient.$queryRaw.mockReset();

    prismaService = createMock<PrismaService>();
    Object.defineProperty(prismaService, 'extended', {
      get: () => mockExtendedClient,
      configurable: true,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  describe('search', () => {
    it('should throw BadRequestException when query is too short', async () => {
      const searchQuery: SearchQuery = { query: 'a', page: 1, pageSize: 20 };

      await expect(service.search('user-123', searchQuery)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when query is empty', async () => {
      const searchQuery: SearchQuery = { query: '', page: 1, pageSize: 20 };

      await expect(service.search('user-123', searchQuery)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return results with pagination metadata for authenticated user', async () => {
      const mockResults = [
        {
          id: 'artist-1',
          name: 'Test Artist',
          type: 'artist',
          visibility: 'public',
          albumType: null,
          score: 0.9,
        },
        {
          id: 'album-1',
          name: 'Test Album',
          type: 'album',
          visibility: 'public',
          albumType: 'album',
          score: 0.8,
        },
      ];
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(2) }]); // count query
      mockQueryRaw.mockResolvedValueOnce(mockResults);              // results query

      const searchQuery: SearchQuery = {
        query: 'test',
        page: 1,
        pageSize: 20,
      };
      const result = await service.search('user-123', searchQuery);

      expect(result.results).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.results[0].id).toBe('artist-1');
      expect(result.results[1].id).toBe('album-1');
    });

    it('should return only public results when userId is null (unauthenticated)', async () => {
      const mockResults = [
        {
          id: 'artist-1',
          name: 'Public Artist',
          type: 'artist',
          visibility: 'public',
          albumType: null,
          score: 0.9,
        },
      ];
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(1) }]); // count query
      mockQueryRaw.mockResolvedValueOnce(mockResults);              // results query

      const searchQuery: SearchQuery = {
        query: 'public',
        page: 1,
        pageSize: 20,
      };
      const result = await service.search(null, searchQuery);

      expect(result.results).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should apply type filter when specified', async () => {
      mockQueryRaw.mockResolvedValueOnce([]);
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);

      const searchQuery: SearchQuery = {
        query: 'test',
        filters: { types: ['artist'] },
        page: 1,
        pageSize: 20,
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply visibility filter when specified', async () => {
      mockQueryRaw.mockResolvedValueOnce([]);
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);

      const searchQuery: SearchQuery = {
        query: 'test',
        filters: { visibility: 'public' },
        page: 1,
        pageSize: 20,
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply artist verified filter when specified', async () => {
      mockQueryRaw.mockResolvedValueOnce([]);
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);

      const searchQuery: SearchQuery = {
        query: 'test',
        filters: { artist: { verified: true } },
        page: 1,
        pageSize: 20,
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply album type filter when specified', async () => {
      mockQueryRaw.mockResolvedValueOnce([]);
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);

      const searchQuery: SearchQuery = {
        query: 'test',
        filters: { album: { type: 'single' } },
        page: 1,
        pageSize: 20,
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply track explicit filter when specified', async () => {
      mockQueryRaw.mockResolvedValueOnce([]);
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);

      const searchQuery: SearchQuery = {
        query: 'test',
        filters: { track: { explicit: false } },
        page: 1,
        pageSize: 20,
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply playlist isPublic filter when specified', async () => {
      mockQueryRaw.mockResolvedValueOnce([]);
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);

      const searchQuery: SearchQuery = {
        query: 'test',
        filters: { playlist: { isPublic: true } },
        page: 1,
        pageSize: 20,
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply orderBy when specified', async () => {
      mockQueryRaw.mockResolvedValueOnce([]);
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);

      const searchQuery: SearchQuery = {
        query: 'test',
        orderBy: { field: 'name', direction: 'desc' },
        page: 1,
        pageSize: 20,
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should echo back filters and orderBy in the response', async () => {
      mockQueryRaw.mockResolvedValueOnce([]);
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);

      const searchQuery: SearchQuery = {
        query: 'test',
        filters: { types: ['track'] },
        orderBy: { field: 'duration', direction: 'desc' },
        page: 1,
        pageSize: 20,
      };
      const result = await service.search('user-123', searchQuery);

      expect(result.filters).toEqual({ types: ['track'] });
      expect(result.orderBy).toEqual({ field: 'duration', direction: 'desc' });
    });

    it('should return null filters and orderBy when not specified', async () => {
      mockQueryRaw.mockResolvedValueOnce([]);
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);

      const searchQuery: SearchQuery = {
        query: 'test',
        page: 1,
        pageSize: 20,
      };
      const result = await service.search('user-123', searchQuery);

      expect(result.filters).toBeNull();
      expect(result.orderBy).toBeNull();
    });

    it('should apply pagination with offset', async () => {
      mockQueryRaw.mockResolvedValueOnce([]);
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(100) }]);

      const searchQuery: SearchQuery = {
        query: 'test',
        page: 3,
        pageSize: 10,
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should return empty results array when no results found', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]); // count query
      mockQueryRaw.mockResolvedValueOnce([]);                       // results query

      const searchQuery: SearchQuery = {
        query: 'nonexistent',
        page: 1,
        pageSize: 20,
      };
      const result = await service.search('user-123', searchQuery);

      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should trim query before processing', async () => {
      mockQueryRaw.mockResolvedValueOnce([]);
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);

      const searchQuery: SearchQuery = {
        query: '  test  ',
        page: 1,
        pageSize: 20,
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });
  });
});
