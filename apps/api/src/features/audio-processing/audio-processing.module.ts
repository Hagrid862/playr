import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AudioTranscodeService } from './audio-transcode.service';
import { AudioProcessingWorker } from './audio-processing.worker';
import { WaveformService } from './waveform.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'audio-processing',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 1000 },
      },
    }),
  ],
  providers: [AudioTranscodeService, WaveformService, AudioProcessingWorker],
  exports: [BullModule],
})
export class AudioProcessingModule {}
