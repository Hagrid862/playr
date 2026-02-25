import { AudioFileRepository } from '@/shared/repositories/audio-file.repository';
import { TrackRepository } from '@/shared/repositories/track.repository';
import { StorageService } from '@/shared/services/storage.service';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AudioFileSchema, ZodAudioFileInfer } from '@repo/contracts';
import { AudioFormat, FileBucket, ProcessingStatus } from '@repo/db';
import { Queue } from 'bullmq';
import { BulkUploadTrackAudioCommand } from '../impl/bulk-upload-track-audio.command';

const AUDIO_MIME_TYPES =
  /(audio\/mpeg|audio\/wav|audio\/flac|audio\/ogg|audio\/aac|audio\/mp4|audio\/x-wav|audio\/x-flac)/;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

@CommandHandler(BulkUploadTrackAudioCommand)
export class BulkUploadTrackAudioHandler
  implements ICommandHandler<BulkUploadTrackAudioCommand>
{
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly audioFileRepository: AudioFileRepository,
    private readonly storageService: StorageService,
    @InjectQueue('audio-processing')
    private readonly processingQueue: Queue,
  ) {}

  async execute(
    command: BulkUploadTrackAudioCommand,
  ): Promise<{ audioFiles: ZodAudioFileInfer[] }> {
    const { albumId, trackIds, files, userId } = command;

    if (trackIds.length !== files.length) {
      throw new BadRequestException(
        `trackIds count (${trackIds.length}) must match files count (${files.length})`,
      );
    }

    if (trackIds.length === 0) {
      throw new BadRequestException('At least one file and track ID is required');
    }

    if (trackIds.length > 50) {
      throw new BadRequestException('Maximum 50 files per bulk upload');
    }

    const audioFiles: ZodAudioFileInfer[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const trackId = trackIds[i];

      this.validateFile(file, i);

      const track = await this.trackRepository.findOne({ id: trackId }, true);

      if (!track) {
        throw new NotFoundException(`Track ${trackId} not found`);
      }

      const trackWithRelations = track as unknown as {
        albumId?: string;
        access?: { userId: string; role: string }[];
      };

      if (trackWithRelations.albumId !== albumId) {
        throw new BadRequestException(
          `Track ${trackId} does not belong to album ${albumId}`,
        );
      }

      const hasAccess = trackWithRelations.access?.some(
        (a) => a.userId === userId && (a.role === 'owner' || a.role === 'editor'),
      );

      if (!hasAccess) {
        throw new ForbiddenException(
          `You do not have permission to upload audio for track ${trackId}`,
        );
      }

      const format = this.mapMimeTypeToAudioFormat(file.mimetype, file.originalname);
      const fileExtension = file.originalname.split('.').pop();
      const key = `tracks/${trackId}/originals/${Date.now()}_${i}.${fileExtension}`;

      const { url } = await this.storageService.uploadFile(
        file.buffer,
        FileBucket.private,
        key,
        { contentType: file.mimetype },
      );

      const audioFile = await this.audioFileRepository.create({
        track: { connect: { id: trackId } },
        bucket: FileBucket.private,
        key,
        url,
        mimeType: file.mimetype,
        size: file.size,
        format,
        isOriginal: true,
        status: ProcessingStatus.pending,
        quality: 'original',
      });

      await this.processingQueue.add('process-audio', {
        audioFileId: audioFile.id,
        trackId,
        userId,
      });

      const parsed = AudioFileSchema.safeParse(audioFile);
      if (!parsed.success) {
        throw new BadRequestException(`Failed to parse audio file at index ${i}`);
      }
      audioFiles.push(parsed.data);
    }

    return { audioFiles };
  }

  private validateFile(file: Express.Multer.File, index: number): void {
    if (!file?.buffer) {
      throw new BadRequestException(`File at index ${index} is empty or invalid`);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File at index ${index} exceeds maximum size of 100MB`,
      );
    }
    if (!AUDIO_MIME_TYPES.test(file.mimetype)) {
      throw new BadRequestException(
        `File at index ${index} has invalid type: ${file.mimetype}`,
      );
    }
  }

  private mapMimeTypeToAudioFormat(mimetype: string, filename: string): AudioFormat {
    const mime = mimetype.toLowerCase();
    if (mime.includes('audio/mpeg') || mime.includes('audio/mp3')) return AudioFormat.mp3;
    if (mime.includes('audio/ogg') || mime.includes('audio/opus')) return AudioFormat.opus;
    if (mime.includes('audio/flac')) return AudioFormat.flac;
    if (mime.includes('audio/wav') || mime.includes('audio/x-wav')) return AudioFormat.wav;
    if (mime.includes('audio/aac') || mime.includes('audio/mp4')) return AudioFormat.aac;

    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'mp3':
        return AudioFormat.mp3;
      case 'ogg':
      case 'opus':
        return AudioFormat.opus;
      case 'flac':
        return AudioFormat.flac;
      case 'wav':
        return AudioFormat.wav;
      case 'aac':
      case 'm4a':
        return AudioFormat.aac;
      default:
        return AudioFormat.mp3;
    }
  }
}
