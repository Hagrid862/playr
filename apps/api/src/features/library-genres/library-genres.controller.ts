import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiErrorResponseDto } from '@/common/dto/api-error.response.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import * as contracts from '@repo/contracts';
import { CreateLibraryGenreCommand } from './commands/impl/create-library-genre.command';
import { DeleteLibraryGenreCommand } from './commands/impl/delete-library-genre.command';
import { UpdateLibraryGenreCommand } from './commands/impl/update-library-genre.command';
import { CreateLibraryGenreRequestDto } from './dto/request/create-library-genre.request.dto';
import { GetLibraryGenresRequestDto } from './dto/request/get-library-genres.request.dto';
import { UpdateLibraryGenreRequestDto } from './dto/request/update-library-genre.request.dto';
import { CreateLibraryGenreResponseDto } from './dto/response/create-library-genre.response.dto';
import { DeleteLibraryGenreResponseDto } from './dto/response/delete-library-genre.response.dto';
import { GetLibraryGenreResponseDto } from './dto/response/get-library-genre.response.dto';
import { GetLibraryGenresResponseDto } from './dto/response/get-library-genres.response.dto';
import { UpdateLibraryGenreResponseDto } from './dto/response/update-library-genre.response.dto';
import { GetLibraryGenreQuery } from './queries/impl/get-library-genre.query';
import { GetLibraryGenresQuery } from './queries/impl/get-library-genres.query';

@ApiTags('Library Genres')
@UseGuards(JwtAuthGuard)
@Controller('library/genres')
export class LibraryGenresController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List genres available to the library (system + custom)' })
  @ApiResponse({
    status: 200,
    description: 'Genres retrieved successfully',
    type: GetLibraryGenresResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  async getGenres(
    @CurrentUser('id') userId: string,
    @Query() query: GetLibraryGenresRequestDto,
  ): Promise<contracts.GetLibraryGenresResponse['data']> {
    return this.queryBus.execute(
      new GetLibraryGenresQuery(userId, query.page, query.limit, query.query, query.kind),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single genre (system or in your library)' })
  @ApiResponse({
    status: 200,
    description: 'Genre retrieved successfully',
    type: GetLibraryGenreResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Genre not found',
    type: ApiErrorResponseDto,
  })
  async getGenre(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<contracts.GetLibraryGenreResponse['data']> {
    return this.queryBus.execute(new GetLibraryGenreQuery(userId, id));
  }

  @Post()
  @ApiOperation({ summary: 'Create a custom genre in your library' })
  @ApiResponse({
    status: 201,
    description: 'Genre created successfully',
    type: CreateLibraryGenreResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict',
    type: ApiErrorResponseDto,
  })
  async createGenre(
    @Body() body: CreateLibraryGenreRequestDto,
    @CurrentUser('id') userId: string,
  ): Promise<contracts.ZodGenre> {
    return this.commandBus.execute(new CreateLibraryGenreCommand(body, userId));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a custom genre in your library' })
  @ApiResponse({
    status: 200,
    description: 'Genre updated successfully',
    type: UpdateLibraryGenreResponseDto,
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
    status: 404,
    description: 'Genre not found',
    type: ApiErrorResponseDto,
  })
  async updateGenre(
    @Param('id') id: string,
    @Body() body: UpdateLibraryGenreRequestDto,
    @CurrentUser('id') userId: string,
  ): Promise<contracts.ZodGenre> {
    return this.commandBus.execute(new UpdateLibraryGenreCommand(id, body, userId));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a custom genre from your library' })
  @ApiResponse({
    status: 200,
    description: 'Genre deleted successfully',
    type: DeleteLibraryGenreResponseDto,
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
    status: 404,
    description: 'Genre not found',
    type: ApiErrorResponseDto,
  })
  async deleteGenre(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<contracts.ZodDeletedGenre> {
    return this.commandBus.execute(new DeleteLibraryGenreCommand(id, userId));
  }
}
