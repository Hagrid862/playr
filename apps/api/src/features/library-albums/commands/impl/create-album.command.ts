import { ICommand } from '@nestjs/cqrs';
import { CreateAlbumRequestDto } from '../../dto/request/create-library-album.request.dto';

export class CreateAlbumCommand implements ICommand {
  constructor(
    public readonly request: CreateAlbumRequestDto,
    public readonly userId: string,
  ) {}
}
