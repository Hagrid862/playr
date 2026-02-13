import { ICommand } from '@nestjs/cqrs';
import { CreateLibraryAlbumRequestDto } from '../../dto/request/create-library-album.request.dto';

export class CreateAlbumCommand implements ICommand {
  constructor(
    public readonly request: CreateLibraryAlbumRequestDto,
    public readonly userId: string,
  ) {}
}
