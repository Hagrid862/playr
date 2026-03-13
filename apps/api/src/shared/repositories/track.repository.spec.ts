import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient, Track } from '@repo/db';
// @ts-expect-error - ignore type errors from testing package imports
import { buildTrack } from '@repo/testing';
import { PrismaService } from '../services/prisma.service';
import { TrackRepository } from './track.repository';

describe('TrackRepository', () => {
  let repository: TrackRepository;
  let mockTx: DeepMocked<PrismaClient>;

  const mockTrack: Track = buildTrack({
    id: 'track-123',
    albumId: 'album-123',
  });

  beforeEach(async () => {
    mockTx = createMock<PrismaClient>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackRepository,
        {
          provide: PrismaService,
          useValue: {
            client: mockTx,
            mainClient: mockTx,
          },
        },
      ],
    }).compile();

    repository = module.get<TrackRepository>(TrackRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return track matching where clause', async () => {
      mockTx.track.findFirst.mockResolvedValue(mockTrack);
      const result = await repository.findOne({ id: 'track-123' });
      expect(result).toEqual(mockTrack);
      expect(mockTx.track.findFirst).toHaveBeenCalledWith({
        where: { id: 'track-123', deletedAt: null },
        include: undefined,
      });
    });

    it('should include relations when requested', async () => {
      mockTx.track.findFirst.mockResolvedValue(mockTrack);
      const result = await repository.findOne({ id: 'track-123' }, true);
      expect(result).toEqual(mockTrack);
      expect(mockTx.track.findFirst).toHaveBeenCalledWith({
        where: { id: 'track-123', deletedAt: null },
        include: { artists: true, album: true, access: true },
      });
    });
  });

  describe('findMany', () => {
    it('should return multiple tracks matching options', async () => {
      mockTx.track.findMany.mockResolvedValue([mockTrack]);
      const result = await repository.findMany({ take: 5 });
      expect(result).toEqual([mockTrack]);
      expect(mockTx.track.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        take: 5,
        skip: undefined,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('checkAccess', () => {
    it('should return true if track matches access conditions (Public)', async () => {
      mockTx.track.findFirst.mockResolvedValue(buildTrack({ id: 'track-123' }));
      const result = await repository.checkAccess('track-123');
      expect(result).toBe(true);
      expect(mockTx.track.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { visibility: 'public' },
              expect.objectContaining({ access: { some: { userId: 'GUEST' } } }),
              expect.objectContaining({ album: { access: { some: { userId: 'GUEST' } } } }),
              expect.objectContaining({
                artists: { some: { access: { some: { userId: 'GUEST' } } } },
              }),
            ]),
          }),
        }),
      );
    });

    it('should return true if user has access', async () => {
      mockTx.track.findFirst.mockResolvedValue(buildTrack({ id: 'track-123' }));
      const result = await repository.checkAccess('track-123', 'user-123');
      expect(result).toBe(true);
    });

    it('should return false if no access', async () => {
      mockTx.track.findFirst.mockResolvedValue(null);
      const result = await repository.checkAccess('track-123', 'user-123');
      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('should create a track', async () => {
      mockTx.track.create.mockResolvedValue(mockTrack);
      const data = {
        title: 'New Track',
        album: { connect: { id: 'album-123' } },
      };
      const result = await repository.create(data);
      expect(result).toEqual(mockTrack);
      expect(mockTx.track.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('update', () => {
    it('should update a track', async () => {
      mockTx.track.update.mockResolvedValue(mockTrack);
      const data = { title: 'Updated' };
      const result = await repository.update('track-123', data);
      expect(result).toEqual(mockTrack);
      expect(mockTx.track.update).toHaveBeenCalledWith({ where: { id: 'track-123' }, data });
    });
  });

  describe('delete', () => {
    it('should delete a track', async () => {
      mockTx.track.delete.mockResolvedValue(mockTrack);
      const result = await repository.delete('track-123');
      expect(result).toEqual(mockTrack);
      expect(mockTx.track.delete).toHaveBeenCalledWith({ where: { id: 'track-123' } });
    });
  });
});
