import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { LibraryTrack, PrismaClient } from '@repo/db';
// @ts-expect-error - ignore type errors from testing package imports
import { buildLibraryTrack } from '@repo/testing';
import { PrismaService } from '../services/prisma.service';
import { LibraryTrackRepository } from './library-track.repository';

describe('LibraryTrackRepository', () => {
  let repository: LibraryTrackRepository;
  let mockTx: DeepMocked<PrismaClient>;

  const mockLibraryTrack: LibraryTrack = buildLibraryTrack();

  beforeEach(async () => {
    mockTx = createMock<PrismaClient>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibraryTrackRepository,
        {
          provide: PrismaService,
          useValue: {
            client: mockTx,
            mainClient: mockTx,
          },
        },
      ],
    }).compile();

    repository = module.get<LibraryTrackRepository>(LibraryTrackRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return library track matching where clause', async () => {
      mockTx.libraryTrack.findFirst.mockResolvedValue(mockLibraryTrack);
      const result = await repository.findOne({ id: 'lib-track-123' });
      expect(result).toEqual(mockLibraryTrack);
      expect(mockTx.libraryTrack.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'lib-track-123' }),
        }),
      );
    });

    it('should handle track filter in where clause', async () => {
      mockTx.libraryTrack.findFirst.mockResolvedValue(mockLibraryTrack);
      const result = await repository.findOne({
        // Cast needed because Prisma where input has nested types
        track: { title: 'test' },
      });
      expect(result).toEqual(mockLibraryTrack);
      expect(mockTx.libraryTrack.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            track: expect.objectContaining({ title: 'test', deletedAt: null }),
          }),
        }),
      );
    });
  });

  describe('findMany', () => {
    it('should return multiple library tracks matching options', async () => {
      mockTx.libraryTrack.findMany.mockResolvedValue([mockLibraryTrack]);
      const result = await repository.findMany({ take: 5 });
      expect(result).toEqual([mockLibraryTrack]);
      expect(mockTx.libraryTrack.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });

    it('should handle track filter in findMany', async () => {
      mockTx.libraryTrack.findMany.mockResolvedValue([mockLibraryTrack]);
      const result = await repository.findMany({
        where: { track: { title: 'test' } },
      });
      expect(result).toEqual([mockLibraryTrack]);
      expect(mockTx.libraryTrack.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            track: expect.objectContaining({ title: 'test', deletedAt: null }),
          }),
        }),
      );
    });
  });

  describe('count', () => {
    it('should return count', async () => {
      mockTx.libraryTrack.count.mockResolvedValue(5);
      const result = await repository.count({ libraryId: 'lib-123' });
      expect(result).toBe(5);
      expect(mockTx.libraryTrack.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ libraryId: 'lib-123' }),
        }),
      );
    });

    it('should handle track filter in count', async () => {
      mockTx.libraryTrack.count.mockResolvedValue(5);
      const result = await repository.count({ track: { title: 'test' } });
      expect(result).toBe(5);
      expect(mockTx.libraryTrack.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            track: expect.objectContaining({ title: 'test', deletedAt: null }),
          }),
        }),
      );
    });

    it('should return count when no where clause is provided', async () => {
      mockTx.libraryTrack.count.mockResolvedValue(10);
      const result = await repository.count();
      expect(result).toBe(10);
      expect(mockTx.libraryTrack.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ track: { deletedAt: null } }),
      });
    });
  });

  describe('exists', () => {
    it('should return true if count > 0', async () => {
      mockTx.libraryTrack.count.mockResolvedValue(1);
      const result = await repository.exists({ id: 'lib-track-123' });
      expect(result).toBe(true);
    });

    it('should return false if count === 0', async () => {
      mockTx.libraryTrack.count.mockResolvedValue(0);
      const result = await repository.exists({ id: 'lib-track-123' });
      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('should create a library track', async () => {
      mockTx.libraryTrack.create.mockResolvedValue(mockLibraryTrack);
      const data = {
        library: { connect: { id: 'lib-123' } },
        track: { connect: { id: 'track-123' } },
      };
      const result = await repository.create(data);
      expect(result).toEqual(mockLibraryTrack);
      expect(mockTx.libraryTrack.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('update', () => {
    it('should update a library track', async () => {
      mockTx.libraryTrack.update.mockResolvedValue(mockLibraryTrack);
      const data = { listenedCount: 1 };
      const result = await repository.update('lib-track-123', data);
      expect(result).toEqual(mockLibraryTrack);
      expect(mockTx.libraryTrack.update).toHaveBeenCalledWith({
        where: { id: 'lib-track-123' },
        data,
      });
    });
  });

  describe('delete', () => {
    it('should delete a library track', async () => {
      mockTx.libraryTrack.delete.mockResolvedValue(mockLibraryTrack);
      const result = await repository.delete('lib-track-123');
      expect(result).toEqual(mockLibraryTrack);
      expect(mockTx.libraryTrack.delete).toHaveBeenCalledWith({
        where: { id: 'lib-track-123' },
      });
    });
  });

  describe('deleteMany', () => {
    it('should delete many library tracks', async () => {
      mockTx.libraryTrack.deleteMany.mockResolvedValue({ count: 5 });
      await repository.deleteMany({ libraryId: 'lib-123' });
      expect(mockTx.libraryTrack.deleteMany).toHaveBeenCalledWith({
        where: { libraryId: 'lib-123' },
      });
    });
  });
});
