import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AlbumsModule } from './library-albums/library-albums.module';
import { LibraryArtistsModule } from './library-artists/library-artists.module';
import { LibraryModule } from './library/library.module';

@Module({
  imports: [AuthModule, LibraryModule, LibraryArtistsModule, AlbumsModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class FeaturesModule {}
