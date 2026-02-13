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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodAlbum, ZodImage } from '@repo/contracts';
import { CreateAlbumCommand } from './commands/impl/create-album.command';
import { DeleteAlbumCommand } from './commands/impl/delete-album.command';
import { UpdateAlbumCommand } from './commands/impl/update-album.command';
import { UploadAlbumCoverCommand } from './commands/impl/upload-album-cover.command';
import { CreateAlbumRequestDto } from './dto/create-album.request.dto';
import { CreateAlbumResponseDto } from './dto/create-album.response.dto';
import { GetAlbumResponseDto } from './dto/get-album.response.dto';
import { UpdateAlbumRequestDto } from './dto/update-album.request.dto';
import { UpdateAlbumResponseDto } from './dto/update-album.response.dto';
import { UploadAlbumCoverResponseDto } from './dto/upload-album-cover.response.dto';
import { GetAlbumQuery } from './queries/impl/get-album.query';

@ApiTags('Library Albums')
@Controller('library/albums')
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

  @Post(':id/cover')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Upload album cover' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiResponse({
    status: 201,
    description: 'Cover uploaded successfully',
    type: UploadAlbumCoverResponseDto,
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
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ): Promise<ZodImage> {
    const command = new UploadAlbumCoverCommand(id, file.buffer, file.mimetype, userId);
    return this.commandBus.execute(command);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a private album' })
  @ApiResponse({
    status: 200,
    description: 'Album deleted successfully',
    type: GetAlbumResponseDto,
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
    const command = new DeleteAlbumCommand(id, userId);
    return this.commandBus.execute(command);
  }
}
