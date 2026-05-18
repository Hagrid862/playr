import { Module } from '@nestjs/common';
import { AudioProcessingModule } from './audio-processing/audio-processing.module';
import { AuthModule } from './auth/auth.module';
import { AlbumsModule } from './library-albums/library-albums.module';
import { LibraryArtistsModule } from './library-artists/library-artists.module';
import { LibraryGenresModule } from './library-genres/library-genres.module';
import { LibraryTracksModule } from './library-tracks/library-tracks.module';
import { LibraryPlaylistsModule } from './library-playlists/library-playlists.module';
import { LibraryModule } from './library/library.module';
import { PlaybackModule } from './playback/playback.module';

@Module({
  imports: [
    AuthModule,
    LibraryModule,
    LibraryArtistsModule,
    LibraryGenresModule,
    AlbumsModule,
    LibraryTracksModule,
    LibraryPlaylistsModule,
    AudioProcessingModule,
    PlaybackModule,
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class FeaturesModule {}
