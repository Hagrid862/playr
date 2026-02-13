import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiErrorResponseDto } from '@/common/dto/api-error.response.dto';
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CreateLibraryCommand } from './commands/impl/create-library.command';
import { CreateLibraryResponseDto } from './dto/create-library.response.dto';
import { GetLibraryResponseDto } from './dto/get-library.response.dto';
import { GetLibraryQuery } from './queries/impl/get-library.query';

@ApiTags('Library')
@Controller('library')
export class LibraryController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new private library' })
  @ApiResponse({
    status: 201,
    description: 'Library created successfully',
    type: CreateLibraryResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Library already exists',
    type: ApiErrorResponseDto,
  })
  create(@CurrentUser('id') userId: string) {
    return this.commandBus.execute(new CreateLibraryCommand(userId));
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user private library' })
  @ApiResponse({
    status: 200,
    description: 'Library retrieved successfully',
    type: GetLibraryResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
    type: ApiErrorResponseDto,
  })
  getLibrary(@CurrentUser('id') userId: string) {
    return this.queryBus.execute(new GetLibraryQuery(userId));
  }
}
