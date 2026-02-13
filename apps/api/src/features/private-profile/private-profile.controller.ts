import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiErrorResponseDto } from '@/common/dto/api-error.response.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreatePrivateProfileCommand } from './commands/impl/create-private-profile.command';
import { CreatePrivateProfileResponseDto } from './dto/create-private-profile.response.dto';
import { GetPrivateProfileResponseDto } from './dto/get-private-profile.response.dto';
import { GetPrivateProfileQuery } from './queries/impl/get-private-profile.query';

@ApiTags('Private Profile')
@Controller('private-profile')
export class PrivateProfileController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get private profile' })
  @ApiResponse({
    status: 200,
    description: 'Private profile retrieved successfully',
    type: GetPrivateProfileResponseDto,
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
  getPrivateProfile(@CurrentUser('id') userId: string) {
    return this.queryBus.execute(new GetPrivateProfileQuery(userId));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new private profile' })
  @ApiResponse({
    status: 201,
    description: 'Private profile created successfully',
    type: CreatePrivateProfileResponseDto,
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
    description: 'Private profile already exists',
    type: ApiErrorResponseDto,
  })
  createPrivateProfile(@CurrentUser('id') userId: string) {
    return this.commandBus.execute(new CreatePrivateProfileCommand(userId));
  }
}
