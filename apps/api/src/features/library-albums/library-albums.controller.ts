import { CheckAlbumAccess } from '@/common/decorators/check-album-access.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiErrorResponseDto } from '@/common/dto/api-error.response.dto';
import { AlbumAccessGuard } from '@/shared/guards/album-access.guard';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodAlbum, ZodImage } from '@repo/contracts';
import { CreateLibraryAlbumCommand } from './commands/impl/create-library-album.command';
import { DeleteLibraryAlbumCommand } from './commands/impl/delete-library-album.command';
import { UpdateLibraryAlbumCommand } from './commands/impl/update-library-album.command';
import { UploadLibraryAlbumCoverCommand } from './commands/impl/upload-library-album-cover.command';
import { CreateLibraryAlbumRequestDto } from './dto/request/create-library-album.request.dto';
import { GetLibraryAlbumsRequestDto } from './dto/request/get-library-albums.request.dto';
import { UpdateLibraryAlbumRequestDto } from './dto/request/update-library-album.request.dto';
import { CreateLibraryAlbumResponseDto } from './dto/response/create-library-album.response.dto';
import { GetLibraryAlbumTracksResponseDto } from './dto/response/get-library-album-tracks.response.dto';
import { GetLibraryAlbumResponseDto } from './dto/response/get-library-album.response.dto';
import { GetLibraryAlbumsResponseDto } from './dto/response/get-library-albums.response.dto';
import { UpdateLibraryAlbumResponseDto } from './dto/response/update-library-album.response.dto';
import { UploadLibraryAlbumCoverResponseDto } from './dto/response/upload-library-album-cover.response.dto';
import { GetLibraryAlbumTracksQuery } from './queries/impl/get-library-album-tracks.query';
import { GetLibraryAlbumQuery } from './queries/impl/get-library-album.query';
import { GetLibraryAlbumsQuery } from './queries/impl/get-library-albums.query';

@ApiTags('Library Albums')
@Controller('library/albums')
export class AlbumsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) { }

  @Get()
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

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new album in private library' })
  @ApiResponse({
    status: 201,
    description: 'Album created successfully',
    type: CreateLibraryAlbumResponseDto,
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
    @Body() body: CreateLibraryAlbumRequestDto,
    @CurrentUser('id') userId: string,
  ): Promise<ZodAlbum> {
    const command = new CreateLibraryAlbumCommand(body, userId);
    return this.commandBus.execute(command);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AlbumAccessGuard)
  @CheckAlbumAccess('id')
  @ApiOperation({ summary: 'Get album details with songs' })
  @ApiResponse({
    status: 200,
    description: 'Album details retrieved successfully',
    type: GetLibraryAlbumResponseDto,
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
    const query = new GetLibraryAlbumQuery(id, userId);
    return this.queryBus.execute(query);
  }

  @Get(':id/tracks')
  @UseGuards(JwtAuthGuard, AlbumAccessGuard)
  @CheckAlbumAccess('id')
  @ApiOperation({ summary: 'Get album tracks' })
  @ApiResponse({
    status: 200,
    description: 'Album tracks retrieved successfully',
    type: GetLibraryAlbumTracksResponseDto,
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
  async getAlbumTracks(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.queryBus.execute(new GetLibraryAlbumTracksQuery(userId, id));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update private album details' })
  @ApiResponse({
    status: 200,
    description: 'Album details updated successfully',
    type: UpdateLibraryAlbumResponseDto,
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
    @Body() body: UpdateLibraryAlbumRequestDto,
    @CurrentUser('id') userId: string,
  ): Promise<ZodAlbum> {
    const command = new UpdateLibraryAlbumCommand(id, body, userId);
    return this.commandBus.execute(command);
  }

  @Post(':id/cover')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Upload album cover' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiResponse({
    status: 201,
    description: 'Cover uploaded successfully',
    type: UploadLibraryAlbumCoverResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (invalid file)',
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
  async uploadCover(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ): Promise<ZodImage> {
    const command = new UploadLibraryAlbumCoverCommand(id, file.buffer, file.mimetype, userId);
    return this.commandBus.execute(command);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a private album' })
  @ApiResponse({
    status: 200,
    description: 'Album deleted successfully',
    type: GetLibraryAlbumResponseDto,
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
  async deleteAlbum(@Param('id') id: string, @CurrentUser('id') userId: string): Promise<ZodAlbum> {
    const command = new DeleteLibraryAlbumCommand(id, userId);
    return this.commandBus.execute(command);
  }
}
