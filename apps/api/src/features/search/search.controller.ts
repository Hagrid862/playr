import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SearchSuggestionsQueryRequestDto } from './dto/search-suggestions-query.request.dto';
import { SearchSuggestionsResultsResponseDto } from './dto/search-suggestions-results.response.dto';
import { LibrarySearchSuggestionsQueryRequestDto } from './dto/library-search-suggestions-query.request.dto';
import { LibrarySearchSuggestionsResultsResponseDto } from './dto/library-search-suggestions-results.response.dto';
import { SearchQueryRequestDto } from './dto/search-query.request.dto';
import { SearchResultsResponseDto } from './dto/search-results.response.dto';
import { LibrarySearchQueryRequestDto } from './dto/library-search-query.request.dto';
import { LibrarySearchResultsResponseDto } from './dto/library-search-results.response.dto';
import { SearchSuggestionsQuery } from './queries/impl/search-suggestions.query';
import { LibrarySearchSuggestionsQuery } from './queries/impl/library-search-suggestions.query';
import { SearchQueryImpl } from './queries/impl/search.query';
import { LibrarySearchQueryImpl } from './queries/impl/library-search.query';
import { JwtAuthGuardForSearch } from '@/shared/guards/jwt-auth-for-search.guard';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { User } from '@repo/db';
import { ApiErrorResponseDto } from '@/common/dto/api-error.response.dto';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('suggestions')
  @UseGuards(JwtAuthGuardForSearch)
  @ApiOperation({ summary: 'Perform a fuzzy search suggestions' })
  @ApiResponse({
    status: 200,
    description: 'Fuzzy search results returned successfully',
    type: SearchSuggestionsResultsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Query is too short or invalid',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description:
      // TODO: Remove this when public and community visibilities are implemented
      'User token is required. Public and community visibilities are not implemented yet',
    type: ApiErrorResponseDto,
  })
  async searchSuggestions(
    @Query() query: SearchSuggestionsQueryRequestDto,
    @CurrentUser() user: User | null,
  ): Promise<SearchSuggestionsResultsResponseDto> {
    return this.queryBus.execute(new SearchSuggestionsQuery(query.query, user?.id));
  }

  @Get('library-suggestions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Perform a fuzzy search suggestions within the user library' })
  @ApiResponse({
    status: 200,
    description: 'Library search results returned successfully',
    type: LibrarySearchSuggestionsResultsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Query is too short or invalid',
    type: ApiErrorResponseDto,
  })
  async searchLibrarySuggestions(
    @Query() query: LibrarySearchSuggestionsQueryRequestDto,
    @CurrentUser() user: User,
  ): Promise<LibrarySearchSuggestionsResultsResponseDto> {
    return this.queryBus.execute(
      new LibrarySearchSuggestionsQuery(user.id, query.query, query.categories),
    );
  }

  @Get('library')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Search within user library across artists, albums, tracks, and playlists with filters and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results returned successfully',
    type: LibrarySearchResultsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Query is too short or invalid',
    type: ApiErrorResponseDto,
  })
  async searchLibrary(
    @Query() query: LibrarySearchQueryRequestDto,
    @CurrentUser() user: User,
  ): Promise<LibrarySearchResultsResponseDto> {
    return this.queryBus.execute(new LibrarySearchQueryImpl(user.id, query));
  }

   @Get()
   @UseGuards(JwtAuthGuardForSearch)
   @ApiBearerAuth()
   @ApiOperation({
     summary:
       'Full-text search across artists, albums, tracks, and playlists with filters and pagination',
   })
   @ApiResponse({
     status: 200,
     description: 'Search results returned successfully',
     type: SearchResultsResponseDto,
   })
   @ApiResponse({
     status: 400,
     description: 'Query is too short or invalid',
     type: ApiErrorResponseDto,
   })
   @ApiResponse({
   status: 401,
   description:
     // TODO: Remove this when public and community visibilities are implemented
     'User token is required. Public and community visibilities are not implemented yet',
     type: ApiErrorResponseDto,
   })
   async search(
     @Query() query: SearchQueryRequestDto,
     @CurrentUser() user: User | null
   ): Promise<SearchResultsResponseDto> {
     return this.queryBus.execute(new SearchQueryImpl(user?.id ?? null, query));
   }
}
