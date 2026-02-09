import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ArtistsController } from './artists.controller';
import { CreateArtistHandler } from './commands/handlers/create-artist.handler';
import { GetPrivateArtistsHandler } from './queries/handlers/get-private-artists.handler';

@Module({
  imports: [CqrsModule],
  controllers: [ArtistsController],
  providers: [CreateArtistHandler, GetPrivateArtistsHandler],
  exports: [],
})
export class ArtistsModule { }
