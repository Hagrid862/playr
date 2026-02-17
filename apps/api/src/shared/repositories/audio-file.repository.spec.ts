import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AudioFile, PrismaClient } from '@repo/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../services/prisma.service';
import { AudioFileRepository } from './audio-file.repository';

describe('AudioFileRepository', () => {
  let repository: AudioFileRepository;
  let mockTx: DeepMocked<PrismaClient>;

  const mockAudioFile: AudioFile = {
    id: 'audio-123',
    bucket: 'private',
    key: 'tracks/track-123/audio.mp3',
    url: 'http://localhost:9000/private/tracks/track-123/audio.mp3',
    mimeType: 'audio/mpeg',
    size: 5242880,
    format: 'mp3',
    duration: 180.5,
    bitrate: 320000,
    sampleRate: 44100,
    channels: 2,
    waveformJson: '[0.1, 0.2, 0.3]',
    trackId: 'track-123',
    quality: 'original',
    status: 'complete',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockTx = createMock<PrismaClient>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AudioFileRepository,
        {
          provide: PrismaService,
          useValue: {
            client: mockTx,
            mainClient: mockTx,
          },
        },
      ],
    }).compile();

    repository = module.get<AudioFileRepository>(AudioFileRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return audio file matching where clause', async () => {
      mockTx.audioFile.findFirst.mockResolvedValue(mockAudioFile);
      const result = await repository.findOne({ id: 'audio-123' });
      expect(result).toEqual(mockAudioFile);
      expect(mockTx.audioFile.findFirst).toHaveBeenCalledWith({
        where: { id: 'audio-123' },
        include: undefined,
      });
    });

    it('should include relations when requested', async () => {
      mockTx.audioFile.findFirst.mockResolvedValue(mockAudioFile);
      const result = await repository.findOne({ id: 'audio-123' }, true);
      expect(result).toEqual(mockAudioFile);
      expect(mockTx.audioFile.findFirst).toHaveBeenCalledWith({
        where: { id: 'audio-123' },
        include: { track: true },
      });
    });
  });

  describe('findMany', () => {
    it('should return multiple audio files matching options', async () => {
      mockTx.audioFile.findMany.mockResolvedValue([mockAudioFile]);
      const result = await repository.findMany({ take: 5 });
      expect(result).toEqual([mockAudioFile]);
      expect(mockTx.audioFile.findMany).toHaveBeenCalledWith({
        take: 5,
        skip: undefined,
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('exists', () => {
    it('should return true if audio file exists', async () => {
      mockTx.audioFile.count.mockResolvedValue(1);
      const result = await repository.exists({ id: 'audio-123' });
      expect(result).toBe(true);
      expect(mockTx.audioFile.count).toHaveBeenCalledWith({ where: { id: 'audio-123' } });
    });

    it('should return false if audio file does not exist', async () => {
      mockTx.audioFile.count.mockResolvedValue(0);
      const result = await repository.exists({ id: 'audio-123' });
      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should return count of audio files', async () => {
      mockTx.audioFile.count.mockResolvedValue(10);
      const result = await repository.count();
      expect(result).toBe(10);
      expect(mockTx.audioFile.count).toHaveBeenCalledWith({ where: undefined });
    });
  });

  describe('create', () => {
    it('should create an audio file', async () => {
      mockTx.audioFile.create.mockResolvedValue(mockAudioFile);
      const data = { key: 'test' } as any;
      const result = await repository.create(data);
      expect(result).toEqual(mockAudioFile);
      expect(mockTx.audioFile.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('update', () => {
    it('should update an audio file', async () => {
      mockTx.audioFile.update.mockResolvedValue(mockAudioFile);
      const data = { status: 'processing' } as any;
      const result = await repository.update('audio-123', data);
      expect(result).toEqual(mockAudioFile);
      expect(mockTx.audioFile.update).toHaveBeenCalledWith({ where: { id: 'audio-123' }, data });
    });
  });

  describe('delete', () => {
    it('should delete an audio file', async () => {
      mockTx.audioFile.delete.mockResolvedValue(mockAudioFile);
      const result = await repository.delete('audio-123');
      expect(result).toEqual(mockAudioFile);
      expect(mockTx.audioFile.delete).toHaveBeenCalledWith({ where: { id: 'audio-123' } });
    });
  });
});
