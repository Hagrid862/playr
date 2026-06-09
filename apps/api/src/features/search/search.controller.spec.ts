import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { userBuilder } from '@repo/testing';
import { SearchSuggestionsQueryRequestDto } from './dto/search-suggestions-query.request.dto';
import { LibrarySearchSuggestionsQueryRequestDto } from './dto/library-search-suggestions-query.request.dto';
import { SearchQueryRequestDto } from './dto/search-query.request.dto';
import { LibrarySearchQueryRequestDto } from './dto/library-search-query.request.dto';
import { SearchSuggestionsQuery } from './queries/impl/search-suggestions.query';
import { LibrarySearchSuggestionsQuery } from './queries/impl/library-search-suggestions.query';
import { SearchQueryImpl } from './queries/impl/search.query';
import { LibrarySearchQueryImpl } from './queries/impl/library-search.query';
import { SearchController } from './search.controller';
import type { User } from '@repo/db';

describe('SearchController', () => {
  let controller: SearchController;
  let queryBus: DeepMocked<QueryBus>;

  beforeEach(async () => {
    queryBus = createMock<QueryBus>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [{ provide: QueryBus, useValue: queryBus }],
    }).compile();

    controller = module.get<SearchController>(SearchController);
  });

  describe('searchSuggestions', () => {
    it('should execute SearchSuggestionsQuery with query and user id when user is authenticated', async () => {
      const queryDto = createMock<SearchSuggestionsQueryRequestDto>({
        query: 'test',
      });
      const user: User = userBuilder();
      const expectedResult = [
        { id: 'artist-1', name: 'Test Artist', type: 'artist', visibility: 'public' },
      ];
      queryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.searchSuggestions(queryDto, user);

      expect(queryBus.execute).toHaveBeenCalledWith(new SearchSuggestionsQuery('test', user.id));
      expect(result).toBe(expectedResult);
    });

    it('should execute SearchSuggestionsQuery with undefined userId when user is null', async () => {
      const queryDto = createMock<SearchSuggestionsQueryRequestDto>({
        query: 'pop',
      });
      const expectedResult = [
        { id: 'artist-1', name: 'Pop Artist', type: 'artist', visibility: 'public' },
      ];
      queryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.searchSuggestions(queryDto, null);

      expect(queryBus.execute).toHaveBeenCalledWith(new SearchSuggestionsQuery('pop', undefined));
      expect(result).toBe(expectedResult);
    });

    it('should pass through the exact query string from DTO to query', async () => {
      const queryDto = createMock<SearchSuggestionsQueryRequestDto>({
        query: 'rock band',
      });
      const user: User = userBuilder();
      queryBus.execute.mockResolvedValue([]);

      await controller.searchSuggestions(queryDto, user);

      expect(queryBus.execute).toHaveBeenCalledWith(
        new SearchSuggestionsQuery('rock band', user.id),
      );
    });
  });

  describe('searchLibrarySuggestions', () => {
    it('should execute LibrarySearchSuggestionsQuery with userId, query, and categories', async () => {
      const queryDto = createMock<LibrarySearchSuggestionsQueryRequestDto>({
        query: 'jazz',
        categories: ['artist', 'album'],
      });
      const user: User = userBuilder();
      const expectedResult = [
        { id: 'artist-1', name: 'Jazz Artist', type: 'artist', visibility: 'private' },
      ];
      queryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.searchLibrarySuggestions(queryDto, user);

      expect(queryBus.execute).toHaveBeenCalledWith(
        new LibrarySearchSuggestionsQuery(user.id, 'jazz', ['artist', 'album']),
      );
      expect(result).toBe(expectedResult);
    });

    it('should execute LibrarySearchSuggestionsQuery with undefined categories when not provided', async () => {
      const queryDto = createMock<LibrarySearchSuggestionsQueryRequestDto>({
        query: 'classical',
        categories: undefined,
      });
      const user: User = { id: 'user-101' } as User;
      queryBus.execute.mockResolvedValue([]);

      await controller.searchLibrarySuggestions(queryDto, user);

      expect(queryBus.execute).toHaveBeenCalledWith(
        new LibrarySearchSuggestionsQuery('user-101', 'classical', undefined),
      );
    });

    it('should execute LibrarySearchSuggestionsQuery with single category as array', async () => {
      const queryDto = createMock<LibrarySearchSuggestionsQueryRequestDto>({
        query: 'pop',
        categories: ['track'],
      });
      const user: User = { id: 'user-202' } as User;
      queryBus.execute.mockResolvedValue([]);

      await controller.searchLibrarySuggestions(queryDto, user);

      expect(queryBus.execute).toHaveBeenCalledWith(
        new LibrarySearchSuggestionsQuery('user-202', 'pop', ['track']),
      );
    });

    it('should execute LibrarySearchSuggestionsQuery with all categories', async () => {
      const queryDto = createMock<LibrarySearchSuggestionsQueryRequestDto>({
        query: 'music',
        categories: ['artist', 'album', 'track', 'playlist', 'genre'],
      });
      const user: User = { id: 'user-303' } as User;
      queryBus.execute.mockResolvedValue([]);

      await controller.searchLibrarySuggestions(queryDto, user);

      expect(queryBus.execute).toHaveBeenCalledWith(
        new LibrarySearchSuggestionsQuery('user-303', 'music', [
          'artist',
          'album',
          'track',
          'playlist',
          'genre',
        ]),
      );
    });

    it('should return empty array when no results found', async () => {
      const queryDto = createMock<LibrarySearchSuggestionsQueryRequestDto>({
        query: 'nonexistent',
        categories: ['artist'],
      });
      const user: User = { id: 'user-404' } as User;
      queryBus.execute.mockResolvedValue([]);

      const result = await controller.searchLibrarySuggestions(queryDto, user);

      expect(result).toEqual([]);
    });
  });

  describe('searchLibrary', () => {
    it('should execute LibrarySearchQueryImpl with userId and full query DTO', async () => {
      const queryDto = createMock<LibrarySearchQueryRequestDto>({
        query: 'my album',
        page: 1,
        pageSize: 10,
        filters: { categories: ['album'] },
      });
      const user: User = userBuilder();
      const expectedResult = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
        filters: null,
        orderBy: null,
      };
      queryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.searchLibrary(queryDto, user);

      expect(queryBus.execute).toHaveBeenCalledWith(
        new LibrarySearchQueryImpl(user.id, expect.objectContaining({ query: 'my album' })),
      );
      expect(result).toBe(expectedResult);
    });

    it('should return the result from queryBus.execute', async () => {
      const queryDto = createMock<LibrarySearchQueryRequestDto>({
        query: 'my track',
      });
      const user: User = userBuilder();
      const expectedResult = {
        data: [
          { id: 'track-1', name: 'My Awesome Track', type: 'track', visibility: 'private', score: 1.0 },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        filters: null,
        orderBy: null,
      };
      queryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.searchLibrary(queryDto, user);

      expect(result).toBe(expectedResult);
    });
  });

  describe('search', () => {
    it('should execute SearchQueryImpl with userId and full query DTO when user is authenticated', async () => {
      const queryDto = createMock<SearchQueryRequestDto>({
        query: 'beatles',
        page: 1,
        pageSize: 20,
      });
      const user: User = userBuilder();
      const expectedResult = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        filters: null,
        orderBy: null,
      };
      queryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.search(queryDto, user);

      expect(queryBus.execute).toHaveBeenCalledWith(
        new SearchQueryImpl(user.id, expect.objectContaining({ query: 'beatles' })),
      );
      expect(result).toBe(expectedResult);
    });

    it('should pass userId as null when user is not authenticated', async () => {
      const queryDto = createMock<SearchQueryRequestDto>({
        query: 'public rock',
        page: 1,
        pageSize: 20,
      });
      const expectedResult = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        filters: null,
        orderBy: null,
      };
      queryBus.execute.mockResolvedValue(expectedResult);

      await controller.search(queryDto, null);

      expect(queryBus.execute).toHaveBeenCalledWith(
        new SearchQueryImpl(null, expect.objectContaining({ query: 'public rock' })),
      );
    });

    it('should pass through filters and orderBy from DTO', async () => {
      const queryDto = createMock<SearchQueryRequestDto>({
        query: 'jazz',
        filters: {
          categories: ['artist'],
          visibility: 'public',
        },
        orderBy: {
          field: 'name',
          direction: 'desc',
        },
        page: 2,
        pageSize: 10,
      });
      const user: User = userBuilder();
      queryBus.execute.mockResolvedValue({
        data: [],
        total: 0,
        page: 2,
        pageSize: 10,
        filters: null,
        orderBy: null,
      });

      await controller.search(queryDto, user);

      expect(queryBus.execute).toHaveBeenCalledWith(
        new SearchQueryImpl(user.id, expect.objectContaining({
          query: 'jazz',
          filters: expect.objectContaining({ categories: ['artist'] }),
          orderBy: expect.objectContaining({ field: 'name', direction: 'desc' }),
          page: 2,
          pageSize: 10,
        })),
      );
    });

    it('should return the result from queryBus.execute', async () => {
      const queryDto = createMock<SearchQueryRequestDto>({
        query: 'electronic',
      });
      const user: User = userBuilder();
      const expectedResult = {
        data: [
          { id: 'artist-1', name: 'Daft Punk', type: 'artist', visibility: 'public', score: 0.9 },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        filters: null,
        orderBy: null,
      };
      queryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.search(queryDto, user);

      expect(result).toBe(expectedResult);
    });
  });
});
