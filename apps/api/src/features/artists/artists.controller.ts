import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiErrorResponseDto } from '@/common/dto/api-error.response.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodArtist } from '@repo/contracts';
import { CreateArtistCommand } from './commands/impl/create-artist.command';
import { DeleteArtistCommand } from './commands/impl/delete-artist.command';
import { UpdateArtistCommand } from './commands/impl/update-artist.command';
import { CreateArtistRequestDto } from './dto/create-artist.request.dto';
import { CreateArtistResponseDto } from './dto/create-artist.response.dto';
import { DeleteArtistResponseDto } from './dto/delete-artist.response.dto';
import { GetPrivateArtistsResponseDto } from './dto/get-private-artists.response.dto';
import { UpdateArtistRequestDto } from './dto/update-artist.request.dto';
import { UpdateArtistResponseDto } from './dto/update-artist.response.dto';
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
  async deleteArtist(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<ZodArtist> {
    const command = new DeleteArtistCommand(id, userId);
    return this.commandBus.execute(command);
  }
}
