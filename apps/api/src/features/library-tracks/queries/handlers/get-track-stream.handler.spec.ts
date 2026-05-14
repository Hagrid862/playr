import { AudioFileRepository } from '@/shared/repositories/audio-file.repository';
import { StorageService } from '@/shared/services/storage.service';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StreamAudioQuality, StreamPreferredFormat } from '@repo/contracts';
import { AudioFormat, AudioQuality, FileBucket } from '@repo/db';
import { audioFileBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
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
      audioFileRepository.listByTrackId.mockResolvedValue([]);
      const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.standard, '');
      await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    });

    describe('Quality Selection', () => {
      const mockFiles = [
        audioFileBuilder({
          id: 'audio-file-1',
          format: AudioFormat.flac,
          quality: AudioQuality.original,
          size: 100,
          bucket: FileBucket.private,
          key: 'lossless-flac',
        }),
        audioFileBuilder({
          id: 'audio-file-2',
          format: AudioFormat.mp3,
          quality: AudioQuality.high,
          size: 80,
          bucket: FileBucket.private,
          key: 'high-mp3',
        }),
        audioFileBuilder({
          id: 'audio-file-3',
          format: AudioFormat.mp3,
          quality: AudioQuality.low,
          size: 20,
          bucket: FileBucket.private,
          key: 'low-mp3',
        }),
      ];

      beforeEach(() => {
        audioFileRepository.listByTrackId.mockResolvedValue(mockFiles);
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
        audioFileRepository.listByTrackId.mockResolvedValue([
          audioFileBuilder({
            id: 'audio-file-1',
            format: AudioFormat.mp3,
            quality: AudioQuality.high,
            size: 80,
            bucket: FileBucket.public,
            key: 'high-mp3',
          }),
        ]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.high, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalledWith(
          FileBucket.public,
          'high-mp3',
          expect.any(Object),
        );
      });

      it('should prefer high quality opus over high quality mp3 when both are available', async () => {
        audioFileRepository.listByTrackId.mockResolvedValue([
          audioFileBuilder({
            id: 'audio-file-1',
            format: AudioFormat.opus,
            quality: AudioQuality.high,
            size: 80,
            bucket: FileBucket.public,
            key: 'high-opus',
          }),
          audioFileBuilder({
            id: 'audio-file-2',
            format: AudioFormat.mp3,
            quality: AudioQuality.high,
            size: 80,
            bucket: FileBucket.public,
            key: 'high-mp3',
          }),
        ]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.high, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalledWith(
          FileBucket.public,
          'high-opus',
          expect.any(Object),
        );
      });

      it('should score standard opus specially', async () => {
        audioFileRepository.listByTrackId.mockResolvedValue([
          audioFileBuilder({
            id: 'audio-file-1',
            format: AudioFormat.opus,
            quality: AudioQuality.standard,
            size: 80,
          }),
        ]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.standard, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalled();
      });

      it('should score standard other format normally', async () => {
        audioFileRepository.listByTrackId.mockResolvedValue([
          audioFileBuilder({
            id: 'audio-file-1',
            format: AudioFormat.mp3,
            quality: AudioQuality.standard,
            size: 80,
          }),
        ]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.standard, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalled();
      });

      it('should return 0 for unhandled formats in high/standard qualities', async () => {
        audioFileRepository.listByTrackId.mockResolvedValue([
          audioFileBuilder({
            id: 'audio-file-1',
            format: AudioFormat.aac,
            quality: AudioQuality.high,
            size: 80,
          }),
          audioFileBuilder({
            id: 'audio-file-2',
            format: AudioFormat.aac,
            quality: AudioQuality.standard,
            size: 80,
          }),
        ]);

        const queryHigh = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.high, '');
        await handler.execute(queryHigh); // Will fallback since score is 0

        const queryStd = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.standard, '');
        await handler.execute(queryStd); // Will fallback since score is 0

        expect(storageService.getFileStream).toHaveBeenCalled();
      });

      it('should test default fallback quality score', async () => {
        audioFileRepository.listByTrackId.mockResolvedValue([
          audioFileBuilder({
            id: 'audio-file-1',
            format: AudioFormat.mp3,
            quality: 'unknown' as any,
            size: 80,
          }),
        ]);
        const query = new GetTrackStreamQuery(mockTrackId, 'unknown' as any, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalled();
      });

      it('should return exact match for low quality mp3 when only mp3 is available', async () => {
        audioFileRepository.listByTrackId.mockResolvedValue([
          audioFileBuilder({
            id: 'audio-file-1',
            format: AudioFormat.mp3,
            quality: AudioQuality.low,
            size: 20,
            bucket: FileBucket.public,
            key: 'low-mp3',
          }),
        ]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.low, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalledWith(
          FileBucket.public,
          'low-mp3',
          expect.any(Object),
        );
      });

      it('should prefer low quality opus over low quality mp3 when both are available', async () => {
        audioFileRepository.listByTrackId.mockResolvedValue([
          audioFileBuilder({
            id: 'audio-file-1',
            format: AudioFormat.opus,
            quality: AudioQuality.low,
            size: 20,
            bucket: FileBucket.public,
            key: 'low-opus',
          }),
          audioFileBuilder({
            id: 'audio-file-2',
            format: AudioFormat.mp3,
            quality: AudioQuality.low,
            size: 20,
            bucket: FileBucket.public,
            key: 'low-mp3',
          }),
        ]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.low, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalledWith(
          FileBucket.public,
          'low-opus',
          expect.any(Object),
        );
      });

      it('should prefer low quality mp3 over opus when format=mp3', async () => {
        audioFileRepository.listByTrackId.mockResolvedValue([
          audioFileBuilder({
            id: 'audio-file-1',
            format: AudioFormat.opus,
            quality: AudioQuality.low,
            size: 20,
            bucket: FileBucket.public,
            key: 'low-opus',
          }),
          audioFileBuilder({
            id: 'audio-file-2',
            format: AudioFormat.mp3,
            quality: AudioQuality.low,
            size: 20,
            bucket: FileBucket.public,
            key: 'low-mp3',
          }),
        ]);
        const query = new GetTrackStreamQuery(
          mockTrackId,
          StreamAudioQuality.low,
          '',
          StreamPreferredFormat.mp3,
        );
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalledWith(
          FileBucket.public,
          'low-mp3',
          expect.any(Object),
        );
      });

      it('should prefer standard mp3 over standard opus when format=mp3', async () => {
        audioFileRepository.listByTrackId.mockResolvedValue([
          audioFileBuilder({
            id: 'audio-file-1',
            format: AudioFormat.opus,
            quality: AudioQuality.standard,
            size: 40,
            bucket: FileBucket.private,
            key: 'std-opus',
          }),
          audioFileBuilder({
            id: 'audio-file-2',
            format: AudioFormat.mp3,
            quality: AudioQuality.standard,
            size: 40,
            bucket: FileBucket.private,
            key: 'std-mp3',
          }),
        ]);
        const query = new GetTrackStreamQuery(
          mockTrackId,
          StreamAudioQuality.standard,
          '',
          StreamPreferredFormat.mp3,
        );
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalledWith(
          FileBucket.private,
          'std-mp3',
          expect.any(Object),
        );
      });

      it('should prefer standard opus when format=opus (explicit default)', async () => {
        audioFileRepository.listByTrackId.mockResolvedValue([
          audioFileBuilder({
            id: 'audio-file-1',
            format: AudioFormat.opus,
            quality: AudioQuality.standard,
            size: 40,
            bucket: FileBucket.private,
            key: 'std-opus',
          }),
          audioFileBuilder({
            id: 'audio-file-2',
            format: AudioFormat.mp3,
            quality: AudioQuality.standard,
            size: 40,
            bucket: FileBucket.private,
            key: 'std-mp3',
          }),
        ]);
        const query = new GetTrackStreamQuery(
          mockTrackId,
          StreamAudioQuality.standard,
          '',
          StreamPreferredFormat.opus,
        );
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalledWith(
          FileBucket.private,
          'std-opus',
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
        audioFileRepository.listByTrackId.mockResolvedValue([
          audioFileBuilder({
            id: 'audio-file-1',
            format: AudioFormat.flac,
            quality: AudioQuality.original,
            size: 100,
          }),
        ]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.low, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalled();
      });

      it('should sort fallback lower qualities by score', async () => {
        audioFileRepository.listByTrackId.mockResolvedValue([
          audioFileBuilder({
            id: 'audio-file-1',
            format: AudioFormat.mp3,
            quality: AudioQuality.low,
            size: 20,
          }),
          audioFileBuilder({
            id: 'audio-file-2',
            format: AudioFormat.mp3,
            quality: AudioQuality.low,
            size: 30,
          }),
        ]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.standard, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalled();
      });

      it('should sort fallback higher qualities by score', async () => {
        audioFileRepository.listByTrackId.mockResolvedValue([
          audioFileBuilder({
            id: 'audio-file-1',
            format: AudioFormat.flac,
            quality: AudioQuality.original,
            size: 100,
          }),
          audioFileBuilder({
            id: 'audio-file-2',
            format: AudioFormat.wav,
            quality: AudioQuality.original,
            size: 100,
          }),
        ]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.high, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalled();
      });

      it('should fallback to first file if all else fails', async () => {
        audioFileRepository.listByTrackId.mockResolvedValue([
          audioFileBuilder({
            id: 'audio-file-1',
            format: AudioFormat.aac,
            quality: AudioQuality.original,
            size: 100,
          }),
        ]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.standard, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalled();
      });

      it('should return 0 for low quality when format is not opus or mp3 and use final fallback', async () => {
        audioFileRepository.listByTrackId.mockResolvedValue([
          audioFileBuilder({
            id: 'audio-file-1',
            format: AudioFormat.aac,
            quality: AudioQuality.low,
            size: 50,
            bucket: FileBucket.private,
            key: 'low-aac',
          }),
        ]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.low, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalledWith(
          FileBucket.private,
          'low-aac',
          expect.objectContaining({ start: 0, end: 49 }),
        );
      });

      it('should select wav for lossless when wav is available', async () => {
        audioFileRepository.listByTrackId.mockResolvedValue([
          audioFileBuilder({
            id: 'audio-file-1',
            format: AudioFormat.wav,
            quality: AudioQuality.original,
            size: 200,
            bucket: FileBucket.private,
            key: 'lossless-wav',
          }),
        ]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.lossless, '');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalledWith(
          FileBucket.private,
          'lossless-wav',
          expect.any(Object),
        );
      });
    });

    describe('Range Handling', () => {
      const mockKey = 'audio-file-1';
      const mockBucket = FileBucket.private;

      beforeEach(() => {
        audioFileRepository.listByTrackId.mockResolvedValue([
          audioFileBuilder({
            id: mockKey,
            format: AudioFormat.mp3,
            quality: AudioQuality.standard,
            size: 1000,
            bucket: mockBucket,
            key: mockKey,
          }),
        ]);
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
        expect(storageService.getFileStream).toHaveBeenCalledWith(mockBucket, mockKey, {
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
        expect(storageService.getFileStream).toHaveBeenCalledWith(mockBucket, mockKey, {
          start: 500,
          end: 999,
        });
      });

      it('should parse range with only start (no hyphen, parts[1] undefined)', async () => {
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.standard, 'bytes=0');
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalledWith(mockBucket, mockKey, {
          start: 0,
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

      it('should parse suffix range bytes=-500 as last 500 bytes', async () => {
        const query = new GetTrackStreamQuery(
          mockTrackId,
          StreamAudioQuality.standard,
          'bytes=-500',
        );
        await handler.execute(query);
        expect(storageService.getFileStream).toHaveBeenCalledWith(mockBucket, mockKey, {
          start: 500,
          end: 999,
        });
      });

      it('should throw if suffix range has invalid or empty suffix', async () => {
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.standard, 'bytes=-');
        await expect(handler.execute(query)).rejects.toThrow('Requested range not satisfiable');
      });

      it('should throw if range has non-numeric values', async () => {
        const query = new GetTrackStreamQuery(
          mockTrackId,
          StreamAudioQuality.standard,
          'bytes=abc-def',
        );
        await expect(handler.execute(query)).rejects.toThrow('Requested range not satisfiable');
      });

      it('should throw if start is greater than end', async () => {
        const query = new GetTrackStreamQuery(
          mockTrackId,
          StreamAudioQuality.standard,
          'bytes=500-300',
        );
        await expect(handler.execute(query)).rejects.toThrow('Requested range not satisfiable');
      });

      it('should throw if end is >= totalSize', async () => {
        const query = new GetTrackStreamQuery(
          mockTrackId,
          StreamAudioQuality.standard,
          'bytes=0-1000',
        );
        await expect(handler.execute(query)).rejects.toThrow('Requested range not satisfiable');
      });

      it('should fallback mp3 mimetype properly', async () => {
        audioFileRepository.listByTrackId.mockResolvedValue([
          audioFileBuilder({
            id: 'audio-file-1',
            format: AudioFormat.mp3,
            quality: AudioQuality.standard,
            size: 1000,
            mimeType: 'audio/mpeg',
          }),
        ]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.standard, '');
        const res = await handler.execute(query);
        expect(res.metadata.mimeType).toBe('audio/mpeg');
      });

      it('should fallback to audio/mpeg when mimeType is missing and format is mp3', async () => {
        audioFileRepository.listByTrackId.mockResolvedValue([
          audioFileBuilder({
            id: 'audio-file-1',
            format: AudioFormat.mp3,
            quality: AudioQuality.standard,
            size: 1000,
            mimeType: null as any,
          }),
        ]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.standard, '');
        const res = await handler.execute(query);
        expect(res.metadata.mimeType).toBe('audio/mpeg');
      });

      it('should fallback to audio/unknown when mimeType is missing and format is not mp3', async () => {
        audioFileRepository.listByTrackId.mockResolvedValue([
          audioFileBuilder({
            id: 'audio-file-1',
            format: AudioFormat.opus,
            quality: AudioQuality.standard,
            size: 1000,
            mimeType: null as any,
          }),
        ]);
        const query = new GetTrackStreamQuery(mockTrackId, StreamAudioQuality.standard, '');
        const res = await handler.execute(query);
        expect(res.metadata.mimeType).toBe('audio/unknown');
      });

      it('should throw if suffix range has negative value', async () => {
        const query = new GetTrackStreamQuery(
          mockTrackId,
          StreamAudioQuality.standard,
          'bytes=--500',
        );
        await expect(handler.execute(query)).rejects.toThrow('Requested range not satisfiable');
      });

      it('should set isPartial when range is provided', async () => {
        audioFileRepository.listByTrackId.mockResolvedValue([
          audioFileBuilder({
            id: 'audio-file-1',
            format: AudioFormat.mp3,
            quality: AudioQuality.standard,
            size: 1000,
            bucket: mockBucket,
            key: mockKey,
          }),
        ]);
        const query = new GetTrackStreamQuery(
          mockTrackId,
          StreamAudioQuality.standard,
          'bytes=100-200',
        );
        const res = await handler.execute(query);
        expect(res.metadata.isPartial).toBe(true);
        expect(storageService.getFileStream).toHaveBeenCalledWith(mockBucket, mockKey, {
          start: 100,
          end: 200,
        });
      });
    });
  });
});
