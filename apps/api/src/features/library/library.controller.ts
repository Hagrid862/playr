import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { ApiErrorResponseDto } from "@/common/dto/api-error.response.dto";
import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { CreateLibraryCommand } from "./commands/impl/create-library.command";
import { GetLibraryCommand } from "./commands/impl/get-library.command";
import { CreateLibraryRequestDto } from "./dto/create-library.request.dto";
import { CreateLibraryResponseDto } from "./dto/create-library.response.dto";

@ApiTags('Library')
@Controller("library")
export class LibraryController {
  constructor(private readonly commandBus: CommandBus) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new private library' })
  @ApiBody({
    type: CreateLibraryRequestDto,
    schema: {
      type: 'object',
      properties: {},
      example: {},
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Library created successfully',
    type: CreateLibraryResponseDto,
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
    description: 'Library already exists',
    type: ApiErrorResponseDto,
  })
  create(
    @CurrentUser('id') userId: string,
  ) {
    return this.commandBus.execute(new CreateLibraryCommand(userId));
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user private library' })
  @ApiResponse({
    status: 200,
    description: 'Library retrieved successfully',
    type: CreateLibraryResponseDto,
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
  getAll(@CurrentUser('id') userId: string) {
    return this.commandBus.execute(new GetLibraryCommand(userId));
  }
}