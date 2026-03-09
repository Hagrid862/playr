import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AudioProcessingWorker } from './audio-processing.worker';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'audio-processing',
    }),
  ],
  providers: [AudioProcessingWorker],
  exports: [BullModule],
})
export class AudioProcessingModule {}
