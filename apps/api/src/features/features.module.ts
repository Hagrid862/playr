import { Module } from '@nestjs/common';
import { AudioProcessingModule } from './audio-processing/audio-processing.module';
import { AuthModule } from './auth/auth.module';
import { AlbumsModule } from './library-albums/library-albums.module';
import { LibraryArtistsModule } from './library-artists/library-artists.module';
import { LibraryTracksModule } from './library-tracks/library-tracks.module';
import { LibraryModule } from './library/library.module';

@Module({
  imports: [
    AuthModule,
    LibraryModule,
    LibraryArtistsModule,
    AlbumsModule,
    LibraryTracksModule,
    AudioProcessingModule,
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class FeaturesModule {}
