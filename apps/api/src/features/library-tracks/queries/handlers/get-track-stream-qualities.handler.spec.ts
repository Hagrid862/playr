import { PrismaService } from '@/shared/services/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { StreamAudioQuality } from '@repo/contracts';
import { AudioFormat, AudioQuality } from '@repo/db';
import { audioFileBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
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
        audioFileBuilder({ format: AudioFormat.flac, quality: AudioQuality.original }),
        audioFileBuilder({ format: AudioFormat.wav, quality: AudioQuality.original }),
        audioFileBuilder({ format: AudioFormat.mp3, quality: AudioQuality.high }),
        audioFileBuilder({ format: AudioFormat.opus, quality: AudioQuality.standard }),
        audioFileBuilder({ format: AudioFormat.mp3, quality: AudioQuality.low }),
      ]);

      const result = await handler.execute(new GetTrackStreamQualitiesQuery('track-1'));

      expect(result).toContain(StreamAudioQuality.lossless);
      expect(result).toContain(StreamAudioQuality.high);
      expect(result).toContain(StreamAudioQuality.standard);
      expect(result).toContain(StreamAudioQuality.low);
      expect(result.length).toBe(4); // Set ensures no duplicates for lossless
    });

    it('should normalize uppercase formats and qualities to StreamAudioQuality values', async () => {
      prismaService.client.audioFile.findMany.mockResolvedValue([
        audioFileBuilder({ format: AudioFormat.flac, quality: AudioQuality.original }),
        // @ts-expect-error - we are testing the normalization of uppercase formats and qualities
        audioFileBuilder({ format: 'MP3', quality: 'HIGH' }),
        // @ts-expect-error - we are testing normalization of null format and quality values
        audioFileBuilder({ format: null, quality: null }),
      ]);

      const result = await handler.execute(new GetTrackStreamQualitiesQuery('track-1'));

      expect(result).toContain(StreamAudioQuality.lossless);
      expect(result).toContain(StreamAudioQuality.high);
      expect(result.length).toBe(2);
    });
  });
});
