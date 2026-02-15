import { ICommand } from '@nestjs/cqrs';
import { CreateLibraryTrackRequestDto } from '../../dto/request/create-library-track.request.dto';

export class CreateLibraryTrackCommand implements ICommand {
  constructor(
    public readonly body: CreateLibraryTrackRequestDto,
    public readonly userId: string,
  ) {}
}
