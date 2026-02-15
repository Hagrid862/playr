import { ICommand } from '@nestjs/cqrs';
import { UpdateLibraryTrackRequestDto } from '../../dto/request/update-library-track.request.dto';

export class UpdateLibraryTrackCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly body: UpdateLibraryTrackRequestDto,
    public readonly userId: string,
  ) {}
}
