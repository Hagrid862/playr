import { SearchService } from '@/features/search/services/search.service';
import { Test, TestingModule } from '@nestjs/testing';
import { LibrarySearchResultsData } from '@repo/contracts';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LibrarySearchQueryImpl } from '../impl/library-search.query';
import { LibrarySearchHandler } from './library-search.handler';

describe('LibrarySearchHandler', () => {
  let handler: LibrarySearchHandler;
  let searchService: DeepMocked<SearchService>;

  const userId = 'user-123';
  const searchQuery: LibrarySearchQueryImpl = new LibrarySearchQueryImpl(userId, {
    query: 'test',
    filters: undefined,
    page: 1,
    pageSize: 20,
  });

  const mockData: LibrarySearchResultsData = {
    results: [
      {
        id: 'artist-1',
        name: 'Test Artist',
        type: 'artist',
        visibility: 'private',
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
        type: 'album',
        visibility: 'private',
        score: 0.8,
        coverUrl: 'https://example.com/cover.jpg',
        avatarUrl: null,
        albumType: 'album',
        releaseDate: '2024-01-01T00:00:00.000Z',
        description: null,
      },
    ],
    total: 2,
    page: 1,
    pageSize: 20,
    filters: null,
    orderBy: null,
  };

  beforeEach(async () => {
    searchService = createMock<SearchService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [LibrarySearchHandler, { provide: SearchService, useValue: searchService }],
    }).compile();

    handler = module.get<LibrarySearchHandler>(LibrarySearchHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call searchService.librarySearch with userId and searchQuery', async () => {
    searchService.librarySearch.mockResolvedValue(mockData);

    const result = await handler.execute(searchQuery);

    expect(searchService.librarySearch).toHaveBeenCalledWith(userId, searchQuery.searchQuery);
    expect(result).toEqual(mockData);
  });

  it('should return results from searchService', async () => {
    searchService.librarySearch.mockResolvedValue(mockData);

    const result = await handler.execute(searchQuery);

    expect(result).toEqual(mockData);
    expect(result.results).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it('should return empty results when searchService returns empty results', async () => {
    const emptyResults: LibrarySearchResultsData = {
      results: [],
      total: 0,
      page: 1,
      pageSize: 20,
      filters: null,
      orderBy: null,
    };
    searchService.librarySearch.mockResolvedValue(emptyResults);

    const result = await handler.execute(searchQuery);

    expect(result).toEqual({
      results: [],
      total: 0,
      page: 1,
      pageSize: 20,
      filters: null,
      orderBy: null,
    });
  });

  it('should return all result types from searchService', async () => {
    const allTypeResults: LibrarySearchResultsData = {
      results: [
        {
          id: 'artist-1',
          name: 'Artist',
          type: 'artist',
          visibility: 'private',
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
          type: 'album',
          visibility: 'private',
          score: 0.8,
          coverUrl: null,
          avatarUrl: null,
          albumType: 'album',
          releaseDate: '2024-01-01T00:00:00.000Z',
          description: null,
        },
        {
          id: 'track-1',
          name: 'Track',
          type: 'track',
          visibility: 'private',
          score: 0.7,
          coverUrl: null,
          avatarUrl: null,
          albumType: null,
          duration: 180,
          explicit: true,
          listenedCount: 100,
        },
        {
          id: 'playlist-1',
          name: 'Playlist',
          type: 'playlist',
          visibility: 'private',
          score: 0.6,
          coverUrl: null,
          avatarUrl: null,
          albumType: null,
          description: null,
        },
      ],
      total: 4,
      page: 1,
      pageSize: 20,
      filters: null,
      orderBy: null,
    };
    searchService.librarySearch.mockResolvedValue(allTypeResults);

    const result = await handler.execute(searchQuery);

    expect(result.results).toHaveLength(4);
    expect(result).toEqual(allTypeResults);
  });

  it('should pass through searchQuery with filters', async () => {
    const queryWithFilters: LibrarySearchQueryImpl = new LibrarySearchQueryImpl(userId, {
      query: 'test',
      filters: {
        categories: ['artist', 'album'],
        visibility: 'private',
      } as const,
      page: 2,
      pageSize: 10,
    });
    searchService.librarySearch.mockResolvedValue(mockData);

    await handler.execute(queryWithFilters);

    expect(searchService.librarySearch).toHaveBeenCalledWith(userId, queryWithFilters.searchQuery);
    expect(queryWithFilters.searchQuery.filters?.categories).toEqual(['artist', 'album']);
    expect(queryWithFilters.searchQuery.filters?.visibility).toBe('private');
    expect(queryWithFilters.searchQuery.page).toBe(2);
    expect(queryWithFilters.searchQuery.pageSize).toBe(10);
  });
});
