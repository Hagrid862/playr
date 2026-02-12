import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiErrorResponseDto } from '@/common/dto/api-error.response.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodAlbum } from '@repo/contracts';
import { CreateAlbumCommand } from './commands/impl/create-album.command';
import { CreateAlbumRequestDto } from './dto/create-album.request.dto';
import { CreateAlbumResponseDto } from './dto/create-album.response.dto';

@ApiTags('Albums')
@Controller('albums')
export class AlbumsController {
  constructor(private readonly commandBus: CommandBus) {}

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
}
