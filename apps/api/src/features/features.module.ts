import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { LibraryModule } from './library/library.module';
import { PrivateProfileModule } from './private-profile/private-profile.module';

@Module({
  imports: [AuthModule, LibraryModule, PrivateProfileModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class FeaturesModule {}
