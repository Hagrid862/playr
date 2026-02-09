import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ZodArtist } from '@repo/contracts';
import { CreateArtistCommand } from './commands/impl/create-artist.command';
import { CreateArtistRequestDto } from './dto/create-artist.request.dto';
import { GetPrivateArtistsResponseDto } from './dto/get-private-artists.response.dto';
import { GetPrivateArtistsQuery } from './queries/impl/get-private-artists.query';

@Controller('artists')
export class ArtistsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new artist in private library' })
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
  async getPrivateArtists(@CurrentUser('id') userId: string): Promise<ZodArtist[]> {
    const query = new GetPrivateArtistsQuery(userId);
    return this.queryBus.execute(query);
  }
}
