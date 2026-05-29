import {
  getTrackOwnerUserId,
  LOSSLESS_FORMATS,
} from '@/features/audio-processing/audio-processing.constants';
import { AudioFileRepository } from '@/shared/repositories/audio-file.repository';
import { TrackRepository } from '@/shared/repositories/track.repository';
import { LibraryStorageQuotaService } from '@/shared/services/library-storage-quota.service';
import { StorageService } from '@/shared/services/storage.service';
import { InjectQueue } from '@nestjs/bullmq';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UploadTrackAudioResponse } from '@repo/contracts';
import { AudioFormat, FileBucket, ProcessingStatus } from '@repo/db';
import { Queue } from 'bullmq';
import { UploadTrackAudioCommand } from '../impl/upload-track-audio.command';

@CommandHandler(UploadTrackAudioCommand)
export class UploadTrackAudioHandler implements ICommandHandler<UploadTrackAudioCommand> {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly audioFileRepository: AudioFileRepository,
    private readonly storageService: StorageService,
    private readonly storageQuotaService: LibraryStorageQuotaService,
    @InjectQueue('audio-processing')
    private readonly processingQueue: Queue,
  ) {}

  async execute(command: UploadTrackAudioCommand): Promise<UploadTrackAudioResponse> {
    const { trackId, userId, file } = command;

    const track = await this.trackRepository.getById(trackId, { include: { access: true } });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    const trackWithRelations = track as unknown as { access?: { userId: string; role: string }[] };

    // Basic permission check - only owners/editors can upload audio
    const hasAccess = trackWithRelations.access?.some(
      (a: { userId: string; role: string }) =>
        a.userId === userId && (a.role === 'owner' || a.role === 'editor'),
    );

    if (!hasAccess) {
      throw new ForbiddenException('You do not have permission to upload audio for this track');
    }

    const ownerUserId = getTrackOwnerUserId(trackWithRelations.access);
    if (!ownerUserId) {
      throw new ForbiddenException('Track has no owner');
    }

    // Determine format from mimetype or extension
    const format = this.mapMimeTypeToAudioFormat(file.mimetype, file.originalname);

    const isLossless = LOSSLESS_FORMATS.includes(
      format.toLowerCase() as (typeof LOSSLESS_FORMATS)[number],
    );
    await this.storageQuotaService.assertCanAddBytes(
      ownerUserId,
      file.size + this.storageQuotaService.estimateReservedProcessedBytes(file.size, isLossless),
    );

    // Generate a unique key for the original file
    const fileExtension = file.originalname.split('.').pop();
    const key = `tracks/${trackId}/originals/${Date.now()}.${fileExtension}`;

    // Upload to private bucket
    const { url } = await this.storageService.uploadFile(file.buffer, FileBucket.private, key, {
      contentType: file.mimetype,
    });

    // Create AudioFile record
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

    // Dispatch processing job
    await this.processingQueue.add('process-audio', {
      audioFileId: audioFile.id,
      trackId,
      userId,
    });

    return {
      audioFile,
    };
  }

  private mapMimeTypeToAudioFormat(mimetype: string, filename: string): AudioFormat {
    const mime = mimetype.toLowerCase();
    if (mime.includes('audio/mpeg') || mime.includes('audio/mp3')) return AudioFormat.mp3;
    if (mime.includes('audio/ogg') || mime.includes('audio/opus')) return AudioFormat.opus;
    if (mime.includes('audio/flac')) return AudioFormat.flac;
    if (mime.includes('audio/wav') || mime.includes('audio/x-wav')) return AudioFormat.wav;
    if (mime.includes('audio/aac') || mime.includes('audio/mp4')) return AudioFormat.aac;

    // Fallback to extension if mimetype is ambiguous
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
        return AudioFormat.mp3; // Default to mp3 if unknown
    }
  }
}
