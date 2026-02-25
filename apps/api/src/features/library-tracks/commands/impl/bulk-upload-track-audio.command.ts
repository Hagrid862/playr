import { ICommand } from '@nestjs/cqrs';

export class BulkUploadTrackAudioCommand implements ICommand {
  constructor(
    public readonly albumId: string,
    public readonly trackIds: string[],
    public readonly files: Express.Multer.File[],
    public readonly userId: string,
  ) {}
}
