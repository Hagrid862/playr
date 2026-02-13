import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiErrorResponseDto } from '@/common/dto/api-error.response.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodArtist, ZodImage } from '@repo/contracts';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CreateArtistCommand } from './commands/impl/create-artist.command';
import { DeleteArtistCommand } from './commands/impl/delete-artist.command';
import { UpdateArtistCommand } from './commands/impl/update-artist.command';
import { UploadArtistAvatarCommand } from './commands/impl/upload-artist-avatar.command';
import { UploadArtistBannerCommand } from './commands/impl/upload-artist-banner.command';
import { CreateLibraryArtistRequestDto } from './dto/request/create-library-artist.request.dto';
import { GetLibraryArtistsRequestDto } from './dto/request/get-library-artists.request.dto';
import { UpdateLibraryArtistRequestDto } from './dto/request/update-library-artist.request.dto';
import { UploadLibraryArtistAvatarRequestDto } from './dto/request/upload-library-artist-avatar.request.dto';
import { UploadLibraryArtistBannerRequestDto } from './dto/request/upload-library-artist-banner.request.dto';
import { CreateLibraryArtistResponseDto } from './dto/response/create-library-artist.response.dto';
import { DeleteLibraryArtistResponseDto } from './dto/response/delete-library-artist.response.dto';
import { GetLibraryArtistResponseDto } from './dto/response/get-library-artist.response.dto';
import { GetLibraryArtistsResponseDto } from './dto/response/get-library-artists.response.dto';
import { UpdateLibraryArtistResponseDto } from './dto/response/update-library-artist.response.dto';
import { UploadLibraryArtistAvatarResponseDto } from './dto/response/upload-library-artist-avatar.response.dto';
import { UploadLibraryArtistBannerResponseDto } from './dto/response/upload-library-artist-banner.response.dto';
import { GetLibraryArtistQuery } from './queries/impl/get-library-artist.query';
import { GetLibraryArtistsQuery } from './queries/impl/get-library-artists.query';

@ApiTags('Library Artists')
@Controller('library/artists')
export class LibraryArtistsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new artist in private library' })
  @ApiResponse({
    status: 201,
    description: 'Artist created successfully',
    type: CreateLibraryArtistResponseDto,
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
    description: 'Artist name is already taken',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 412,
    description: 'User private profile not found',
    type: ApiErrorResponseDto,
  })
  async createArtist(
    @Body() request: CreateLibraryArtistRequestDto,
    @CurrentUser('id') userId: string,
  ): Promise<ZodArtist> {
    const command = new CreateArtistCommand(request, userId);
    return this.commandBus.execute(command);
  }

  @Get('')
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
  getLibraryArtists(
    @CurrentUser('id') userId: string,
    @Query() query: GetLibraryArtistsRequestDto,
  ) {
    return this.queryBus.execute(new GetLibraryArtistsQuery(userId, query.page, query.limit));
  }

  @Get(':id')
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
  getLibraryArtist(@CurrentUser('id') userId: string, @Param('id') artistId: string) {
    return this.queryBus.execute(new GetLibraryArtistQuery(userId, artistId));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update private artist detail' })
  @ApiResponse({
    status: 200,
    description: 'Artist details updated successfully',
    type: UpdateLibraryArtistResponseDto,
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
    description: 'Artist not found',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Artist name is already taken',
    type: ApiErrorResponseDto,
  })
  async updateArtist(
    @Param('id') id: string,
    @Body() request: UpdateLibraryArtistRequestDto,
    @CurrentUser('id') userId: string,
  ): Promise<ZodArtist> {
    const command = new UpdateArtistCommand(id, request, userId);
    return this.commandBus.execute(command);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a private artist' })
  @ApiResponse({
    status: 200,
    description: 'Artist deleted successfully',
    type: DeleteLibraryArtistResponseDto,
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
    description: 'Artist not found',
    type: ApiErrorResponseDto,
  })
  async deleteArtist(@Param('id') id: string, @CurrentUser('id') userId: string): Promise<void> {
    const command = new DeleteArtistCommand(id, userId);
    return this.commandBus.execute(command);
  }

  @Post(':id/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload artist avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: UploadLibraryArtistAvatarRequestDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Avatar uploaded successfully',
    type: UploadLibraryArtistAvatarResponseDto,
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
    description: 'Artist not found',
    type: ApiErrorResponseDto,
  })
  async uploadArtistAvatar(
    @Param('id') id: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string },
    @CurrentUser('id') userId: string,
  ): Promise<ZodImage> {
    const command = new UploadArtistAvatarCommand(id, file.buffer, file.mimetype, userId);
    return this.commandBus.execute(command);
  }

  @Post(':id/banner')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload artist banner' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: UploadLibraryArtistBannerRequestDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Banner uploaded successfully',
    type: UploadLibraryArtistBannerResponseDto,
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
    description: 'Artist not found',
    type: ApiErrorResponseDto,
  })
  async uploadArtistBanner(
    @Param('id') id: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string },
    @CurrentUser('id') userId: string,
  ): Promise<ZodImage> {
    const command = new UploadArtistBannerCommand(id, file.buffer, file.mimetype, userId);
    return this.commandBus.execute(command);
  }
}
