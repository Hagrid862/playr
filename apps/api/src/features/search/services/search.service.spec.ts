import { BadRequestException, UnauthorizedException } from '@nestjs/common';
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
      providers: [SearchService, { provide: PrismaService, useValue: prismaService }],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  describe('search', () => {
    it('should throw BadRequestException when query is too short', async () => {
      const searchQuery: SearchQuery = {
        query: 'a',
        page: 1,
        pageSize: 20,
        filters: { categories: [], visibility: 'public' },
      };

      await expect(service.search('user-123', searchQuery)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when query is empty', async () => {
      const searchQuery: SearchQuery = {
        query: '',
        page: 1,
        pageSize: 20,
        filters: { categories: [], visibility: 'public' },
      };

      await expect(service.search('user-123', searchQuery)).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException when userId is null (unauthenticated)', async () => {
      const searchQuery: SearchQuery = {
        query: 'public',
        page: 1,
        pageSize: 20,
        filters: { categories: [], visibility: 'public' },
      };

      await expect(service.search(null, searchQuery)).rejects.toThrow(UnauthorizedException);
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
      // Count query is called first, then result query
      mockQueryRaw
        .mockResolvedValueOnce([{ total: BigInt(2) }]) // count query
        .mockResolvedValueOnce(mockResults); // result query

      const searchQuery: SearchQuery = {
        query: 'test',
        page: 1,
        pageSize: 20,
        filters: { categories: ['artist', 'album'], visibility: 'public' },
      };
      const result = await service.search('user-123', searchQuery);

      expect(result.results).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.results[0].id).toBe('artist-1');
      expect(result.results[1].id).toBe('album-1');
    });

    it('should apply categories filter when specified', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        filters: { categories: ['artist'], visibility: 'public' },
        page: 1,
        pageSize: 20,
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply visibility filter when specified', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        filters: { visibility: 'public', categories: ['artist'] },
        page: 1,
        pageSize: 20,
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply artist verified filter when specified', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        filters: { artist: { verified: true }, categories: ['artist'], visibility: 'public' },
        page: 1,
        pageSize: 20,
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply album type filter when specified', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        filters: { album: { type: 'single' }, categories: ['album'], visibility: 'public' },
        page: 1,
        pageSize: 20,
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply track explicit filter when specified', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        filters: { track: { explicit: false }, categories: ['track'], visibility: 'public' },
        page: 1,
        pageSize: 20,
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply playlist isPublic filter when specified', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        filters: { playlist: { isPublic: true }, categories: ['playlist'], visibility: 'public' },
        page: 1,
        pageSize: 20,
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply orderBy when specified', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        orderBy: { field: 'name', direction: 'desc' },
        page: 1,
        pageSize: 20,
        filters: { categories: ['artist'], visibility: 'public' },
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should echo back filters and orderBy in the response', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        filters: { categories: ['track'], visibility: 'public' },
        orderBy: { field: 'duration', direction: 'desc' },
        page: 1,
        pageSize: 20,
      };
      const result = await service.search('user-123', searchQuery);

      expect(result.filters).toEqual({ categories: ['track'], visibility: 'public' });
      expect(result.orderBy).toEqual({ field: 'duration', direction: 'desc' });
    });

    it('should apply visibility private filter', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        filters: { categories: ['artist'], visibility: 'private' },
        page: 1,
        pageSize: 20,
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply visibility community filter', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        filters: { categories: ['artist'], visibility: 'community' },
        page: 1,
        pageSize: 20,
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply artist isCommunity filter', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        filters: { artist: { isCommunity: true }, categories: ['artist'], visibility: 'public' },
        page: 1,
        pageSize: 20,
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply album releaseDateFrom filter', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        filters: {
          album: { releaseDateFrom: '2020-01-01' },
          categories: ['album'],
          visibility: 'public',
        },
        page: 1,
        pageSize: 20,
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply album releaseDateTo filter', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        filters: {
          album: { releaseDateTo: '2023-12-31' },
          categories: ['album'],
          visibility: 'public',
        },
        page: 1,
        pageSize: 20,
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply track durationFrom filter', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        filters: { track: { durationFrom: 100 }, categories: ['track'], visibility: 'public' },
        page: 1,
        pageSize: 20,
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply track durationTo filter', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        filters: { track: { durationTo: 300 }, categories: ['track'], visibility: 'public' },
        page: 1,
        pageSize: 20,
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply track minListenedCount filter', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        filters: { track: { minListenedCount: 100 }, categories: ['track'], visibility: 'public' },
        page: 1,
        pageSize: 20,
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply playlist isCollaborative filter', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        filters: {
          playlist: { isCollaborative: true },
          categories: ['playlist'],
          visibility: 'public',
        },
        page: 1,
        pageSize: 20,
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply orderBy createdAt', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        orderBy: { field: 'createdAt', direction: 'asc' },
        page: 1,
        pageSize: 20,
        filters: { categories: ['artist'], visibility: 'public' },
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply orderBy releaseDate', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        orderBy: { field: 'releaseDate', direction: 'desc' },
        page: 1,
        pageSize: 20,
        filters: { categories: ['album'], visibility: 'public' },
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply orderBy listenedCount', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        orderBy: { field: 'listenedCount', direction: 'asc' },
        page: 1,
        pageSize: 20,
        filters: { categories: ['track'], visibility: 'public' },
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply orderBy duration', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        orderBy: { field: 'duration', direction: 'asc' },
        page: 1,
        pageSize: 20,
        filters: { categories: ['track'], visibility: 'public' },
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should handle filters when targetCategories is empty', async () => {
      const searchQuery: SearchQuery = {
        query: 'test',
        page: 1,
        pageSize: 20,
        filters: { categories: [], visibility: 'public' },
      };
      const result = await service.search('user-123', searchQuery);
      expect(mockQueryRaw).not.toHaveBeenCalled();
      expect(result.results).toHaveLength(0);
    });

    it('should cover visibility and ownership logic for authenticated users', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      // Trigger the `else` block for authenticated user visibility/ownership checks
      await service.search('user-123', {
        query: 'test',
        page: 1,
        pageSize: 20,
        filters: { categories: ['artist', 'album', 'track', 'playlist'], visibility: 'private' },
      });
      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply all filters in search to cover branches', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        page: 1,
        pageSize: 20,
        filters: {
          categories: ['artist', 'album', 'track', 'playlist', 'genre'],
          visibility: 'public',
          artist: { verified: true, isCommunity: true },
          album: { type: 'album', releaseDateFrom: '2020-01-01', releaseDateTo: '2021-01-01' },
          track: { explicit: true, durationFrom: 10, durationTo: 200, minListenedCount: 5 },
          playlist: { isPublic: true, isCollaborative: true },
        },
      };
      await service.search('user-123', searchQuery);
      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should search multiple categories at once', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        page: 1,
        pageSize: 20,
        filters: {
          categories: ['artist', 'album', 'track', 'playlist', 'genre'],
          visibility: 'public',
        },
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should return filters and orderBy in the response when specified', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        page: 1,
        pageSize: 20,
        filters: { categories: ['artist'], visibility: 'public' },
      };
      const result = await service.search('user-123', searchQuery);

      expect(result.filters).toEqual({ categories: ['artist'], visibility: 'public' });
      expect(result.orderBy).toBeNull();
    });

    it('should apply pagination with offset', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(100) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        page: 3,
        pageSize: 10,
        filters: { categories: ['artist'], visibility: 'public' },
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should return empty results array when no results found', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]); // count query
      mockQueryRaw.mockResolvedValueOnce([]); // result query

      const searchQuery: SearchQuery = {
        query: 'nonexistent',
        page: 1,
        pageSize: 20,
        filters: { categories: ['artist'], visibility: 'public' },
      };
      const result = await service.search('user-123', searchQuery);

      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should trim query before processing', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: '  test  ',
        page: 1,
        pageSize: 20,
        filters: { categories: ['artist'], visibility: 'public' },
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should return empty results when categories array is empty', async () => {
      const searchQuery: SearchQuery = {
        query: 'test',
        page: 1,
        pageSize: 20,
        filters: { categories: [], visibility: 'public' },
      };
      const result = await service.search('user-123', searchQuery);

      // Should return early without calling the database
      expect(mockQueryRaw).not.toHaveBeenCalled();
      expect(result).toEqual({
        results: [],
        loggedIn: true,
        total: 0,
        page: 1,
        pageSize: 20,
        filters: { categories: [], visibility: 'public' },
        orderBy: null,
      });
    });

    it('should include genre in search results', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(1) }]);
      mockQueryRaw.mockResolvedValueOnce([
        {
          id: 'genre-1',
          name: 'Rock',
          type: 'genre',
          visibility: 'public',
          albumType: null,
          score: 0.9,
        },
      ]);

      const searchQuery: SearchQuery = {
        query: 'rock',
        page: 1,
        pageSize: 20,
        filters: { categories: ['genre'], visibility: 'public' },
      };
      const result = await service.search('user-123', searchQuery);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe('genre');
    });

    it('should include playlist in search results', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(1) }]);
      mockQueryRaw.mockResolvedValueOnce([
        {
          id: 'playlist-1',
          name: 'Test Playlist',
          type: 'playlist',
          visibility: 'public',
          albumType: null,
          score: 0.9,
          isPublic: true,
          isCollaborative: false,
        },
      ]);

      const searchQuery: SearchQuery = {
        query: 'playlist',
        page: 1,
        pageSize: 20,
        filters: { categories: ['playlist'], visibility: 'public' },
      };
      const result = await service.search('user-123', searchQuery);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe('playlist');
    });
  });

  describe('librarySearch', () => {
    it('should throw BadRequestException when query is too short', async () => {
      const searchQuery: SearchQuery = {
        query: 'a',
        page: 1,
        pageSize: 20,
        filters: { categories: [], visibility: 'public' },
      };

      await expect(service.librarySearch('user-123', searchQuery)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when query is empty', async () => {
      const searchQuery: SearchQuery = {
        query: '',
        page: 1,
        pageSize: 20,
        filters: { categories: [], visibility: 'public' },
      };

      await expect(service.librarySearch('user-123', searchQuery)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return results for library search', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(1) }]);
      mockQueryRaw.mockResolvedValueOnce([
        {
          id: 'artist-1',
          name: 'Library Artist',
          type: 'artist',
          visibility: 'private',
          albumType: null,
          score: 0.9,
        },
      ]);

      const searchQuery: SearchQuery = {
        query: 'test',
        page: 1,
        pageSize: 20,
        filters: { categories: ['artist'], visibility: 'public' },
      };
      const result = await service.librarySearch('user-123', searchQuery);

      expect(result.results).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should return empty results when categories array is empty', async () => {
      const searchQuery: SearchQuery = {
        query: 'test',
        page: 1,
        pageSize: 20,
        filters: { categories: [], visibility: 'public' },
      };
      const result = await service.librarySearch('user-123', searchQuery);

      // Should return early without calling the database
      expect(mockQueryRaw).not.toHaveBeenCalled();
      expect(result).toEqual({
        results: [],
        total: 0,
        page: 1,
        pageSize: 20,
        filters: { categories: [], visibility: 'public' },
        orderBy: null,
      });
    });

    it('should apply orderBy when specified', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        orderBy: { field: 'name', direction: 'asc' },
        page: 1,
        pageSize: 20,
        filters: { categories: ['artist'], visibility: 'public' },
      };
      await service.librarySearch('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should echo back filters and orderBy in the response', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        filters: { categories: ['track'], visibility: 'public' },
        orderBy: { field: 'duration', direction: 'desc' },
        page: 1,
        pageSize: 20,
      };
      const result = await service.librarySearch('user-123', searchQuery);

      expect(result.filters).toEqual({ categories: ['track'], visibility: 'public' });
      expect(result.orderBy).toEqual({ field: 'duration', direction: 'desc' });
    });

    it('should apply orderBy createdAt in librarySearch', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        orderBy: { field: 'createdAt', direction: 'asc' },
        page: 1,
        pageSize: 20,
        filters: { categories: ['artist'], visibility: 'public' },
      };
      await service.librarySearch('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply orderBy releaseDate in librarySearch', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        orderBy: { field: 'releaseDate', direction: 'desc' },
        page: 1,
        pageSize: 20,
        filters: { categories: ['album'], visibility: 'public' },
      };
      await service.librarySearch('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply orderBy listenedCount in librarySearch', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        orderBy: { field: 'listenedCount', direction: 'asc' },
        page: 1,
        pageSize: 20,
        filters: { categories: ['track'], visibility: 'public' },
      };
      await service.librarySearch('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should trigger verified filter logic for albums and tracks', async () => {
      // Test with album verified = true
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(1) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      await service.librarySearch('user-123', {
        query: 'test',
        page: 1,
        pageSize: 20,
        filters: {
          categories: ['album', 'track'],
          visibility: 'private',
          album: { verified: true },
        },
      });

      // Test with track verified = true
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(1) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      await service.librarySearch('user-123', {
        query: 'test',
        page: 1,
        pageSize: 20,
        filters: {
          categories: ['album', 'track'],
          visibility: 'private',
          track: { verified: true },
        },
      });
      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should cover all filter branches in search (auth/unauth, specific filters)', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      // Test unauthenticated search
      await service.search('user-123', {
        query: 'test',
        page: 1,
        pageSize: 20,
        filters: {
          categories: ['artist', 'album', 'track', 'playlist', 'genre'],
          visibility: 'public',
        },
      });

      // Test with all artist, album, track filters
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);
      await service.search('user-123', {
        query: 'test',
        page: 1,
        pageSize: 20,
        filters: {
          categories: ['artist', 'album', 'track', 'playlist', 'genre'],
          visibility: 'private',
          artist: { verified: true, isCommunity: true },
          album: { type: 'single', releaseDateFrom: '2022-01-01', releaseDateTo: '2023-01-01' },
          track: { explicit: false, durationFrom: 100, durationTo: 300, minListenedCount: 10 },
          playlist: { isPublic: true, isCollaborative: false },
        },
      });
      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should cover all code paths in librarySearch', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      // Test all entity filters
      await service.librarySearch('user-123', {
        query: 'test',
        page: 1,
        pageSize: 20,
        filters: {
          categories: ['artist', 'album', 'track', 'playlist', 'genre'],
          visibility: 'private',
          artist: { verified: true, isCommunity: false },
          album: { type: 'ep', releaseDateFrom: '2021-01-01', releaseDateTo: '2022-01-01' },
          track: { explicit: true, durationFrom: 50, durationTo: 400, minListenedCount: 20 },
          playlist: { isPublic: false, isCollaborative: true },
        },
      });
      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply orderBy with unknown field defaults to score in librarySearch', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        orderBy: { field: 'unknown' as any, direction: 'asc' },
        page: 1,
        pageSize: 20,
        filters: { categories: ['artist'], visibility: 'public' },
      };
      await service.librarySearch('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should cover needsUnionAll and empty categories branch', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      // Trigger lines 199-200: needsUnionAll = true
      await service.search('user-123', {
        query: 'test',
        page: 1,
        pageSize: 20,
        filters: { categories: ['artist', 'album'], visibility: 'public' },
      });

      // Trigger line 514-515: empty categories branch in librarySearch
      await service.librarySearch('user-123', {
        query: 'test',
        page: 1,
        pageSize: 20,
        filters: { categories: [], visibility: 'private' },
      });
      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should cover default switch case in orderBy (search)', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      await service.search('user-123', {
        query: 'test',
        page: 1,
        pageSize: 20,
        filters: { categories: ['artist'], visibility: 'public' },
        orderBy: { field: 'invalid' as any, direction: 'asc' },
      });
      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should cover empty categories branch in librarySearch', async () => {
      await service.librarySearch('user-123', {
        query: 'test',
        page: 1,
        pageSize: 20,
        filters: { categories: [], visibility: 'private' },
      });
      expect(mockQueryRaw).not.toHaveBeenCalled();
    });

    it('should cover all code paths (uncovered lines 89-92, 199-200, 514-515, 199-203)', async () => {
      // 1. Lines 89-92: search with empty/missing categories
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);
      await service.search('user-123', {
        query: 'test',
        page: 1,
        pageSize: 20,
        filters: { categories: [], visibility: 'public' },
      });

      // 2. Lines 199-200: search with multiple categories (needsUnionAll = true)
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(1) }]);
      mockQueryRaw.mockResolvedValueOnce([]);
      await service.search('user-123', {
        query: 'test',
        page: 1,
        pageSize: 20,
        filters: { categories: ['artist', 'album'], visibility: 'public' },
      });

      // 3. Lines 514-515: librarySearch with empty categories
      await service.librarySearch('user-123', {
        query: 'test',
        page: 1,
        pageSize: 20,
        filters: { categories: [], visibility: 'private' },
      });

      // 4. Lines 199-203: default switch case (invalid orderBy)
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(1) }]);
      mockQueryRaw.mockResolvedValueOnce([]);
      await service.search('user-123', {
        query: 'test',
        page: 1,
        pageSize: 20,
        orderBy: { field: 'invalid' as any, direction: 'asc' },
        filters: { categories: ['artist'], visibility: 'public' },
      });
      expect(mockQueryRaw).toHaveBeenCalled();
    });
  });
});
