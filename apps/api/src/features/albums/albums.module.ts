import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AlbumsController } from './albums.controller';
import { CreateAlbumHandler } from './commands/handlers/create-album.handler';

@Module({
  imports: [CqrsModule],
  controllers: [AlbumsController],
  providers: [CreateAlbumHandler],
  exports: [],
})
export class AlbumsModule {}
