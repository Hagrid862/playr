import { Module } from '@nestjs/common';
import { ArtistsController } from './artists.controller';

@Module({
  imports: [],
  controllers: [ArtistsController],
  providers: [],
  exports: [],
})
export class ArtistsModule { }
