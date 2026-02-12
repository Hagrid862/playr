import { Module } from '@nestjs/common';
import { AlbumsModule } from './albums/albums.module';
import { ArtistsModule } from './artists/artists.module';
import { AuthModule } from './auth/auth.module';
import { LibraryModule } from './library/library.module';

@Module({
  imports: [AuthModule, LibraryModule, ArtistsModule, AlbumsModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class FeaturesModule {}
