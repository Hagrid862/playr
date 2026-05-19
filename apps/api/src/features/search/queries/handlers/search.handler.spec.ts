import { SearchService } from '@/features/search/services/search.service';
import { Test, TestingModule } from '@nestjs/testing';
import { SearchResultsResponse, SearchResultType } from '@repo/contracts';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchQueryImpl } from '../impl/search.query';
import { SearchHandler } from './search.handler';

describe('SearchHandler', () => {
  let handler: SearchHandler;
  let searchService: DeepMocked<SearchService>;

  const userId = 'user-123';
  const searchQuery: SearchQueryImpl = new SearchQueryImpl(userId, {
    query: 'test',
    filters: undefined,
    page: 1,
    pageSize: 20,
  });

  const mockResults: SearchResultsResponse = {
    results: [
      {
        id: 'artist-1',
        name: 'Test Artist',
        type: SearchResultType.Artist,
        visibility: 'public',
        score: 0.9,
        coverUrl: null,
        avatarUrl: null,
        albumType: null,
        verified: true,
        isCommunity: false,
        description: null,
      },
      {
        id: 'album-1',
        name: 'Test Album',
        type: SearchResultType.Album,
        visibility: 'public',
        score: 0.8,
        coverUrl: 'https://example.com/cover.jpg',
        avatarUrl: null,
        albumType: 'album',
        releaseDate: '2024-01-01T00:00:00.000Z',
        totalTracks: 10,
        totalDuration: 3600,
        description: null,
      },
    ],
    loggedIn: true,
    total: 2,
    page: 1,
    pageSize: 20,
    filters: null,
    orderBy: null,
  };

  beforeEach(async () => {
    searchService = createMock<SearchService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchHandler, { provide: SearchService, useValue: searchService }],
    }).compile();

    handler = module.get<SearchHandler>(SearchHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call searchService.search with userId and searchQuery', async () => {
    searchService.search.mockResolvedValue(mockResults);

    const result = await handler.execute(searchQuery);

    expect(searchService.search).toHaveBeenCalledWith(userId, searchQuery.searchQuery);
    expect(result).toEqual(mockResults);
  });

  it('should call searchService.search with null userId when not provided', async () => {
    const queryWithNullUser = new SearchQueryImpl(null, {
      query: 'test',
      filters: undefined,
      page: 1,
      pageSize: 20,
    });
    searchService.search.mockResolvedValue(mockResults);

    await handler.execute(queryWithNullUser);

    expect(searchService.search).toHaveBeenCalledWith(null, queryWithNullUser.searchQuery);
  });

  it('should return results from searchService', async () => {
    searchService.search.mockResolvedValue(mockResults);

    const result = await handler.execute(searchQuery);

    expect(result).toEqual(mockResults);
    expect(result.results).toHaveLength(2);
    expect(result.loggedIn).toBe(true);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it('should return empty results when searchService returns empty results', async () => {
    const emptyResults: SearchResultsResponse = {
      results: [],
      loggedIn: true,
      total: 0,
      page: 1,
      pageSize: 20,
      filters: null,
      orderBy: null,
    };
    searchService.search.mockResolvedValue(emptyResults);

    const result = await handler.execute(searchQuery);

    expect(result).toEqual({ results: [], loggedIn: true, total: 0, page: 1, pageSize: 20, filters: null, orderBy: null });
  });

  it('should return all result types from searchService', async () => {
    const allTypeResults: SearchResultsResponse = {
      results: [
        {
          id: 'artist-1',
          name: 'Artist',
          type: SearchResultType.Artist,
          visibility: 'public',
          score: 0.9,
          coverUrl: null,
          avatarUrl: null,
          albumType: null,
          verified: true,
          isCommunity: false,
          description: null,
        },
        {
          id: 'album-1',
          name: 'Album',
          type: SearchResultType.Album,
          visibility: 'public',
          score: 0.8,
          coverUrl: null,
          avatarUrl: null,
          albumType: 'album',
          releaseDate: '2024-01-01T00:00:00.000Z',
          totalTracks: 10,
          totalDuration: 3600,
          description: null,
        },
        {
          id: 'track-1',
          name: 'Track',
          type: SearchResultType.Track,
          visibility: 'public',
          score: 0.7,
          coverUrl: null,
          avatarUrl: null,
          albumType: null,
          duration: 180,
          trackNumber: 1,
          diskNumber: 1,
          explicit: true,
          listenedCount: 100,
          albumId: 'album-1',
          lyrics: null,
        },
        {
          id: 'playlist-1',
          name: 'Playlist',
          type: SearchResultType.Playlist,
          visibility: 'public',
          score: 0.6,
          coverUrl: null,
          avatarUrl: null,
          albumType: null,
          isPublic: true,
          description: null,
          trackCount: 20,
        },
      ],
      loggedIn: true,
      total: 4,
      page: 1,
      pageSize: 20,
      filters: null,
      orderBy: null,
    };
    searchService.search.mockResolvedValue(allTypeResults);

    const result = await handler.execute(searchQuery);

    expect(result.results).toHaveLength(4);
    expect(result).toEqual(allTypeResults);
  });

  it('should pass through searchQuery with filters', async () => {
    const queryWithFilters: SearchQueryImpl = new SearchQueryImpl(userId, {
      query: 'test',
      filters: {
        categories: ['artist', 'album'],
        visibility: 'public',
      } as const,
      page: 2,
      pageSize: 10,
    });
    searchService.search.mockResolvedValue(mockResults);

    await handler.execute(queryWithFilters);

    expect(searchService.search).toHaveBeenCalledWith(userId, queryWithFilters.searchQuery);
    expect(queryWithFilters.searchQuery.filters?.categories).toEqual(['artist', 'album']);
    expect(queryWithFilters.searchQuery.filters?.visibility).toBe('public');
    expect(queryWithFilters.searchQuery.page).toBe(2);
    expect(queryWithFilters.searchQuery.pageSize).toBe(10);
  });
});
