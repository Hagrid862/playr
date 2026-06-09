import { SearchSuggestionsService } from '@/features/search/services/search-suggestions.service';
import { Test, TestingModule } from '@nestjs/testing';
import { SearchSuggestionsResults, SearchResultType } from '@repo/contracts';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchSuggestionsQuery } from '../impl/search-suggestions.query';
import { SearchSuggestionsHandler } from './search-suggestions.handler';

describe('SearchSuggestionsHandler', () => {
  let handler: SearchSuggestionsHandler;
  let suggestionsService: DeepMocked<SearchSuggestionsService>;

  const query = 'test query';
  const userId = 'user-123';
  const searchQuery = new SearchSuggestionsQuery(query, userId);

  const mockResults: SearchSuggestionsResults = {
    results: [
      { id: 'artist-1', name: 'Test Artist', type: SearchResultType.Artist, visibility: 'public' },
      {
        id: 'album-1',
        name: 'Test Album',
        type: SearchResultType.Album,
        visibility: 'public',
        albumType: 'album',
      },
    ],
    loggedIn: true,
  };

  beforeEach(async () => {
    suggestionsService = createMock<SearchSuggestionsService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchSuggestionsHandler,
        { provide: SearchSuggestionsService, useValue: suggestionsService },
      ],
    }).compile();

    handler = module.get<SearchSuggestionsHandler>(SearchSuggestionsHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call suggestionsService.searchSuggestions with query and userId', async () => {
    suggestionsService.searchSuggestions.mockResolvedValue(mockResults);

    const result = await handler.execute(searchQuery);

    expect(suggestionsService.searchSuggestions).toHaveBeenCalledWith(query, userId);
    expect(result).toEqual(mockResults);
  });

  it('should call suggestionsService.searchSuggestions with undefined userId when not provided', async () => {
    const queryWithoutUser = new SearchSuggestionsQuery(query);
    suggestionsService.searchSuggestions.mockResolvedValue(mockResults);

    await handler.execute(queryWithoutUser);

    expect(suggestionsService.searchSuggestions).toHaveBeenCalledWith(query, undefined);
  });

  it('should return empty results when suggestionsService returns empty results', async () => {
    suggestionsService.searchSuggestions.mockResolvedValue({ results: [], loggedIn: false });

    const result = await handler.execute(searchQuery);

    expect(result).toEqual({ results: [], loggedIn: false });
  });

  it('should return all result categories from suggestionsService', async () => {
    const mixedResults: SearchSuggestionsResults = {
      results: [
        { id: 'artist-1', name: 'Artist', type: SearchResultType.Artist, visibility: 'public' },
        {
          id: 'album-1',
          name: 'Album',
          type: SearchResultType.Album,
          visibility: 'public',
          albumType: 'album',
        },
        { id: 'track-1', name: 'Track', type: SearchResultType.Track, visibility: 'public' },
        {
          id: 'playlist-1',
          name: 'Playlist',
          type: SearchResultType.Playlist,
          visibility: 'public',
        },
      ],
      loggedIn: true,
    };
    suggestionsService.searchSuggestions.mockResolvedValue(mixedResults);

    const result = await handler.execute(searchQuery);

    expect(result.results).toHaveLength(4);
    expect(result).toEqual(mixedResults);
  });
});
