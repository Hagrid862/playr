import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiErrorResponseDto } from '@/common/dto/api-error.response.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { Controller, Delete, Get, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetListenHistoryRequestDto } from './dto/get-listen-history.request.dto';
import { GetListenHistoryResponseDto } from './dto/get-listen-history.response.dto';
import { GetListenHistoryQuery } from './queries/impl/get-listen-history.query';
import { ClearListenHistoryCommand } from './commands/impl/clear-listen-history.command';

@ApiTags('Listen History')
@Controller('history')
@UseGuards(JwtAuthGuard)
export class ListenHistoryController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get user listening history from database' })
  @ApiResponse({
    status: 200,
    description: 'Listen history retrieved successfully',
    type: GetListenHistoryResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  getHistory(@CurrentUser('id') userId: string, @Query() query: GetListenHistoryRequestDto) {
    return this.queryBus.execute(new GetListenHistoryQuery(userId, query.page, query.limit));
  }

  @Delete()
  @ApiOperation({ summary: 'Clear user listening history' })
  @ApiResponse({
    status: 200,
    description: 'Listen history cleared successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  clearHistory(@CurrentUser('id') userId: string) {
    return this.commandBus.execute(new ClearListenHistoryCommand(userId));
  }
}
