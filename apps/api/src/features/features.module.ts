import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { LibraryModule } from './library/library.module';

@Module({
  imports: [AuthModule, LibraryModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class FeaturesModule { }
