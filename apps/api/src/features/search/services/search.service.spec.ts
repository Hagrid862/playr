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
      // Count query is called first, then results query
      mockQueryRaw
        .mockResolvedValueOnce([{ total: BigInt(2) }]) // count query
        .mockResolvedValueOnce(mockResults); // results query

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

    it('should apply orderBy relevance', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        orderBy: { field: 'relevance', direction: 'desc' },
        page: 1,
        pageSize: 20,
        filters: { categories: ['artist'], visibility: 'public' },
      };
      await service.search('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should apply orderBy with unknown field defaults to score', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        orderBy: { field: 'unknown' as any, direction: 'asc' },
        page: 1,
        pageSize: 20,
        filters: { categories: ['artist'], visibility: 'public' },
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
      mockQueryRaw.mockResolvedValueOnce([]); // results query

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

    it('should apply orderBy relevance in librarySearch', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(0) }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const searchQuery: SearchQuery = {
        query: 'test',
        orderBy: { field: 'relevance', direction: 'desc' },
        page: 1,
        pageSize: 20,
        filters: { categories: ['artist'], visibility: 'public' },
      };
      await service.librarySearch('user-123', searchQuery);

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

    it('should search multiple categories in librarySearch', async () => {
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
      await service.librarySearch('user-123', searchQuery);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should return results with all fields mapped in librarySearch', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ total: BigInt(1) }]);
      mockQueryRaw.mockResolvedValueOnce([
        {
          id: 'track-1',
          name: 'Test Track',
          type: 'track',
          visibility: 'private',
          albumType: null,
          score: 0.9,
          coverUrl: 'http://example.com/cover.jpg',
          avatarUrl: null,
          createdAt: new Date('2023-01-01'),
          releaseDate: new Date('2023-01-01'),
          duration: 180,
          listenedCount: 50,
          isPublic: null,
          isCollaborative: null,
          explicit: true,
        },
      ]);

      const searchQuery: SearchQuery = {
        query: 'test',
        page: 1,
        pageSize: 20,
        filters: { categories: ['track'], visibility: 'public' },
      };
      const result = await service.librarySearch('user-123', searchQuery);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].id).toBe('track-1');
      expect(result.results[0].name).toBe('Test Track');
      expect(result.results[0].type).toBe('track');
      expect(result.results[0].visibility).toBe('private');
      expect(result.results[0].score).toBe(0.9);
      expect(result.results[0].coverUrl).toBe('http://example.com/cover.jpg');
      // Duration and listenedCount are track-specific fields
      if (result.results[0].type === 'track') {
        expect(result.results[0].duration).toBe(180);
        expect(result.results[0].listenedCount).toBe(50);
        expect(result.results[0].explicit).toBe(true);
      }
    });
  });
});
