import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SearchQueryRequestDto } from './dto/search-query.request.dto';
import { LiveSearchResultsResponseDto } from './dto/live-search-results.response.dto';
import { LiveSearchQuery } from './queries/impl/live-search.query';
import { JwtAuthGuardForSearch } from '@/shared/guards/jwt-auth-for-search.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@repo/db';
import { ApiErrorResponseDto } from '@/common/dto/api-error.response.dto';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('suggestions')
  @UseGuards(JwtAuthGuardForSearch)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Perform a fuzzy live search' })
  @ApiResponse({
    status: 200,
    description: 'Fuzzy search results returned successfully',
    type: LiveSearchResultsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Query is too short or invalid',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description:
      'User token is required. Public and community visibilities are not implemented yet',
    type: ApiErrorResponseDto,
  })
  async search(
    @Query() query: SearchQueryRequestDto,
    @CurrentUser() user: User | null,
  ): Promise<LiveSearchResultsResponseDto> {
    return this.queryBus.execute(new LiveSearchQuery(query.query, user?.id));
  }
}
