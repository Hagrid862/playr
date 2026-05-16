import { SearchService } from '@/features/search/services/search.service';
import { Test, TestingModule } from '@nestjs/testing';
import { SearchSuggestionsResults, SearchResultType } from '@repo/contracts';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchSuggestionsQuery } from '../impl/search-suggestions.query';
import { SearchSuggestionsHandler } from './search-suggestions.handler';

describe('SearchSuggestionsHandler', () => {
  let handler: SearchSuggestionsHandler;
  let searchService: DeepMocked<SearchService>;

  const query = 'test query';
  const userId = 'user-123';
  const searchQuery = new SearchSuggestionsQuery(query, userId);

  const mockResults: SearchSuggestionsResults = [
    { id: 'artist-1', name: 'Test Artist', type: SearchResultType.Artist, visibility: 'public' },
    {
      id: 'album-1',
      name: 'Test Album',
      type: SearchResultType.Album,
      visibility: 'public',
      albumType: 'album',
    },
  ];

  beforeEach(async () => {
    searchService = createMock<SearchService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchSuggestionsHandler, { provide: SearchService, useValue: searchService }],
    }).compile();

    handler = module.get<SearchSuggestionsHandler>(SearchSuggestionsHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call searchService.searchSuggestions with query and userId', async () => {
    searchService.searchSuggestions.mockResolvedValue(mockResults);

    const result = await handler.execute(searchQuery);

    expect(searchService.searchSuggestions).toHaveBeenCalledWith(query, userId);
    expect(result).toEqual(mockResults);
  });

  it('should call searchService.searchSuggestions with undefined userId when not provided', async () => {
    const queryWithoutUser = new SearchSuggestionsQuery(query);
    searchService.searchSuggestions.mockResolvedValue(mockResults);

    await handler.execute(queryWithoutUser);

    expect(searchService.searchSuggestions).toHaveBeenCalledWith(query, undefined);
  });

  it('should return empty array when searchService returns empty array', async () => {
    searchService.searchSuggestions.mockResolvedValue([]);

    const result = await handler.execute(searchQuery);

    expect(result).toEqual([]);
  });

  it('should return all result types from searchService', async () => {
    const mixedResults: SearchSuggestionsResults = [
      { id: 'artist-1', name: 'Artist', type: SearchResultType.Artist, visibility: 'public' },
      {
        id: 'album-1',
        name: 'Album',
        type: SearchResultType.Album,
        visibility: 'public',
        albumType: 'album',
      },
      { id: 'track-1', name: 'Track', type: SearchResultType.Track, visibility: 'public' },
      { id: 'playlist-1', name: 'Playlist', type: SearchResultType.Playlist, visibility: 'public' },
    ];
    searchService.searchSuggestions.mockResolvedValue(mixedResults);

    const result = await handler.execute(searchQuery);

    expect(result).toHaveLength(4);
    expect(result).toEqual(mixedResults);
  });
});
