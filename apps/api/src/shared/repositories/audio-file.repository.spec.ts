import { buildOwnerScopedCountableAudioFileWhere } from '@/features/audio-processing/audio-processing.storage-quota';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioFileRepository } from './audio-file.repository';
import { PrismaService } from '../services/prisma.service';
import {
  AudioFile,
  AudioFormat,
  AudioQuality,
  FileBucket,
  Prisma,
  ProcessingStatus,
} from '@repo/db';

type AudioFileSizeSumAggregateResult = {
  _sum: {
    size: number | null;
  };
};

type AudioFileWithTrackDeletedAt = AudioFile & {
  track: { deletedAt: Date | null };
};

const toSizeSumAggregate = (size: number | null): AudioFileSizeSumAggregateResult => ({
  _sum: { size },
});

describe('AudioFileRepository', () => {
  let repository: AudioFileRepository;
  let prismaService: PrismaService;
  let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;
  let mockMainClient: ReturnType<typeof createMockPrismaClient>;

  const createMockPrismaClient = () => ({
    audioFile: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createManyAndReturn: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(),
  });

  beforeEach(() => {
    mockPrismaClient = createMockPrismaClient();
    mockMainClient = createMockPrismaClient();

    const mockPrismaService = {
      get client() {
        return mockPrismaClient;
      },
      get mainClient() {
        return mockMainClient;
      },
    } as unknown as PrismaService;

    prismaService = mockPrismaService;
    repository = new AudioFileRepository(prismaService);
  });

  const mockAudioFile: AudioFile = {
    id: 'audio-1',
    bucket: FileBucket.private,
    key: 'tracks/track-1/song.mp3',
    url: null,
    mimeType: 'audio/mpeg',
    size: 1000000,
    format: AudioFormat.mp3,
    duration: 180,
    bitrate: 320,
    sampleRate: 44100,
    channels: 2,
    isOriginal: true,
    waveformJson: null,
    trackId: 'track-1',
    quality: AudioQuality.original,
    status: ProcessingStatus.complete,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  describe('getById', () => {
    it('should return audio file by id without include', async () => {
      const audioFileWithTrack: AudioFileWithTrackDeletedAt = {
        ...mockAudioFile,
        track: { deletedAt: null },
      };
      mockPrismaClient.audioFile.findUnique.mockResolvedValue(audioFileWithTrack);

      const result = await repository.getById('audio-1');

      expect(result).toEqual(mockAudioFile);
      expect(mockPrismaClient.audioFile.findUnique).toHaveBeenCalledWith({
        where: { id: 'audio-1' },
        include: { track: { select: { deletedAt: true } } },
      });
    });

    it('should return audio file with custom include', async () => {
      const audioFileWithInclude = { ...mockAudioFile, track: { deletedAt: null, id: 'track-1' } };
      mockPrismaClient.audioFile.findUnique.mockResolvedValue(
        audioFileWithInclude as unknown as AudioFile,
      );

      const result = await repository.getById('audio-1', { include: { track: true } });

      expect(result).toEqual(audioFileWithInclude);
    });

    it('should return null if audio file not found', async () => {
      mockPrismaClient.audioFile.findUnique.mockResolvedValue(null);

      const result = await repository.getById('non-existent');

      expect(result).toBeNull();
    });

    it('should return null if track is soft-deleted', async () => {
      mockPrismaClient.audioFile.findUnique.mockResolvedValue({
        ...mockAudioFile,
        track: { deletedAt: new Date() },
      } as unknown as AudioFile);

      const result = await repository.getById('audio-1');

      expect(result).toBeNull();
    });

    it('should include track when track include is true', async () => {
      const audioFileWithTrack = { ...mockAudioFile, track: { deletedAt: null, id: 'track-1' } };
      mockPrismaClient.audioFile.findUnique.mockResolvedValue(
        audioFileWithTrack as unknown as AudioFile,
      );

      const result = await repository.getById('audio-1', { include: { track: true } });

      expect(result).toEqual(audioFileWithTrack);
    });

    it('should merge deletedAt into existing track select', async () => {
      const audioFileWithTrack = {
        ...mockAudioFile,
        track: { deletedAt: null, id: 'track-1', name: 'Track' },
      };
      mockPrismaClient.audioFile.findUnique.mockResolvedValue(
        audioFileWithTrack as unknown as AudioFile,
      );

      const result = await repository.getById('audio-1', {
        include: { track: { select: { id: true, name: true } } },
      });

      expect(result).toEqual(audioFileWithTrack);
    });

    it('should add track select when include exists but has no track property', async () => {
      const audioFileWithTrack = { ...mockAudioFile, track: { deletedAt: null } };
      mockPrismaClient.audioFile.findUnique.mockResolvedValue(
        audioFileWithTrack as unknown as AudioFile,
      );

      const result = await repository.getById('audio-1', { include: {} });

      expect(result).toEqual(mockAudioFile);
      expect(mockPrismaClient.audioFile.findUnique).toHaveBeenCalledWith({
        where: { id: 'audio-1' },
        include: { track: { select: { deletedAt: true } } },
      });
    });

    it('should return include unchanged when track is object without select', async () => {
      const audioFileWithTrack = { ...mockAudioFile, track: { deletedAt: null, id: 'track-1' } };
      mockPrismaClient.audioFile.findUnique.mockResolvedValue(
        audioFileWithTrack as unknown as AudioFile,
      );

      const result = await repository.getById('audio-1', {
        include: { track: { include: { album: true } } },
      });

      expect(result).toEqual(audioFileWithTrack);
      expect(mockPrismaClient.audioFile.findUnique).toHaveBeenCalledWith({
        where: { id: 'audio-1' },
        include: { track: { include: { album: true } } },
      });
    });
  });

  describe('listByTrackId', () => {
    it('should return audio files for track without status filter', async () => {
      mockPrismaClient.audioFile.findMany.mockResolvedValue([mockAudioFile]);

      const result = await repository.listByTrackId('track-1');

      expect(result).toEqual([mockAudioFile]);
      expect(mockPrismaClient.audioFile.findMany).toHaveBeenCalledWith({
        where: {
          trackId: 'track-1',
          track: { deletedAt: null },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return audio files for track with status filter', async () => {
      mockPrismaClient.audioFile.findMany.mockResolvedValue([mockAudioFile]);

      const result = await repository.listByTrackId('track-1', {
        status: ProcessingStatus.complete,
      });

      expect(result).toEqual([mockAudioFile]);
      expect(mockPrismaClient.audioFile.findMany).toHaveBeenCalledWith({
        where: {
          trackId: 'track-1',
          track: { deletedAt: null },
          status: ProcessingStatus.complete,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return audio files when status is explicitly undefined', async () => {
      mockPrismaClient.audioFile.findMany.mockResolvedValue([mockAudioFile]);

      const result = await repository.listByTrackId('track-1', { status: undefined });

      expect(result).toEqual([mockAudioFile]);
      expect(mockPrismaClient.audioFile.findMany).toHaveBeenCalledWith({
        where: {
          trackId: 'track-1',
          track: { deletedAt: null },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return audio files with empty options object', async () => {
      mockPrismaClient.audioFile.findMany.mockResolvedValue([mockAudioFile]);

      const result = await repository.listByTrackId('track-1', {});

      expect(result).toEqual([mockAudioFile]);
      expect(mockPrismaClient.audioFile.findMany).toHaveBeenCalledWith({
        where: {
          trackId: 'track-1',
          track: { deletedAt: null },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return audio files with include', async () => {
      const audioFileWithInclude = { ...mockAudioFile, track: { id: 'track-1' } };
      mockPrismaClient.audioFile.findMany.mockResolvedValue([
        audioFileWithInclude,
      ] as unknown as AudioFile[]);

      const result = await repository.listByTrackId('track-1', { include: { track: true } });

      expect(result).toEqual([audioFileWithInclude]);
      expect(mockPrismaClient.audioFile.findMany).toHaveBeenCalledWith({
        where: {
          trackId: 'track-1',
          track: { deletedAt: null },
        },
        include: { track: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return audio files with custom orderBy', async () => {
      mockPrismaClient.audioFile.findMany.mockResolvedValue([mockAudioFile]);
      const orderBy = { createdAt: 'asc' } as Prisma.AudioFileOrderByWithRelationInput;

      const result = await repository.listByTrackId('track-1', { orderBy });

      expect(result).toEqual([mockAudioFile]);
      expect(mockPrismaClient.audioFile.findMany).toHaveBeenCalledWith({
        where: {
          trackId: 'track-1',
          track: { deletedAt: null },
        },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('getPaginated', () => {
    it('should return paginated audio files without filter or orderBy', async () => {
      mockPrismaClient.audioFile.findMany.mockResolvedValue([mockAudioFile]);

      const result = await repository.getPaginated(1, 10);

      expect(result).toEqual([mockAudioFile]);
      expect(mockPrismaClient.audioFile.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: undefined,
        orderBy: undefined,
      });
    });

    it('should return paginated audio files with filter and orderBy', async () => {
      mockPrismaClient.audioFile.findMany.mockResolvedValue([mockAudioFile]);
      const filter = { status: ProcessingStatus.complete } as Prisma.AudioFileWhereInput;
      const orderBy = { createdAt: 'desc' } as Prisma.AudioFileOrderByWithRelationInput;

      const result = await repository.getPaginated(2, 5, filter, orderBy);

      expect(result).toEqual([mockAudioFile]);
      expect(mockPrismaClient.audioFile.findMany).toHaveBeenCalledWith({
        take: 5,
        skip: 5,
        where: filter,
        orderBy,
      });
    });

    it('should return paginated audio files with include', async () => {
      const audioFileWithInclude = { ...mockAudioFile, track: { id: 'track-1' } };
      mockPrismaClient.audioFile.findMany.mockResolvedValue([
        audioFileWithInclude,
      ] as unknown as AudioFile[]);

      const result = await repository.getPaginated(1, 10, undefined, undefined, {
        include: { track: true },
      });

      expect(result).toEqual([audioFileWithInclude]);
      expect(mockPrismaClient.audioFile.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: undefined,
        orderBy: undefined,
        include: { track: true },
      });
    });
  });

  describe('exists', () => {
    it('should return true if audio file exists', async () => {
      mockPrismaClient.audioFile.count.mockResolvedValue(1);

      const result = await repository.exists('audio-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.audioFile.count).toHaveBeenCalledWith({
        where: { id: 'audio-1', track: { deletedAt: null } },
      });
    });

    it('should return false if audio file does not exist', async () => {
      mockPrismaClient.audioFile.count.mockResolvedValue(0);

      const result = await repository.exists('audio-1');

      expect(result).toBe(false);
    });
  });

  describe('sumCountableBytesByOwnerUserId', () => {
    it('sums countable audio file bytes for the track owner', async () => {
      mockPrismaClient.audioFile.aggregate.mockResolvedValue(toSizeSumAggregate(5_000_000));

      const result = await repository.sumCountableBytesByOwnerUserId('user-1');

      expect(result).toBe(5_000_000);
      expect(mockPrismaClient.audioFile.aggregate).toHaveBeenCalledWith({
        _sum: { size: true },
        where: buildOwnerScopedCountableAudioFileWhere('user-1'),
      });
    });

    it('returns zero when aggregate sum is null', async () => {
      mockPrismaClient.audioFile.aggregate.mockResolvedValue(toSizeSumAggregate(null));

      const result = await repository.sumCountableBytesByOwnerUserId('user-1');

      expect(result).toBe(0);
    });
  });

  describe('count', () => {
    it('should count audio files without filter', async () => {
      mockPrismaClient.audioFile.count.mockResolvedValue(5);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(mockPrismaClient.audioFile.count).toHaveBeenCalledWith({
        where: undefined,
      });
    });

    it('should count audio files with filter', async () => {
      mockPrismaClient.audioFile.count.mockResolvedValue(3);
      const filter = { status: ProcessingStatus.complete } as Prisma.AudioFileWhereInput;

      const result = await repository.count(filter);

      expect(result).toBe(3);
      expect(mockPrismaClient.audioFile.count).toHaveBeenCalledWith({
        where: filter,
      });
    });
  });

  describe('create', () => {
    it('should create audio file without include', async () => {
      const createInput: Prisma.AudioFileCreateInput = {
        bucket: FileBucket.private,
        key: 'tracks/track-1/new.mp3',
        mimeType: 'audio/mpeg',
        size: 1000,
        format: AudioFormat.mp3,
        isOriginal: true,
        quality: AudioQuality.original,
        status: ProcessingStatus.pending,
        track: { connect: { id: 'track-1' } },
      };
      mockPrismaClient.audioFile.create.mockResolvedValue(mockAudioFile);

      const result = await repository.create(createInput);

      expect(result).toEqual(mockAudioFile);
      expect(mockPrismaClient.audioFile.create).toHaveBeenCalledWith({
        data: createInput,
      });
    });

    it('should create audio file with include', async () => {
      const createInput: Prisma.AudioFileCreateInput = {
        bucket: FileBucket.private,
        key: 'tracks/track-1/new.mp3',
        mimeType: 'audio/mpeg',
        size: 1000,
        format: AudioFormat.mp3,
        isOriginal: true,
        quality: AudioQuality.original,
        status: ProcessingStatus.pending,
        track: { connect: { id: 'track-1' } },
      };
      const audioFileWithInclude = { ...mockAudioFile, track: { id: 'track-1' } };
      mockPrismaClient.audioFile.create.mockResolvedValue(
        audioFileWithInclude as unknown as AudioFile,
      );

      const result = await repository.create(createInput, { include: { track: true } });

      expect(result).toEqual(audioFileWithInclude);
      expect(mockPrismaClient.audioFile.create).toHaveBeenCalledWith({
        data: createInput,
        include: { track: true },
      });
    });
  });

  describe('createMany', () => {
    it('should create many audio files without include', async () => {
      const createInputs: Prisma.AudioFileCreateManyInput[] = [
        {
          trackId: 'track-1',
          bucket: FileBucket.private,
          key: 'tracks/track-1/file1.mp3',
          mimeType: 'audio/mpeg',
          size: 1000,
          format: AudioFormat.mp3,
          isOriginal: true,
          quality: AudioQuality.original,
          status: ProcessingStatus.pending,
        },
        {
          trackId: 'track-1',
          bucket: FileBucket.private,
          key: 'tracks/track-1/file2.mp3',
          mimeType: 'audio/mpeg',
          size: 1000,
          format: AudioFormat.mp3,
          isOriginal: true,
          quality: AudioQuality.original,
          status: ProcessingStatus.pending,
        },
      ];
      mockPrismaClient.audioFile.createManyAndReturn.mockResolvedValue([mockAudioFile]);

      const result = await repository.createMany(createInputs);

      expect(result).toEqual([mockAudioFile]);
      expect(mockPrismaClient.audioFile.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
      });
    });

    it('should create many audio files with include', async () => {
      const createInputs: Prisma.AudioFileCreateManyInput[] = [
        {
          trackId: 'track-1',
          bucket: FileBucket.private,
          key: 'tracks/track-1/file1.mp3',
          mimeType: 'audio/mpeg',
          size: 1000,
          format: AudioFormat.mp3,
          isOriginal: true,
          quality: AudioQuality.original,
          status: ProcessingStatus.pending,
        },
      ];
      const audioFilesWithInclude = [{ ...mockAudioFile, track: { id: 'track-1' } }];
      mockPrismaClient.audioFile.createManyAndReturn.mockResolvedValue(
        audioFilesWithInclude as unknown as AudioFile[],
      );

      const result = await repository.createMany(createInputs, { include: { track: true } });

      expect(result).toEqual(audioFilesWithInclude);
      expect(mockPrismaClient.audioFile.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
        include: { track: true },
      });
    });
  });

  describe('update', () => {
    it('should update audio file without include', async () => {
      const updateInput: Prisma.AudioFileUpdateInput = { key: 'tracks/track-1/updated.mp3' };
      mockPrismaClient.audioFile.update.mockResolvedValue(mockAudioFile);

      const result = await repository.update('audio-1', updateInput);

      expect(result).toEqual(mockAudioFile);
      expect(mockPrismaClient.audioFile.update).toHaveBeenCalledWith({
        where: { id: 'audio-1' },
        data: updateInput,
      });
    });

    it('should update audio file with include', async () => {
      const updateInput: Prisma.AudioFileUpdateInput = { key: 'tracks/track-1/updated.mp3' };
      const audioFileWithInclude = { ...mockAudioFile, track: { id: 'track-1' } };
      mockPrismaClient.audioFile.update.mockResolvedValue(
        audioFileWithInclude as unknown as AudioFile,
      );

      const result = await repository.update('audio-1', updateInput, { include: { track: true } });

      expect(result).toEqual(audioFileWithInclude);
      expect(mockPrismaClient.audioFile.update).toHaveBeenCalledWith({
        where: { id: 'audio-1' },
        data: updateInput,
        include: { track: true },
      });
    });
  });

  describe('updateMany', () => {
    it('should update many audio files without include', async () => {
      const updates = [
        {
          id: 'audio-1',
          data: { key: 'tracks/track-1/updated1.mp3' } as Prisma.AudioFileUpdateInput,
        },
        {
          id: 'audio-2',
          data: { key: 'tracks/track-1/updated2.mp3' } as Prisma.AudioFileUpdateInput,
        },
      ];
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.audioFile.update.mockResolvedValue(mockAudioFile);

      const result = await repository.updateMany(updates);

      expect(mockMainClient.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should update many audio files with include', async () => {
      const updates = [
        {
          id: 'audio-1',
          data: { key: 'tracks/track-1/updated1.mp3' } as Prisma.AudioFileUpdateInput,
        },
      ];
      const audioFileWithInclude = { ...mockAudioFile, track: { id: 'track-1' } };
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.audioFile.update.mockResolvedValue(
        audioFileWithInclude as unknown as AudioFile,
      );

      const result = await repository.updateMany(updates, { include: { track: true } });

      expect(mockMainClient.$transaction).toHaveBeenCalled();
      expect(result).toEqual([audioFileWithInclude]);
    });
  });

  describe('delete', () => {
    it('should hard delete audio file', async () => {
      mockPrismaClient.audioFile.delete.mockResolvedValue(mockAudioFile);

      const result = await repository.delete('audio-1');

      expect(result).toEqual(mockAudioFile);
      expect(mockPrismaClient.audioFile.delete).toHaveBeenCalledWith({
        where: { id: 'audio-1' },
      });
    });
  });

  describe('deleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.deleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.audioFile.findMany).not.toHaveBeenCalled();
    });

    it('should hard delete many audio files', async () => {
      mockPrismaClient.audioFile.findMany.mockResolvedValue([mockAudioFile]);
      mockPrismaClient.audioFile.deleteMany.mockResolvedValue({ count: 1 });

      const result = await repository.deleteMany(['audio-1', 'audio-2']);

      expect(result).toEqual([mockAudioFile]);
      expect(mockPrismaClient.audioFile.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['audio-1', 'audio-2'] } },
      });
      expect(mockPrismaClient.audioFile.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['audio-1', 'audio-2'] } },
      });
    });
  });
});
