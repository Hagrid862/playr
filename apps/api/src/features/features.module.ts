import { Module } from '@nestjs/common';
import { AlbumsModule } from './albums/albums.module';
import { AuthModule } from './auth/auth.module';
import { LibraryArtistsModule } from './library-artists/library-artists.module';
import { LibraryModule } from './library/library.module';

@Module({
  imports: [AuthModule, LibraryModule, LibraryArtistsModule, AlbumsModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class FeaturesModule {}
