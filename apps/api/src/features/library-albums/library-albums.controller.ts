import { CheckAlbumAccess } from '@/common/decorators/check-album-access.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiErrorResponseDto } from '@/common/dto/api-error.response.dto';
import { AlbumAccessGuard } from '@/shared/guards/album-access.guard';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import {
  BadRequestException,
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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodAlbum, ZodImage } from '@repo/contracts';
import { BulkCreateLibraryTracksCommand } from '../library-tracks/commands/impl/bulk-create-library-tracks.command';
import { BulkUploadTrackAudioCommand } from '../library-tracks/commands/impl/bulk-upload-track-audio.command';
import { CreateLibraryAlbumCommand } from './commands/impl/create-library-album.command';
import { DeleteLibraryAlbumCoverCommand } from './commands/impl/delete-library-album-cover.command';
import { DeleteLibraryAlbumCommand } from './commands/impl/delete-library-album.command';
import { UpdateLibraryAlbumCommand } from './commands/impl/update-library-album.command';
import { UploadLibraryAlbumCoverCommand } from './commands/impl/upload-library-album-cover.command';
import { BulkCreateLibraryTracksRequestDto } from './dto/request/bulk-create-library-tracks.request.dto';
import { CreateLibraryAlbumRequestDto } from './dto/request/create-library-album.request.dto';
import { GetLibraryAlbumsRequestDto } from './dto/request/get-library-albums.request.dto';
import { UpdateLibraryAlbumRequestDto } from './dto/request/update-library-album.request.dto';
import { BulkCreateLibraryTracksResponseDto } from './dto/response/bulk-create-library-tracks.response.dto';
import { BulkUploadTrackAudioResponseDto } from './dto/response/bulk-upload-track-audio.response.dto';
import { CreateLibraryAlbumResponseDto } from './dto/response/create-library-album.response.dto';
import { DeleteLibraryAlbumCoverResponseDto } from './dto/response/delete-library-album-cover.response.dto';
import { DeleteLibraryAlbumResponseDto } from './dto/response/delete-library-album.response.dto';
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
  ) {}

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

  @Post(':id/tracks/bulk')
  @UseGuards(JwtAuthGuard, AlbumAccessGuard)
  @CheckAlbumAccess('id')
  @ApiOperation({ summary: 'Bulk create tracks in album' })
  @ApiResponse({
    status: 201,
    description: 'Tracks created successfully',
    type: BulkCreateLibraryTracksResponseDto,
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
  @ApiResponse({
    status: 412,
    description: 'User library not found',
    type: ApiErrorResponseDto,
  })
  async bulkCreateTracks(
    @Param('id') albumId: string,
    @Body() body: BulkCreateLibraryTracksRequestDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.commandBus.execute(new BulkCreateLibraryTracksCommand(albumId, body, userId));
  }

  @Post(':id/tracks/bulk/audio')
  @UseGuards(JwtAuthGuard, AlbumAccessGuard)
  @CheckAlbumAccess('id')
  @UseInterceptors(
    FilesInterceptor('files', 50, {
      limits: { fileSize: 100 * 1024 * 1024 }, // 100MB per file
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Bulk upload audio for tracks' })
  @ApiResponse({
    status: 201,
    description: 'Audio files uploaded and processing started',
    type: BulkUploadTrackAudioResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request (trackIds/files mismatch or invalid)',
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
    description: 'Album or track not found',
    type: ApiErrorResponseDto,
  })
  async bulkUploadTrackAudio(
    @Param('id') albumId: string,
    @Body('trackIds') trackIdsRaw: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser('id') userId: string,
  ) {
    let trackIds: string[];
    try {
      const parsed = JSON.parse(trackIdsRaw ?? '[]');
      if (!Array.isArray(parsed)) {
        throw new BadRequestException('trackIds must be a JSON array');
      }
      trackIds = parsed;
    } catch {
      throw new BadRequestException('trackIds must be a valid JSON array of track IDs');
    }

    return this.commandBus.execute(
      new BulkUploadTrackAudioCommand(albumId, trackIds, files ?? [], userId),
    );
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
    type: DeleteLibraryAlbumResponseDto,
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

  @Delete(':id/cover')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete album cover from library album' })
  @ApiResponse({
    status: 200,
    description: 'Cover deleted successfully',
    type: DeleteLibraryAlbumCoverResponseDto,
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
  async deleteCover(@Param('id') id: string, @CurrentUser('id') userId: string): Promise<ZodAlbum> {
    const command = new DeleteLibraryAlbumCoverCommand(id, userId);
    return this.commandBus.execute(command);
  }
}
