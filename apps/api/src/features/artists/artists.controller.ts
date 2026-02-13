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
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodAlbum, ZodArtist, ZodImage } from '@repo/contracts';
import { CreateArtistCommand } from './commands/impl/create-artist.command';
import { DeleteArtistCommand } from './commands/impl/delete-artist.command';
import { UpdateArtistCommand } from './commands/impl/update-artist.command';
import { UploadArtistAvatarCommand } from './commands/impl/upload-artist-avatar.command';
import { UploadArtistBannerCommand } from './commands/impl/upload-artist-banner.command';
import { CreateArtistRequestDto } from './dto/create-artist.request.dto';
import { CreateArtistResponseDto } from './dto/create-artist.response.dto';
import { DeleteArtistResponseDto } from './dto/delete-artist.response.dto';
import { GetArtistAlbumsResponseDto } from './dto/get-artist-albums.response.dto';
import { GetPrivateArtistsResponseDto } from './dto/get-private-artists.response.dto';
import { UpdateArtistRequestDto } from './dto/update-artist.request.dto';
import { UpdateArtistResponseDto } from './dto/update-artist.response.dto';
import { UploadArtistAvatarRequestDto } from './dto/upload-artist-avatar.request.dto';
import { UploadArtistAvatarResponseDto } from './dto/upload-artist-avatar.response.dto';
import { UploadArtistBannerRequestDto } from './dto/upload-artist-banner.request.dto';
import { UploadArtistBannerResponseDto } from './dto/upload-artist-banner.response.dto';
import { GetArtistAlbumsQuery } from './queries/impl/get-artist-albums.query';
import { GetPrivateArtistsQuery } from './queries/impl/get-private-artists.query';

@ApiTags('Artists')
@Controller('artists')
export class ArtistsController {
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
    type: CreateArtistResponseDto,
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
    @Body() request: CreateArtistRequestDto,
    @CurrentUser('id') userId: string,
  ): Promise<ZodArtist> {
    const command = new CreateArtistCommand(request, userId);
    return this.commandBus.execute(command);
  }

  @Get('private')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all private artists' })
  @ApiResponse({
    status: 200,
    description: 'Private artists retrieved successfully',
    type: GetPrivateArtistsResponseDto,
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
  async getPrivateArtists(@CurrentUser('id') userId: string): Promise<ZodArtist[]> {
    const query = new GetPrivateArtistsQuery(userId);
    return this.queryBus.execute(query);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update private artist detail' })
  @ApiResponse({
    status: 200,
    description: 'Artist details updated successfully',
    type: UpdateArtistResponseDto,
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
    @Body() request: UpdateArtistRequestDto,
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
    type: DeleteArtistResponseDto,
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
    type: UploadArtistAvatarRequestDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Avatar uploaded successfully',
    type: UploadArtistAvatarResponseDto,
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
    type: UploadArtistBannerRequestDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Banner uploaded successfully',
    type: UploadArtistBannerResponseDto,
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

  @Get(':id/albums')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get artist albums' })
  @ApiResponse({
    status: 200,
    description: 'Artist albums retrieved successfully',
    type: GetArtistAlbumsResponseDto,
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
  async getArtistAlbums(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<ZodAlbum[]> {
    const query = new GetArtistAlbumsQuery(id, userId);
    return this.queryBus.execute(query);
  }
}
