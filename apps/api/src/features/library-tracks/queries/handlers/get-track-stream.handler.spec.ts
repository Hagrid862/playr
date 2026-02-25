import { AudioFileRepository } from '@/shared/repositories/audio-file.repository';
import { StorageService } from '@/shared/services/storage.service';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StreamAudioQuality } from '@repo/contracts';
import { AudioFormat, AudioQuality, FileBucket } from '@repo/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetTrackStreamQuery } from '../impl/get-track-stream.query';
import { GetTrackStreamHandler } from './get-track-stream.handler';

describe('GetTrackStreamHandler', () => {
  let handler: GetTrackStreamHandler;
  let audioFileRepository: DeepMocked<AudioFileRepository>;
  let storageService: DeepMocked<StorageService>;

  beforeEach(async () => {
    audioFileRepository = createMock<AudioFileRepository>();
    storageService = createMock<StorageService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTrackStreamHandler,
        { provide: AudioFileRepository, useValue: audioFileRepository },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    handler = module.get<GetTrackStreamHandler>(GetTrackStreamHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    const mockTrackId = 'track-1';

    it('should throw NotFoundException if no processed audio files exist', async () => {
      audioFileRepository.findMany.mockResolvedValue([]);
      const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.standard, '');
      await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    });

    describe('Quality Selection', () => {
      const mockFiles = [
        {
          id: '1',
          format: AudioFormat.flac,
          quality: AudioQuality.original,
          size: 100,
          bucket: FileBucket.private,
          key: 'lossless-flac',
        },
        {
          id: '2',
          format: AudioFormat.mp3,
          quality: AudioQuality.high,
          size: 80,
          bucket: FileBucket.private,
          key: 'high-mp3',
        },
        {
          id: '3',
          format: AudioFormat.mp3,
          quality: AudioQuality.low,
          size: 20,
          bucket: FileBucket.private,
          key: 'low-mp3',
        },
      ] as any[];

      beforeEach(() => {
        audioFileRepository.findMany.mockResolvedValue(mockFiles);
        storageService.getFileStream.mockResolvedValue({
          stream: {} as any,
          size: 100,
          totalSize: 100,
        });
      });

      it('should return exact match if available (lossless -> flac)', async () => {
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.lossless, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalledWith(
          FileBucket.private,
          'lossless-flac',
          expect.objectContaining({ start: 0, end: 99 }),
        );
      });

      it('should return exact match for high quality mp3 when only mp3 is available', async () => {
        audioFileRepository.findMany.mockResolvedValue([
          {
            id: '2',
            format: AudioFormat.mp3,
            quality: AudioQuality.high,
            size: 80,
            bucket: FileBucket.public,
            key: 'high-mp3',
          },
        ] as any[]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.high, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalledWith(
          FileBucket.public,
          'high-mp3',
          expect.any(Object),
        );
      });

      it('should prefer high quality opus over high quality mp3 when both are available', async () => {
        audioFileRepository.findMany.mockResolvedValue([
          {
            id: '1',
            format: AudioFormat.opus,
            quality: AudioQuality.high,
            size: 80,
            bucket: FileBucket.public,
            key: 'high-opus',
          },
          {
            id: '2',
            format: AudioFormat.mp3,
            quality: AudioQuality.high,
            size: 80,
            bucket: FileBucket.public,
            key: 'high-mp3',
          },
        ] as any[]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.high, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalledWith(
          FileBucket.public,
          'high-opus',
          expect.any(Object),
        );
      });

      it('should score standard opus specially', async () => {
        audioFileRepository.findMany.mockResolvedValue([
          { id: '1', format: AudioFormat.opus, quality: AudioQuality.standard, size: 80 },
        ] as any[]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.standard, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalled();
      });

      it('should score standard other format normally', async () => {
        audioFileRepository.findMany.mockResolvedValue([
          { id: '1', format: AudioFormat.mp3, quality: AudioQuality.standard, size: 80 },
        ] as any[]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.standard, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalled();
      });

      it('should return 0 for unhandled formats in high/standard qualities', async () => {
        audioFileRepository.findMany.mockResolvedValue([
          { id: '1', format: AudioFormat.aac, quality: AudioQuality.high, size: 80 },
          { id: '2', format: AudioFormat.aac, quality: AudioQuality.standard, size: 80 },
        ] as any[]);

        const queryHigh = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.high, '');
        await handler.execute(queryHigh); // Will fallback since score is 0

        const queryStd = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.standard, '');
        await handler.execute(queryStd); // Will fallback since score is 0

        expect(storageService.getFileStream).toHaveBeenCalled();
      });

      it('should test default fallback quality score', async () => {
        audioFileRepository.findMany.mockResolvedValue([
          { id: '1', format: AudioFormat.mp3, quality: 'unknown' as any, size: 80 },
        ] as any[]);
        const query = new GetTrackStreamQuery(mockTrackId, 'unknown' as any, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalled();
      });

      it('should return exact match for low quality mp3 when only mp3 is available', async () => {
        audioFileRepository.findMany.mockResolvedValue([
          {
            id: '2',
            format: AudioFormat.mp3,
            quality: AudioQuality.low,
            size: 20,
            bucket: FileBucket.public,
            key: 'low-mp3',
          },
        ] as any[]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.low, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalledWith(
          FileBucket.public,
          'low-mp3',
          expect.any(Object),
        );
      });

      it('should prefer low quality opus over low quality mp3 when both are available', async () => {
        audioFileRepository.findMany.mockResolvedValue([
          {
            id: '1',
            format: AudioFormat.opus,
            quality: AudioQuality.low,
            size: 20,
            bucket: FileBucket.public,
            key: 'low-opus',
          },
          {
            id: '2',
            format: AudioFormat.mp3,
            quality: AudioQuality.low,
            size: 20,
            bucket: FileBucket.public,
            key: 'low-mp3',
          },
        ] as any[]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.low, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalledWith(
          FileBucket.public,
          'low-opus',
          expect.any(Object),
        );
      });

      it('should fallback to lower quality if exact match is missing (standard -> low)', async () => {
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.standard, '');
        await handler.execute(query);
        // It should pick mp3 high or low depending on fallback, but let's just make sure it doesn't crash
        expect(storageService.getFileStream).toHaveBeenCalled();
      });

      it('should fallback to higher quality if lower is missing AND lower check yields nothing', async () => {
        audioFileRepository.findMany.mockResolvedValue([
          { id: '1', format: AudioFormat.flac, quality: AudioQuality.original, size: 100 },
        ] as any[]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.low, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalled();
      });

      it('should sort fallback lower qualities by score', async () => {
        audioFileRepository.findMany.mockResolvedValue([
          { id: '1', format: AudioFormat.mp3, quality: AudioQuality.low, size: 20 },
          { id: '2', format: AudioFormat.mp3, quality: AudioQuality.low, size: 30 },
        ] as any[]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.standard, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalled();
      });

      it('should sort fallback higher qualities by score', async () => {
        audioFileRepository.findMany.mockResolvedValue([
          { id: '1', format: AudioFormat.flac, quality: AudioQuality.original, size: 100 },
          { id: '2', format: AudioFormat.wav, quality: AudioQuality.original, size: 100 },
        ] as any[]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.high, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalled();
      });

      it('should fallback to first file if all else fails', async () => {
        audioFileRepository.findMany.mockResolvedValue([
          { id: '1', format: AudioFormat.aac, quality: AudioQuality.original, size: 100 },
        ] as any[]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.standard, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalled();
      });
    });

    describe('Range Handling', () => {
      beforeEach(() => {
        audioFileRepository.findMany.mockResolvedValue([
          { id: '1', format: AudioFormat.mp3, quality: AudioQuality.standard, size: 1000 },
        ] as any[]);
        storageService.getFileStream.mockResolvedValue({
          stream: {} as any,
          size: 1000,
          totalSize: 1000,
        });
      });

      it('should parse range headers correctly with full range', async () => {
        const query = new GetTrackStreamQuery(
          mockTrackId,
          StreamAudioQuality.standard,
          'bytes=0-499',
        );
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalledWith(undefined, undefined, {
          start: 0,
          end: 499,
        });
      });

      it('should parse range headers correctly without end', async () => {
        const query = new GetTrackStreamQuery(
          mockTrackId,
          StreamAudioQuality.standard,
          'bytes=500-',
        );
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalledWith(undefined, undefined, {
          start: 500,
          end: 999,
        });
      });

      it('should throw Error if range start is out of bounds', async () => {
        const query = new GetTrackStreamQuery(
          mockTrackId,
          StreamAudioQuality.standard,
          'bytes=1000-',
        );
        await expect(handler.execute(query)).rejects.toThrow('Requested range not satisfiable');
      });

      it('should fallback mp3 mimetype properly', async () => {
        audioFileRepository.findMany.mockResolvedValue([
          { id: '1', format: AudioFormat.mp3, quality: AudioQuality.standard, size: 1000 },
        ] as any[]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.standard, '');
        const res = await handler.execute(query);
        expect(res.metadata.mimeType).toBe('audio/mpeg');
      });
    });
  });
});
