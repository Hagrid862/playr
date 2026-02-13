import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiErrorResponseDto } from '@/common/dto/api-error.response.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetLibraryArtistsRequestDto } from '../../library-artists/dto/request/get-library-artists.request.dto';
import { GetLibraryArtistResponseDto } from '../../library-artists/dto/response/get-library-artist.response.dto';
import { GetLibraryArtistsResponseDto } from '../../library-artists/dto/response/get-library-artists.response.dto';
import { GetLibraryArtistQuery } from '../../library-artists/queries/impl/get-library-artist.query';
import { GetLibraryArtistsQuery } from '../../library-artists/queries/impl/get-library-artists.query';
import { CreateLibraryCommand } from '../commands/impl/create-library.command';
import { CreateLibraryResponseDto } from '../dto/create-library.response.dto';
import { GetLibraryAlbumsRequestDto } from '../dto/get-library-albums.request.dto';
import { GetLibraryAlbumsResponseDto } from '../dto/get-library-albums.response.dto';
import { GetLibraryResponseDto } from '../dto/get-library.response.dto';
import { GetLibraryAlbumsQuery } from '../queries/impl/get-library-albums.query';
import { GetLibraryQuery } from '../queries/impl/get-library.query';

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

  @Get('artists')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all library artists' })
  @ApiResponse({
    status: 200,
    description: 'Library artists retrieved successfully',
    type: GetLibraryArtistsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  getArtists(@CurrentUser('id') userId: string, @Query() query: GetLibraryArtistsRequestDto) {
    return this.queryBus.execute(new GetLibraryArtistsQuery(userId, query.page, query.limit));
  }

  @Get('artists/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a single library artist' })
  @ApiResponse({
    status: 200,
    description: 'Library artist retrieved successfully',
    type: GetLibraryArtistResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Artist not found',
    type: ApiErrorResponseDto,
  })
  getArtist(@CurrentUser('id') userId: string, @Param('id') artistId: string) {
    return this.queryBus.execute(new GetLibraryArtistQuery(userId, artistId));
  }

  @Get('albums')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all library albums' })
  @ApiResponse({
    status: 200,
    description: 'Library albums retrieved successfully',
    type: GetLibraryAlbumsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  getAlbums(@CurrentUser('id') userId: string, @Query() query: GetLibraryAlbumsRequestDto) {
    return this.queryBus.execute(new GetLibraryAlbumsQuery(userId, query.page, query.limit));
  }
}
