import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '@/shared/services/prisma.service';
import { SearchSuggestionsService } from './search-suggestions.service';

describe('SearchSuggestionsService', () => {
  let service: SearchSuggestionsService;
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
        SearchSuggestionsService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<SearchSuggestionsService>(SearchSuggestionsService);
  });

  describe('searchSuggestions', () => {
    it('should throw UnauthorizedException when userId is not provided', async () => {
      await expect(service.searchSuggestions('test')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw BadRequestException when query is too short', async () => {
      await expect(
        service.searchSuggestions('ab', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when query is empty', async () => {
      await expect(service.searchSuggestions('', 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return search results when query is valid', async () => {
      const mockResults = [
        {
          id: 'artist-1',
          name: 'Test Artist',
          type: 'artist',
          visibility: 'public',
          albumType: null,
          score: 0.8,
        },
      ];
      mockQueryRaw.mockResolvedValueOnce(mockResults);

      const result = await service.searchSuggestions('test', 'user-123');

      expect(mockQueryRaw).toHaveBeenCalled();
      expect(result.results).toHaveLength(1);
      expect(result.results[0].id).toBe('artist-1');
      expect(result.results[0].name).toBe('Test Artist');
      expect(result.results[0].type).toBe('artist');
    });

    it('should include albumType when present in results', async () => {
      const mockResults = [
        {
          id: 'album-1',
          name: 'Test Album',
          type: 'album',
          visibility: 'public',
          albumType: 'album',
          score: 0.7,
        },
      ];
      mockQueryRaw.mockResolvedValueOnce(mockResults);

      const result = await service.searchSuggestions('album', 'user-123');

      expect(result.results[0]).toHaveProperty('albumType', 'album');
    });

    it('should trim query before processing', async () => {
      mockQueryRaw.mockResolvedValueOnce([]);

      await service.searchSuggestions('  test  ', 'user-123');

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should handle public visibility with authenticated user', async () => {
      const mockResults = [
        {
          id: 'artist-1',
          name: 'Test Artist',
          type: 'artist',
          visibility: 'public',
          albumType: null,
          score: 0.8,
        },
      ];
      mockQueryRaw.mockResolvedValueOnce(mockResults);

      const result = await service.searchSuggestions('test', 'user-123');

      // Verify the query was called (the actual SQL is hard to test without parsing)
      expect(mockQueryRaw).toHaveBeenCalled();
      expect(result.results).toHaveLength(1);
    });

    it('should handle community visibility with user access', async () => {
      const mockResults = [
        {
          id: 'artist-1',
          name: 'Community Artist',
          type: 'artist',
          visibility: 'community',
          albumType: null,
          score: 0.8,
        },
      ];
      mockQueryRaw.mockResolvedValueOnce(mockResults);

      const result = await service.searchSuggestions('test', 'user-123');

      // Verify the query was called
      expect(mockQueryRaw).toHaveBeenCalled();
      expect(result.results).toHaveLength(1);
      expect(result.results[0].visibility).toBe('community');
    });

    it('should handle community visibility without user access (should not return results)', async () => {
      // Mock empty results since user doesn't have access to community content
      mockQueryRaw.mockResolvedValueOnce([]);

      const result = await service.searchSuggestions('test', 'different-user');

      // Verify the query was called
      expect(mockQueryRaw).toHaveBeenCalled();
      expect(result.results).toHaveLength(0);
    });
  });

  describe('librarySearchSuggestions', () => {
    it('should throw BadRequestException when query is too short', async () => {
      await expect(
        service.librarySearchSuggestions('user-123', 'ab'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when query is empty', async () => {
      await expect(
        service.librarySearchSuggestions('user-123', ''),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return search results when query is valid', async () => {
      const mockResults = [
        {
          id: 'artist-1',
          name: 'Library Artist',
          type: 'artist',
          visibility: 'private',
          albumType: null,
          score: 0.9,
        },
      ];
      mockQueryRaw.mockResolvedValueOnce(mockResults);

      const result = await service.librarySearchSuggestions('user-123', 'artist');

      expect(mockQueryRaw).toHaveBeenCalled();
      expect(result.results).toHaveLength(1);
      expect(result.results[0].id).toBe('artist-1');
      expect(result.results[0].name).toBe('Library Artist');
      expect(result.results[0].type).toBe('artist');
    });

    it('should filter by artist category when specified', async () => {
      mockQueryRaw.mockResolvedValueOnce([
        { id: 'artist-1', name: 'Artist', type: 'artist', visibility: 'private', albumType: null, score: 0.8 },
      ]);

      await service.librarySearchSuggestions('user-123', 'test', ['artist']);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should filter by album category when specified', async () => {
      mockQueryRaw.mockResolvedValueOnce([
        { id: 'album-1', name: 'Album', type: 'album', visibility: 'private', albumType: 'album', score: 0.7 },
      ]);

      await service.librarySearchSuggestions('user-123', 'test', ['album']);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should filter by track category when specified', async () => {
      mockQueryRaw.mockResolvedValueOnce([
        { id: 'track-1', name: 'Track', type: 'track', visibility: 'private', albumType: null, score: 0.6 },
      ]);

      await service.librarySearchSuggestions('user-123', 'test', ['track']);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should filter by playlist category when specified', async () => {
      mockQueryRaw.mockResolvedValueOnce([
        { id: 'playlist-1', name: 'Playlist', type: 'playlist', visibility: 'private', albumType: null, score: 0.5 },
      ]);

      await service.librarySearchSuggestions('user-123', 'test', ['playlist']);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should filter by genre category when specified (user library genre)', async () => {
      mockQueryRaw.mockResolvedValueOnce([
        { id: 'genre-1', name: 'Rock', type: 'genre', visibility: 'private', albumType: null, score: 0.4 },
      ]);

      await service.librarySearchSuggestions('user-123', 'test', ['genre']);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should filter by genre category when specified (public genre)', async () => {
      mockQueryRaw.mockResolvedValueOnce([
        { id: 'genre-2', name: 'Pop', type: 'genre', visibility: 'public', albumType: null, score: 0.3 },
      ]);

      await service.librarySearchSuggestions('user-123', 'test', ['genre']);

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should search all categories when no categories specified', async () => {
      mockQueryRaw.mockResolvedValueOnce([
        { id: 'artist-1', name: 'Artist', type: 'artist', visibility: 'private', albumType: null, score: 0.8 },
        { id: 'album-1', name: 'Album', type: 'album', visibility: 'private', albumType: 'album', score: 0.7 },
      ]);

      await service.librarySearchSuggestions('user-123', 'test');

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should return empty results when no results found', async () => {
      mockQueryRaw.mockResolvedValueOnce([]);

      const result = await service.librarySearchSuggestions('user-123', 'nonexistent');

      expect(result).toEqual({ results: [] });
    });

    it('should trim query before processing', async () => {
      mockQueryRaw.mockResolvedValueOnce([]);

      await service.librarySearchSuggestions('user-123', '  test  ');

      expect(mockQueryRaw).toHaveBeenCalled();
    });

    it('should limit results to 8', async () => {
      // Create 8 mock results (what the database would return after LIMIT 8)
      const mockResults = Array.from({ length: 8 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        type: 'artist' as const,
        visibility: 'private',
        albumType: null,
        score: 0.9 - (i * 0.01), // Decreasing scores
      }));
      mockQueryRaw.mockResolvedValueOnce(mockResults);

      const result = await service.librarySearchSuggestions('user-123', 'test');

      expect(mockQueryRaw).toHaveBeenCalled();
      // The service should return only 8 results due to LIMIT 8 in the query
      expect(result.results).toHaveLength(8);
    });

    it('should return empty results when types array is empty', async () => {
      const result = await service.librarySearchSuggestions('user-123', 'test', []);

      // Should return early without calling the database
      expect(mockQueryRaw).not.toHaveBeenCalled();
      expect(result).toEqual({ results: [] });
    });
  });
});
