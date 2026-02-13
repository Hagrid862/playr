import { ICommand } from '@nestjs/cqrs';
import { UpdateLibraryAlbumRequestDto } from '../../dto/request/update-library-album.request.dto';

export class UpdateLibraryAlbumCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly request: UpdateLibraryAlbumRequestDto,
    public readonly userId: string,
  ) {}
}
