import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/shared/services/prisma.service';
import { StreamAudioQuality } from '@repo/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetTrackStreamQualitiesHandler } from './get-track-stream-qualities.handler';
import { GetTrackStreamQualitiesQuery } from '../impl/get-track-stream-qualities.query';

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
        { format: 'flac', quality: 'original' },
        { format: 'wav', quality: 'original' },
        { format: 'mp3', quality: 'high' },
        { format: 'opus', quality: 'standard' },
        { format: 'mp3', quality: 'low' },
      ] as any);

      const result = await handler.execute(new GetTrackStreamQualitiesQuery('track-1'));

      expect(result).toContain(StreamAudioQuality.lossless);
      expect(result).toContain(StreamAudioQuality.high);
      expect(result).toContain(StreamAudioQuality.standard);
      expect(result).toContain(StreamAudioQuality.low);
      expect(result.length).toBe(4); // Set ensures no duplicates for lossless
    });

    it('should ignore uppercase qualities or handle formats gracefully', async () => {
      prismaService.client.audioFile.findMany.mockResolvedValue([
        { format: 'FLAC', quality: 'ORIGINAL' },
        { format: 'MP3', quality: 'HIGH' },
        { format: null, quality: null },
      ] as any);

      const result = await handler.execute(new GetTrackStreamQualitiesQuery('track-1'));

      expect(result).toContain(StreamAudioQuality.lossless);
      expect(result).toContain(StreamAudioQuality.high);
      expect(result.length).toBe(2);
    });
  });
});
