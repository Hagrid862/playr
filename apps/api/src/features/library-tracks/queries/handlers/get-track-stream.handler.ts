import { AudioFileRepository } from '@/shared/repositories/audio-file.repository';
import { StorageService } from '@/shared/services/storage.service';
import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { StreamAudioQuality } from '@repo/contracts';
import { AudioFile, AudioFormat, AudioQuality, FileBucket, ProcessingStatus } from '@repo/db';
import { GetTrackStreamQuery } from '../impl/get-track-stream.query';

@QueryHandler(GetTrackStreamQuery)
export class GetTrackStreamHandler implements IQueryHandler<GetTrackStreamQuery> {
  constructor(
    private readonly audioFileRepository: AudioFileRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(query: GetTrackStreamQuery) {
    const { trackId, requestedQuality } = query;

    // Find all completed audio files for this track
    const audioFiles = await this.audioFileRepository.findMany({
      where: {
        trackId,
        status: ProcessingStatus.complete,
      },
    });

    if (audioFiles.length === 0) {
      throw new NotFoundException('No processed audio file found for this track');
    }

    // Quality mapping and selection logic
    const getQualityScore = (file: AudioFile, target: StreamAudioQuality): number => {
      const format = file.format as AudioFormat;
      const quality = file.quality as AudioQuality;

      switch (target) {
        case StreamAudioQuality.lossless:
          if (format === AudioFormat.flac || format === AudioFormat.wav) return 100;
          return 0;

        case StreamAudioQuality.high:
          if (quality === AudioQuality.high) {
            if (format === AudioFormat.mp3) return 100;
            if (format === AudioFormat.opus) return 90;
          }
          return 0;

        case StreamAudioQuality.standard:
          if (quality === AudioQuality.standard) {
            if (format === AudioFormat.mp3) return 100;
            if (format === AudioFormat.opus) return 90;
          }
          return 0;

        case StreamAudioQuality.low:
          if (quality === AudioQuality.low && format === AudioFormat.mp3) return 100;
          return 0;

        default:
          return 0;
      }
    };

    // Try to find the best match for the requested quality
    let selectedFile = audioFiles
      .map((f) => ({ file: f, score: getQualityScore(f, requestedQuality) }))
      .filter((f) => f.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.file;

    // Fallback logic if requested quality is missing
    if (!selectedFile) {
      const qualityOrder = [
        StreamAudioQuality.lossless,
        StreamAudioQuality.high,
        StreamAudioQuality.standard,
        StreamAudioQuality.low,
      ];

      const currentIndex = qualityOrder.indexOf(requestedQuality);

      // Try lower qualities first
      for (let i = currentIndex + 1; i < qualityOrder.length; i++) {
        selectedFile = audioFiles
          .map((f) => ({ file: f, score: getQualityScore(f, qualityOrder[i]) }))
          .filter((f) => f.score > 0)
          .sort((a, b) => b.score - a.score)[0]?.file;
        if (selectedFile) break;
      }

      // If still nothing, try higher qualities
      if (!selectedFile) {
        for (let i = currentIndex - 1; i >= 0; i--) {
          selectedFile = audioFiles
            .map((f) => ({ file: f, score: getQualityScore(f, qualityOrder[i]) }))
            .filter((f) => f.score > 0)
            .sort((a, b) => b.score - a.score)[0]?.file;
          if (selectedFile) break;
        }
      }

      // Final fallback: just take the first one available (likely original)
      if (!selectedFile) {
        selectedFile = audioFiles[0];
      }
    }

    const totalSize = Number(selectedFile.size);
    let start = 0;
    let end = totalSize - 1;

    if (query.range) {
      const parts = query.range.replace(/bytes=/, '').split('-');
      start = parseInt(parts[0], 10);
      end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (start >= totalSize || end >= totalSize) {
        throw new HttpException(
          'Requested range not satisfiable',
          HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
        );
      }
    }

    const { stream } = await this.storageService.getFileStream(
      selectedFile.bucket as FileBucket,
      selectedFile.key,
      {
        start,
        end,
      },
    );

    return {
      stream,
      metadata: {
        start,
        end,
        totalSize,
        mimeType:
          selectedFile.mimeType ||
          (selectedFile.format === AudioFormat.mp3 ? 'audio/mpeg' : 'audio/unknown'),
        quality: selectedFile.quality as AudioQuality,
        format: selectedFile.format as AudioFormat,
        isPartial: !!query.range,
      },
    };
  }
}
