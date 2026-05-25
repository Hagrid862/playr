import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiErrorResponseDto } from '@/common/dto/api-error.response.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PinPlaylistCommand } from './commands/impl/pin-playlist.command';
import { ReorderPlaylistPinsCommand } from './commands/impl/reorder-playlist-pins.command';
import { UnpinPlaylistCommand } from './commands/impl/unpin-playlist.command';
import { PinPlaylistRequestDto } from './dto/request/pin-playlist.request.dto';
import { ReorderPlaylistPinsRequestDto } from './dto/request/reorder-playlist-pins.request.dto';
import {
  GetLibraryPlaylistPinsResponseDto,
  PinPlaylistResponseDto,
  ReorderPlaylistPinsResponseDto,
  UnpinPlaylistResponseDto,
} from './dto/response/library-playlists.response.dto';
import { GetLibraryPlaylistPinsQuery } from './queries/impl/get-library-playlist-pins.query';

@ApiTags('Library Playlist Pins')
@Controller('library/playlist-pins')
export class LibraryPlaylistPinsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List pinned playlists' })
  @ApiResponse({ status: 200, type: GetLibraryPlaylistPinsResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  list(@CurrentUser('id') userId: string) {
    return this.queryBus.execute(new GetLibraryPlaylistPinsQuery(userId));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Pin playlist' })
  @ApiResponse({ status: 201, type: PinPlaylistResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  @ApiResponse({ status: 409, type: ApiErrorResponseDto })
  pin(@CurrentUser('id') userId: string, @Body() body: PinPlaylistRequestDto) {
    return this.commandBus.execute(new PinPlaylistCommand(body, userId));
  }

  @Patch('reorder')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reorder pins' })
  @ApiResponse({ status: 200, type: ReorderPlaylistPinsResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  reorder(@CurrentUser('id') userId: string, @Body() body: ReorderPlaylistPinsRequestDto) {
    return this.commandBus.execute(new ReorderPlaylistPinsCommand(body, userId));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unpin by pin id' })
  @ApiResponse({ status: 200, type: UnpinPlaylistResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  unpin(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.commandBus.execute(new UnpinPlaylistCommand(id, userId));
  }
}
