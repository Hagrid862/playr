import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { LibraryArtist, PrismaClient } from '@repo/db';
// @ts-expect-error - ignore type errors from testing package imports
import { buildLibraryArtist } from '@repo/testing';
import { PrismaService } from '../services/prisma.service';
import { LibraryArtistRepository } from './library-artist.repository';

describe('LibraryArtistRepository', () => {
  let repository: LibraryArtistRepository;
  let mockTx: DeepMocked<PrismaClient>;

  const mockLibraryArtist: LibraryArtist = buildLibraryArtist({
    id: 'la-123',
    libraryId: 'lib-123',
    artistId: 'artist-123',
  });

  beforeEach(async () => {
    mockTx = createMock<PrismaClient>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibraryArtistRepository,
        {
          provide: PrismaService,
          useValue: {
            client: mockTx,
          },
        },
      ],
    }).compile();

    repository = module.get<LibraryArtistRepository>(LibraryArtistRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return library artist matching criteria with deletedAt: null filter', async () => {
      mockTx.libraryArtist.findFirst.mockResolvedValue(mockLibraryArtist);

      const result = await repository.findOne({ libraryId: 'lib-123', artistId: 'artist-123' });

      expect(result).toEqual(mockLibraryArtist);
      expect(mockTx.libraryArtist.findFirst).toHaveBeenCalledWith({
        where: {
          libraryId: 'lib-123',
          artistId: 'artist-123',
          artist: {
            deletedAt: null,
          },
        },
        include: {
          artist: {
            include: {
              avatar: true,
              banner: true,
            },
          },
        },
      });
    });
  });

  describe('findMany', () => {
    it('should return library artists matching criteria with deletedAt: null filter', async () => {
      mockTx.libraryArtist.findMany.mockResolvedValue([mockLibraryArtist]);

      const result = await repository.findMany({ where: { libraryId: 'lib-123' }, take: 10 });

      expect(result).toEqual([mockLibraryArtist]);
      expect(mockTx.libraryArtist.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: undefined,
        where: {
          libraryId: 'lib-123',
          artist: {
            deletedAt: null,
          },
        },
        include: {
          artist: {
            include: {
              avatar: true,
              banner: true,
            },
          },
        },
        orderBy: undefined,
      });
    });

    it('should handle undefined where in findMany', async () => {
      mockTx.libraryArtist.findMany.mockResolvedValue([]);
      await repository.findMany({});
      expect(mockTx.libraryArtist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            artist: {
              deletedAt: null,
            },
          },
        }),
      );
    });
  });

  describe('exists', () => {
    it('should return true if library artist exists', async () => {
      mockTx.libraryArtist.count.mockResolvedValue(1);
      const result = await repository.exists({ libraryId: 'lib-123', artistId: 'artist-123' });
      expect(result).toBe(true);
      expect(mockTx.libraryArtist.count).toHaveBeenCalledWith({
        where: { libraryId: 'lib-123', artistId: 'artist-123' },
      });
    });

    it('should return false if library artist does not exist', async () => {
      mockTx.libraryArtist.count.mockResolvedValue(0);
      const result = await repository.exists({ libraryId: 'lib-123', artistId: 'artist-123' });
      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count library artists with deletedAt: null filter', async () => {
      mockTx.libraryArtist.count.mockResolvedValue(1);
      const result = await repository.count({ libraryId: 'lib-123' });
      expect(result).toBe(1);
      expect(mockTx.libraryArtist.count).toHaveBeenCalledWith({
        where: {
          libraryId: 'lib-123',
          artist: {
            deletedAt: null,
          },
        },
      });
    });

    it('should handle undefined where in count', async () => {
      mockTx.libraryArtist.count.mockResolvedValue(0);
      await repository.count();
      expect(mockTx.libraryArtist.count).toHaveBeenCalledWith({
        where: {
          artist: {
            deletedAt: null,
          },
        },
      });
    });
  });

  describe('create', () => {
    it('should create a library artist', async () => {
      mockTx.libraryArtist.create.mockResolvedValue(mockLibraryArtist);
      const data = {
        library: { connect: { id: 'lib-123' } },
        artist: { connect: { id: 'artist-123' } },
      };

      const result = await repository.create(data);
      expect(result).toEqual(mockLibraryArtist);
      expect(mockTx.libraryArtist.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('update', () => {
    it('should update a library artist', async () => {
      mockTx.libraryArtist.update.mockResolvedValue(mockLibraryArtist);
      const data = { updatedAt: new Date() };
      const result = await repository.update('la-123', data);
      expect(result).toEqual(mockLibraryArtist);
      expect(mockTx.libraryArtist.update).toHaveBeenCalledWith({ data, where: { id: 'la-123' } });
    });
  });

  describe('delete', () => {
    it('should delete a library artist', async () => {
      mockTx.libraryArtist.delete.mockResolvedValue(mockLibraryArtist);
      const result = await repository.delete('la-123');
      expect(result).toEqual(mockLibraryArtist);
      expect(mockTx.libraryArtist.delete).toHaveBeenCalledWith({ where: { id: 'la-123' } });
    });
  });

  describe('deleteMany', () => {
    it('should delete many library artists', async () => {
      mockTx.libraryArtist.deleteMany.mockResolvedValue({ count: 5 });
      await repository.deleteMany({ libraryId: 'lib-123' });
      expect(mockTx.libraryArtist.deleteMany).toHaveBeenCalledWith({
        where: { libraryId: 'lib-123' },
      });
    });
  });
});
