import { ICommand } from '@nestjs/cqrs';
import { CreateLibraryAlbumRequestDto } from '../../dto/request/create-library-album.request.dto';

export class CreateLibraryAlbumCommand implements ICommand {
  constructor(
    public readonly request: CreateLibraryAlbumRequestDto,
    public readonly userId: string,
  ) {}
}
