import { Module } from '@nestjs/common';
import { AlbumsModule } from './albums/albums.module';
import { ArtistsModule } from './artists/artists.module';
import { AuthModule } from './auth/auth.module';
import { LibraryModule } from './library/library.module';
import { PrivateProfileModule } from './private-profile/private-profile.module';

@Module({
  imports: [AuthModule, LibraryModule, PrivateProfileModule, ArtistsModule, AlbumsModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class FeaturesModule {}
