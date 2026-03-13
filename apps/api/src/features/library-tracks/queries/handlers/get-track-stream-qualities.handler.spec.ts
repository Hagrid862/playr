import { PrismaService } from '@/shared/services/prisma.service';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { StreamAudioQuality } from '@repo/contracts';
import { AudioFormat, AudioQuality } from '@repo/db';
// @ts-expect-error - ignore type errors from testing package imports
import { buildAudioFile } from '@repo/testing';
import { GetTrackStreamQualitiesQuery } from '../impl/get-track-stream-qualities.query';
import { GetTrackStreamQualitiesHandler } from './get-track-stream-qualities.handler';

describe('GetTrackStreamQualitiesHandler', () => {
  let handler: GetTrackStreamQualitiesHandler;
  let prismaService: DeepMocked<PrismaService>;

  beforeEach(async () => {
    prismaService = createMock<PrismaService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTrackStreamQualitiesHandler,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    handler = module.get<GetTrackStreamQualitiesHandler>(GetTrackStreamQualitiesHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return empty array if no files found', async () => {
      prismaService.client.audioFile.findMany.mockResolvedValue([]);

      const result = await handler.execute(new GetTrackStreamQualitiesQuery('track-1'));
      expect(result).toEqual([]);
    });

    it('should correctly map audio formats to qualities', async () => {
      prismaService.client.audioFile.findMany.mockResolvedValue([
        buildAudioFile({ format: AudioFormat.flac, quality: AudioQuality.original }),
        buildAudioFile({ format: AudioFormat.wav, quality: AudioQuality.original }),
        buildAudioFile({ format: AudioFormat.mp3, quality: AudioQuality.high }),
        buildAudioFile({ format: AudioFormat.opus, quality: AudioQuality.standard }),
        buildAudioFile({ format: AudioFormat.mp3, quality: AudioQuality.low }),
      ]);

      const result = await handler.execute(new GetTrackStreamQualitiesQuery('track-1'));

      expect(result).toContain(StreamAudioQuality.lossless);
      expect(result).toContain(StreamAudioQuality.high);
      expect(result).toContain(StreamAudioQuality.standard);
      expect(result).toContain(StreamAudioQuality.low);
      expect(result.length).toBe(4); // Set ensures no duplicates for lossless
    });

    it('should normalize uppercase formats and qualities to StreamAudioQuality values', async () => {
      // Prisma may return uppercase enum strings; handler normalizes them
      prismaService.client.audioFile.findMany.mockResolvedValue(
        JSON.parse(
          '[{"format":"FLAC","quality":"ORIGINAL"},{"format":"MP3","quality":"HIGH"},{"format":null,"quality":null}]',
        ),
      );

      const result = await handler.execute(new GetTrackStreamQualitiesQuery('track-1'));

      expect(result).toContain(StreamAudioQuality.lossless);
      expect(result).toContain(StreamAudioQuality.high);
      expect(result.length).toBe(2);
    });
  });
});
