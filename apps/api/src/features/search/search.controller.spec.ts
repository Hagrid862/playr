import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SearchSuggestionsQueryRequestDto } from './dto/search-suggestions-query.request.dto';
import { LibrarySearchSuggestionsQueryRequestDto } from './dto/library-search-suggestions-query.request.dto';
import { SearchSuggestionsQuery } from './queries/impl/search-suggestions.query';
import { LibrarySearchSuggestionsQuery } from './queries/impl/library-search-suggestions.query';
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
      const user: User = { id: 'user-123' } as User;
      const expectedResult = [
        { id: 'artist-1', name: 'Test Artist', type: 'artist', visibility: 'public' },
      ];
      queryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.searchSuggestions(queryDto, user);

      expect(queryBus.execute).toHaveBeenCalledWith(new SearchSuggestionsQuery('test', 'user-123'));
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
      const user: User = { id: 'user-456' } as User;
      queryBus.execute.mockResolvedValue([]);

      await controller.searchSuggestions(queryDto, user);

      expect(queryBus.execute).toHaveBeenCalledWith(
        new SearchSuggestionsQuery('rock band', 'user-456'),
      );
    });
  });

  describe('searchLibrarySuggestions', () => {
    it('should execute LibrarySearchSuggestionsQuery with userId, query, and categories', async () => {
      const queryDto = createMock<LibrarySearchSuggestionsQueryRequestDto>({
        query: 'jazz',
        categories: ['artist', 'album'],
      });
      const user: User = { id: 'user-789' } as User;
      const expectedResult = [
        { id: 'artist-1', name: 'Jazz Artist', type: 'artist', visibility: 'private' },
      ];
      queryBus.execute.mockResolvedValue(expectedResult);

      const result = await controller.searchLibrarySuggestions(queryDto, user);

      expect(queryBus.execute).toHaveBeenCalledWith(
        new LibrarySearchSuggestionsQuery('user-789', 'jazz', ['artist', 'album']),
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

    it('should execute LibrarySearchSuggestionsQuery with all category types', async () => {
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
});
