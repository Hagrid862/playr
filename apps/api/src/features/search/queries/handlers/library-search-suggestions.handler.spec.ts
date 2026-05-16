import { SearchService } from '@/features/search/services/search.service';
import { Test, TestingModule } from '@nestjs/testing';
import {
  LibrarySearchSuggestionsResults,
  SearchSuggestionsCategories,
  SearchResultType,
} from '@repo/contracts';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LibrarySearchSuggestionsQuery } from '../impl/library-search-suggestions.query';
import { LibrarySearchSuggestionsHandler } from './library-search-suggestions.handler';

describe('LibrarySearchSuggestionsHandler', () => {
  let handler: LibrarySearchSuggestionsHandler;
  let searchService: DeepMocked<SearchService>;

  const userId = 'user-123';
  const query = 'test query';
  const categories: SearchSuggestionsCategories[] = ['artist', 'album'];
  const searchQuery = new LibrarySearchSuggestionsQuery(userId, query, categories);

  const mockResults: LibrarySearchSuggestionsResults = [
    { id: 'artist-1', name: 'Test Artist', type: SearchResultType.Artist, visibility: 'private' },
    {
      id: 'album-1',
      name: 'Test Album',
      type: SearchResultType.Album,
      visibility: 'private',
      albumType: 'album',
    },
  ];

  beforeEach(async () => {
    searchService = createMock<SearchService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibrarySearchSuggestionsHandler,
        { provide: SearchService, useValue: searchService },
      ],
    }).compile();

    handler = module.get<LibrarySearchSuggestionsHandler>(LibrarySearchSuggestionsHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call searchService.librarySearchSuggestions with userId, query, and categories', async () => {
    searchService.librarySearchSuggestions.mockResolvedValue(mockResults);

    const result = await handler.execute(searchQuery);

    expect(searchService.librarySearchSuggestions).toHaveBeenCalledWith(userId, query, categories);
    expect(result).toEqual(mockResults);
  });

  it('should call searchService.librarySearchSuggestions with undefined categories when not provided', async () => {
    const queryWithoutCategories = new LibrarySearchSuggestionsQuery(userId, query);
    searchService.librarySearchSuggestions.mockResolvedValue(mockResults);

    await handler.execute(queryWithoutCategories);

    expect(searchService.librarySearchSuggestions).toHaveBeenCalledWith(userId, query, undefined);
  });

  it('should return empty array when searchService returns empty array', async () => {
    searchService.librarySearchSuggestions.mockResolvedValue([]);

    const result = await handler.execute(searchQuery);

    expect(result).toEqual([]);
  });

  it('should handle single category filter', async () => {
    const singleCategoryQuery = new LibrarySearchSuggestionsQuery(userId, query, ['track']);
    const trackResults: LibrarySearchSuggestionsResults = [
      { id: 'track-1', name: 'Test Track', type: SearchResultType.Track, visibility: 'private' },
    ];
    searchService.librarySearchSuggestions.mockResolvedValue(trackResults);

    const result = await handler.execute(singleCategoryQuery);

    expect(searchService.librarySearchSuggestions).toHaveBeenCalledWith(userId, query, ['track']);
    expect(result).toEqual(trackResults);
  });

  it('should handle all category types', async () => {
    const allCategories: SearchSuggestionsCategories[] = [
      'artist',
      'album',
      'track',
      'playlist',
      'genre',
    ];
    const allCategoriesQuery = new LibrarySearchSuggestionsQuery(userId, query, allCategories);
    const allResults: LibrarySearchSuggestionsResults = [
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
    ];
    searchService.librarySearchSuggestions.mockResolvedValue(allResults);

    const result = await handler.execute(allCategoriesQuery);

    expect(searchService.librarySearchSuggestions).toHaveBeenCalledWith(
      userId,
      query,
      allCategories,
    );
    expect(result).toEqual(allResults);
  });

  it('should handle playlist category', async () => {
    const playlistQuery = new LibrarySearchSuggestionsQuery(userId, query, ['playlist']);
    const playlistResults: LibrarySearchSuggestionsResults = [
      {
        id: 'playlist-1',
        name: 'My Playlist',
        type: SearchResultType.Playlist,
        visibility: 'private',
      },
    ];
    searchService.librarySearchSuggestions.mockResolvedValue(playlistResults);

    const result = await handler.execute(playlistQuery);

    expect(searchService.librarySearchSuggestions).toHaveBeenCalledWith(userId, query, [
      'playlist',
    ]);
    expect(result).toEqual(playlistResults);
  });

  it('should handle genre category', async () => {
    const genreQuery = new LibrarySearchSuggestionsQuery(userId, query, ['genre']);
    const genreResults: LibrarySearchSuggestionsResults = [
      { id: 'genre-1', name: 'Rock', type: SearchResultType.Genre, visibility: 'public' },
    ];
    searchService.librarySearchSuggestions.mockResolvedValue(genreResults);

    const result = await handler.execute(genreQuery);

    expect(searchService.librarySearchSuggestions).toHaveBeenCalledWith(userId, query, ['genre']);
    expect(result).toEqual(genreResults);
  });
});
