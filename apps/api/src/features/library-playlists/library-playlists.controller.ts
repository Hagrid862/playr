import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiErrorResponseDto } from '@/common/dto/api-error.response.dto';
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
import { ZodImage } from '@repo/contracts';
import { AddPlaylistTrackCommand } from './commands/impl/add-playlist-track.command';
import { CreateLibraryPlaylistCommand } from './commands/impl/create-library-playlist.command';
import { DeleteLibraryPlaylistCoverCommand } from './commands/impl/delete-library-playlist-cover.command';
import { DeleteLibraryPlaylistCommand } from './commands/impl/delete-library-playlist.command';
import { RemovePlaylistTrackCommand } from './commands/impl/remove-playlist-track.command';
import { UpdateLibraryPlaylistCommand } from './commands/impl/update-library-playlist.command';
import { UploadLibraryPlaylistCoverCommand } from './commands/impl/upload-library-playlist-cover.command';
import { AddPlaylistTrackRequestDto } from './dto/request/add-playlist-track.request.dto';
import { CreateLibraryPlaylistRequestDto } from './dto/request/create-library-playlist.request.dto';
import { GetLibraryPlaylistDetailRequestDto } from './dto/request/get-library-playlist-detail.request.dto';
import { UpdateLibraryPlaylistRequestDto } from './dto/request/update-library-playlist.request.dto';
import {
  AddPlaylistTrackResponseDto,
  CreateLibraryPlaylistResponseDto,
  DeleteLibraryPlaylistCoverResponseDto,
  DeleteLibraryPlaylistResponseDto,
  GetLibraryPlaylistDetailResponseDto,
  GetLibraryPlaylistsResponseDto,
  RemovePlaylistTrackResponseDto,
  UpdateLibraryPlaylistResponseDto,
  UploadLibraryPlaylistCoverResponseDto,
} from './dto/response/library-playlists.response.dto';
import { GetLibraryPlaylistDetailQuery } from './queries/impl/get-library-playlist-detail.query';
import { GetLibraryPlaylistsQuery } from './queries/impl/get-library-playlists.query';

@ApiTags('Library Playlists')
@Controller('library/playlists')
export class LibraryPlaylistsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List library playlists' })
  @ApiResponse({ status: 200, type: GetLibraryPlaylistsResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  list(@CurrentUser('id') userId: string) {
    return this.queryBus.execute(new GetLibraryPlaylistsQuery(userId));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create user playlist' })
  @ApiResponse({ status: 201, type: CreateLibraryPlaylistResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  create(@CurrentUser('id') userId: string, @Body() body: CreateLibraryPlaylistRequestDto) {
    return this.commandBus.execute(new CreateLibraryPlaylistCommand(body, userId));
  }

  @Post(':id/cover')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload playlist cover image' })
  @ApiResponse({ status: 201, type: UploadLibraryPlaylistCoverResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  async uploadCover(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ): Promise<ZodImage> {
    return this.commandBus.execute(
      new UploadLibraryPlaylistCoverCommand(id, file.buffer, file.mimetype, userId),
    );
  }

  @Delete(':id/cover')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove playlist cover image' })
  @ApiResponse({ status: 200, type: DeleteLibraryPlaylistCoverResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  removeCover(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.commandBus.execute(new DeleteLibraryPlaylistCoverCommand(id, userId));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Playlist detail with tracks' })
  @ApiResponse({ status: 200, type: GetLibraryPlaylistDetailResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  detail(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query() query: GetLibraryPlaylistDetailRequestDto,
  ) {
    return this.queryBus.execute(
      new GetLibraryPlaylistDetailQuery(userId, id, query.page, query.limit),
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Rename playlist' })
  @ApiResponse({ status: 200, type: UpdateLibraryPlaylistResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: UpdateLibraryPlaylistRequestDto,
  ) {
    return this.commandBus.execute(new UpdateLibraryPlaylistCommand(id, body, userId));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Soft-delete user playlist' })
  @ApiResponse({ status: 200, type: DeleteLibraryPlaylistResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.commandBus.execute(new DeleteLibraryPlaylistCommand(id, userId));
  }

  @Post(':id/tracks')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Add track to playlist' })
  @ApiResponse({ status: 201, type: AddPlaylistTrackResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  addTrack(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: AddPlaylistTrackRequestDto,
  ) {
    return this.commandBus.execute(new AddPlaylistTrackCommand(id, body, userId));
  }

  @Delete(':id/tracks/:trackId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove track from playlist' })
  @ApiResponse({ status: 200, type: RemovePlaylistTrackResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  removeTrack(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('trackId') trackId: string,
  ) {
    return this.commandBus.execute(new RemovePlaylistTrackCommand(id, trackId, userId));
  }
}
