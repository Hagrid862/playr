import {
  AddPlaylistTrackResponseSchema,
  CreateLibraryPlaylistResponseSchema,
  DeleteLibraryPlaylistCoverResponseSchema,
  DeleteLibraryPlaylistResponseSchema,
  GetLibraryPlaylistDetailResponseSchema,
  GetLibraryPlaylistPinsResponseSchema,
  GetLibraryPlaylistsResponseSchema,
  PinPlaylistResponseSchema,
  RemovePlaylistTrackResponseSchema,
  ReorderPlaylistPinsResponseSchema,
  UnpinPlaylistResponseSchema,
  UpdateLibraryPlaylistResponseSchema,
  UploadLibraryPlaylistCoverResponseSchema,
} from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetLibraryPlaylistsResponseDto extends createZodDto(
  GetLibraryPlaylistsResponseSchema,
) {}
export class GetLibraryPlaylistDetailResponseDto extends createZodDto(
  GetLibraryPlaylistDetailResponseSchema,
) {}
export class CreateLibraryPlaylistResponseDto extends createZodDto(
  CreateLibraryPlaylistResponseSchema,
) {}
export class UpdateLibraryPlaylistResponseDto extends createZodDto(
  UpdateLibraryPlaylistResponseSchema,
) {}
export class DeleteLibraryPlaylistResponseDto extends createZodDto(
  DeleteLibraryPlaylistResponseSchema,
) {}
export class AddPlaylistTrackResponseDto extends createZodDto(AddPlaylistTrackResponseSchema) {}
export class RemovePlaylistTrackResponseDto extends createZodDto(
  RemovePlaylistTrackResponseSchema,
) {}
export class GetLibraryPlaylistPinsResponseDto extends createZodDto(
  GetLibraryPlaylistPinsResponseSchema,
) {}
export class PinPlaylistResponseDto extends createZodDto(PinPlaylistResponseSchema) {}
export class UnpinPlaylistResponseDto extends createZodDto(UnpinPlaylistResponseSchema) {}
export class ReorderPlaylistPinsResponseDto extends createZodDto(
  ReorderPlaylistPinsResponseSchema,
) {}
export class UploadLibraryPlaylistCoverResponseDto extends createZodDto(
  UploadLibraryPlaylistCoverResponseSchema,
) {}
export class DeleteLibraryPlaylistCoverResponseDto extends createZodDto(
  DeleteLibraryPlaylistCoverResponseSchema,
) {}
