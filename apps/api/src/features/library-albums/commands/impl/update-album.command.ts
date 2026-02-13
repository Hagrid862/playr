import { ICommand } from '@nestjs/cqrs';
import { UpdateAlbumRequestDto } from '../../dto/request/update-library-album.request.dto';

export class UpdateAlbumCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly request: UpdateAlbumRequestDto,
    public readonly userId: string,
  ) {}
}
