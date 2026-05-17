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

    it('should filter by genre category when specified', async () => {
      mockQueryRaw.mockResolvedValueOnce([
        { id: 'genre-1', name: 'Rock', type: 'genre', visibility: 'public', albumType: null, score: 0.4 },
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
  });
});
