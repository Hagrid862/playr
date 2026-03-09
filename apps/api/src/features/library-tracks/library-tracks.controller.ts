import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CheckTrackAccess } from '@/common/decorators/check-track-access.decorator';
import { ApiErrorResponseDto } from '@/common/dto/api-error.response.dto';
import { TrackAccessGuard } from '@/shared/guards/track-access.guard';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateLibraryTrackCommand } from './commands/impl/create-library-track.command';
import { DeleteLibraryTrackCommand } from './commands/impl/delete-library-track.command';
import { UpdateLibraryTrackCommand } from './commands/impl/update-library-track.command';
import { CreateLibraryTrackRequestDto } from './dto/request/create-library-track.request.dto';
import { GetLibraryTracksRequestDto } from './dto/request/get-library-tracks.request.dto';
import { UpdateLibraryTrackRequestDto } from './dto/request/update-library-track.request.dto';
import { CreateLibraryTrackResponseDto } from './dto/response/create-library-track.response.dto';
import { DeleteLibraryTrackResponseDto } from './dto/response/delete-library-track.response.dto';
import { GetLibraryTrackResponseDto } from './dto/response/get-library-track.response.dto';
import { GetLibraryTracksResponseDto } from './dto/response/get-library-tracks.response.dto';
import { UpdateLibraryTrackResponseDto } from './dto/response/update-library-track.response.dto';
import { UploadTrackAudioResponseDto } from './dto/response/upload-track-audio.response.dto';
import { GetLibraryTrackQuery } from './queries/impl/get-library-track.query';
import { GetLibraryTracksQuery } from './queries/impl/get-library-tracks.query';
import { UploadTrackAudioCommand } from './commands/impl/upload-track-audio.command';

@ApiTags('Library Tracks')
@Controller('library/tracks')
export class LibraryTracksController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all library tracks' })
  @ApiResponse({
    status: 200,
    description: 'Library tracks retrieved successfully',
    type: GetLibraryTracksResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  getTracks(@CurrentUser('id') userId: string, @Query() query: GetLibraryTracksRequestDto) {
    return this.queryBus.execute(
      new GetLibraryTracksQuery(userId, query.page, query.limit, query.albumId),
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new track in private library' })
  @ApiResponse({
    status: 201,
    description: 'Track created successfully',
    type: CreateLibraryTrackResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  async createTrack(@Body() body: CreateLibraryTrackRequestDto, @CurrentUser('id') userId: string) {
    return this.commandBus.execute(new CreateLibraryTrackCommand(body, userId));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, TrackAccessGuard)
  @CheckTrackAccess('id')
  @ApiOperation({ summary: 'Get track details' })
  @ApiResponse({
    status: 200,
    description: 'Track details retrieved successfully',
    type: GetLibraryTrackResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Track not found',
    type: ApiErrorResponseDto,
  })
  async getTrack(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.queryBus.execute(new GetLibraryTrackQuery(id, userId));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, TrackAccessGuard)
  @CheckTrackAccess('id')
  @ApiOperation({ summary: 'Update track details' })
  @ApiResponse({
    status: 200,
    description: 'Track details updated successfully',
    type: UpdateLibraryTrackResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Track not found',
    type: ApiErrorResponseDto,
  })
  async updateTrack(
    @Param('id') id: string,
    @Body() body: UpdateLibraryTrackRequestDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.commandBus.execute(new UpdateLibraryTrackCommand(id, body, userId));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, TrackAccessGuard)
  @CheckTrackAccess('id')
  @ApiOperation({ summary: 'Delete a track from library' })
  @ApiResponse({
    status: 200,
    description: 'Track deleted successfully',
    type: DeleteLibraryTrackResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Track not found',
    type: ApiErrorResponseDto,
  })
  async deleteTrack(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.commandBus.execute(new DeleteLibraryTrackCommand(id, userId));
  }

  @Post(':id/audio')
  @UseGuards(JwtAuthGuard, TrackAccessGuard)
  @CheckTrackAccess('id')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload audio for a track' })
  @ApiResponse({
    status: 201,
    description: 'Audio file uploaded and processing started',
    type: UploadTrackAudioResponseDto,
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid file format or size',
    type: ApiErrorResponseDto,
  })
  async uploadAudio(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 100 * 1024 * 1024 }) // 100MB
        .addFileTypeValidator({
          fileType:
            /(audio\/mpeg|audio\/wav|audio\/flac|audio\/ogg|audio\/aac|audio\/mp4|audio\/x-wav|audio\/x-flac)/,
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
  ) {
    return this.commandBus.execute(new UploadTrackAudioCommand(id, userId, file));
  }
}
