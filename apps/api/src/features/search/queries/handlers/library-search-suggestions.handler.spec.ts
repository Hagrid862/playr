import { SearchSuggestionsService } from '@/features/search/services/search-suggestions.service';
import { Test, TestingModule } from '@nestjs/testing';
import { LibrarySearchSuggestionsData, SearchResultType, SearchCategory } from '@repo/contracts';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LibrarySearchSuggestionsQuery } from '../impl/library-search-suggestions.query';
import { LibrarySearchSuggestionsHandler } from './library-search-suggestions.handler';

describe('LibrarySearchSuggestionsHandler', () => {
  let handler: LibrarySearchSuggestionsHandler;
  let suggestionsService: DeepMocked<SearchSuggestionsService>;

  const userId = 'user-123';
  const query = 'test query';
  const categories: SearchCategory[] = ['artist', 'album'];
  const searchQuery = new LibrarySearchSuggestionsQuery(userId, query, categories);

  const mockData: LibrarySearchSuggestionsData = {
    results: [
      { id: 'artist-1', name: 'Test Artist', type: SearchResultType.Artist, visibility: 'private' },
      {
        id: 'album-1',
        name: 'Test Album',
        type: SearchResultType.Album,
        visibility: 'private',
        albumType: 'album',
      },
    ],
  };

  beforeEach(async () => {
    suggestionsService = createMock<SearchSuggestionsService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibrarySearchSuggestionsHandler,
        { provide: SearchSuggestionsService, useValue: suggestionsService },
      ],
    }).compile();

    handler = module.get<LibrarySearchSuggestionsHandler>(LibrarySearchSuggestionsHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call suggestionsService.librarySearchSuggestions with userId, query, and categories', async () => {
    suggestionsService.librarySearchSuggestions.mockResolvedValue(mockData);

    const result = await handler.execute(searchQuery);

    expect(suggestionsService.librarySearchSuggestions).toHaveBeenCalledWith(
      userId,
      query,
      categories,
    );
    expect(result).toEqual(mockData);
  });

  it('should call suggestionsService.librarySearchSuggestions with undefined categories when not provided', async () => {
    const queryWithoutCategories = new LibrarySearchSuggestionsQuery(userId, query);
    suggestionsService.librarySearchSuggestions.mockResolvedValue(mockData);

    await handler.execute(queryWithoutCategories);

    expect(suggestionsService.librarySearchSuggestions).toHaveBeenCalledWith(
      userId,
      query,
      undefined,
    );
  });

  it('should return empty results when suggestionsService returns empty results', async () => {
    suggestionsService.librarySearchSuggestions.mockResolvedValue({ results: [] });

    const result = await handler.execute(searchQuery);

    expect(result).toEqual({ results: [] });
  });

  it('should handle single category filter', async () => {
    const singleCategoryQuery = new LibrarySearchSuggestionsQuery(userId, query, ['track']);
    const trackResults: LibrarySearchSuggestionsData = {
      results: [
        { id: 'track-1', name: 'Test Track', type: SearchResultType.Track, visibility: 'private' },
      ],
    };
    suggestionsService.librarySearchSuggestions.mockResolvedValue(trackResults);

    const result = await handler.execute(singleCategoryQuery);

    expect(suggestionsService.librarySearchSuggestions).toHaveBeenCalledWith(userId, query, [
      'track',
    ]);
    expect(result).toEqual(trackResults);
  });

  it('should handle all categories', async () => {
    const allCategories: SearchCategory[] = ['artist', 'album', 'track', 'playlist', 'genre'];
    const allCategoriesQuery = new LibrarySearchSuggestionsQuery(
      userId,
      query,
      allCategories,
    );
    const allResults: LibrarySearchSuggestionsData = {
      results: [
        { id: 'artist-1', name: 'Artist', type: SearchResultType.Artist, visibility: 'private' },
        {
          id: 'album-1',
          name: 'Album',
          type: SearchResultType.Album,
          visibility: 'private',
          albumType: 'album',
        },
        { id: 'track-1', name: 'Track', type: SearchResultType.Track, visibility: 'private' },
        {
          id: 'playlist-1',
          name: 'Playlist',
          type: SearchResultType.Playlist,
          visibility: 'private',
        },
        { id: 'genre-1', name: 'Genre', type: SearchResultType.Genre, visibility: 'public' },
      ],
    };
    suggestionsService.librarySearchSuggestions.mockResolvedValue(allResults);

    const result = await handler.execute(allCategoriesQuery);

    expect(suggestionsService.librarySearchSuggestions).toHaveBeenCalledWith(
      userId,
      query,
      allCategories,
    );
    expect(result).toEqual(allResults);
  });

  it('should handle playlist category', async () => {
    const playlistQuery = new LibrarySearchSuggestionsQuery(userId, query, ['playlist']);
    const playlistResults: LibrarySearchSuggestionsData = {
      results: [
        {
          id: 'playlist-1',
          name: 'My Playlist',
          type: SearchResultType.Playlist,
          visibility: 'private',
        },
      ],
    };
    suggestionsService.librarySearchSuggestions.mockResolvedValue(playlistResults);

    const result = await handler.execute(playlistQuery);

    expect(suggestionsService.librarySearchSuggestions).toHaveBeenCalledWith(userId, query, [
      'playlist',
    ]);
    expect(result).toEqual(playlistResults);
  });

  it('should handle genre category', async () => {
    const genreQuery = new LibrarySearchSuggestionsQuery(userId, query, ['genre']);
    const genreResults: LibrarySearchSuggestionsData = {
      results: [
        { id: 'genre-1', name: 'Rock', type: SearchResultType.Genre, visibility: 'public' },
      ],
    };
    suggestionsService.librarySearchSuggestions.mockResolvedValue(genreResults);

    const result = await handler.execute(genreQuery);

    expect(suggestionsService.librarySearchSuggestions).toHaveBeenCalledWith(userId, query, [
      'genre',
    ]);
    expect(result).toEqual(genreResults);
  });
});
