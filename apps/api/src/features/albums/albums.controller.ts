import { CheckAlbumAccess } from '@/common/decorators/check-album-access.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiErrorResponseDto } from '@/common/dto/api-error.response.dto';
import { AlbumAccessGuard } from '@/shared/guards/album-access.guard';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodAlbum } from '@repo/contracts';
import { CreateAlbumCommand } from './commands/impl/create-album.command';
import { UpdateAlbumCommand } from './commands/impl/update-album.command';
import { CreateAlbumRequestDto } from './dto/create-album.request.dto';
import { CreateAlbumResponseDto } from './dto/create-album.response.dto';
import { GetAlbumResponseDto } from './dto/get-album.response.dto';
import { UpdateAlbumRequestDto } from './dto/update-album.request.dto';
import { UpdateAlbumResponseDto } from './dto/update-album.response.dto';
import { GetAlbumQuery } from './queries/impl/get-album.query';

@ApiTags('Albums')
@Controller('albums')
export class AlbumsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new album in private library' })
  @ApiResponse({
    status: 201,
    description: 'Album created successfully',
    type: CreateAlbumResponseDto,
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
    description: 'Album name is already taken',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 412,
    description: 'User private profile or library not found',
    type: ApiErrorResponseDto,
  })
  async createAlbum(
    @Body() body: CreateAlbumRequestDto,
    @CurrentUser('id') userId: string,
  ): Promise<ZodAlbum> {
    const command = new CreateAlbumCommand(body, userId);
    return this.commandBus.execute(command);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update private album details' })
  @ApiResponse({
    status: 200,
    description: 'Album details updated successfully',
    type: UpdateAlbumResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
    type: ApiErrorResponseDto,
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
    description: 'Album not found',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Album name is already taken',
    type: ApiErrorResponseDto,
  })
  async updateAlbum(
    @Param('id') id: string,
    @Body() body: UpdateAlbumRequestDto,
    @CurrentUser('id') userId: string,
  ): Promise<ZodAlbum> {
    const command = new UpdateAlbumCommand(id, body, userId);
    return this.commandBus.execute(command);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AlbumAccessGuard)
  @CheckAlbumAccess('id')
  @ApiOperation({ summary: 'Get album details with songs' })
  @ApiResponse({
    status: 200,
    description: 'Album details retrieved successfully',
    type: GetAlbumResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Album not found',
    type: ApiErrorResponseDto,
  })
  async getAlbum(@Param('id') id: string, @CurrentUser('id') userId: string): Promise<ZodAlbum> {
    const query = new GetAlbumQuery(id, userId);
    return this.queryBus.execute(query);
  }
}
