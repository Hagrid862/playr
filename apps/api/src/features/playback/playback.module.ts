import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlaybackGateway } from './playback.gateway';

@Module({
  imports: [AuthModule],
  controllers: [],
  providers: [PlaybackGateway],
  exports: [],
})
export class PlaybackModule {}
