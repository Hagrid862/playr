import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { Library, PrismaClient } from '@repo/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../services/prisma.service';
import { LibraryRepository } from './library.repository';

describe('LibraryRepository', () => {
  let repository: LibraryRepository;
  let mockTx: DeepMocked<PrismaClient>;

  const mockLibrary: Library = {
    id: 'lib-123',
    userId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockTx = createMock<PrismaClient>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibraryRepository,
        {
          provide: PrismaService,
          useValue: {
            client: mockTx,
          },
        },
      ],
    }).compile();

    repository = module.get<LibraryRepository>(LibraryRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('getById', () => {
    it('should return a library if found', async () => {
      mockTx.library.findUnique.mockResolvedValue(mockLibrary);
      const result = await repository.getById('lib-123');
      expect(result).toEqual(mockLibrary);
      expect(mockTx.library.findUnique).toHaveBeenCalledWith({ where: { id: 'lib-123' } });
    });

    it('should return null if not found', async () => {
      mockTx.library.findUnique.mockResolvedValue(null);
      const result = await repository.getById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getByUserId', () => {
    it('should return a library if found by userId', async () => {
      mockTx.library.findUnique.mockResolvedValue(mockLibrary);
      const result = await repository.getByUserId('user-123');
      expect(result).toEqual(mockLibrary);
      expect(mockTx.library.findUnique).toHaveBeenCalledWith({ where: { userId: 'user-123' } });
    });
  });

  describe('getPaginated', () => {
    it('should return paginated libraries', async () => {
      mockTx.library.findMany.mockResolvedValue([mockLibrary]);
      const result = await repository.getPaginated(1, 10);
      expect(result).toEqual([mockLibrary]);
      expect(mockTx.library.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: undefined,
        orderBy: undefined,
      });
    });

    it('should apply filters and sorting', async () => {
      mockTx.library.findMany.mockResolvedValue([mockLibrary]);
      const filter = { userId: 'user-123' };
      const orderBy = { createdAt: 'desc' as const };

      await repository.getPaginated(2, 5, filter, orderBy);

      expect(mockTx.library.findMany).toHaveBeenCalledWith({
        take: 5,
        skip: 5,
        where: filter,
        orderBy,
      });
    });
  });

  describe('EXISTS & COUNT', () => {
    it('exists should return true if library exists', async () => {
      mockTx.library.count.mockResolvedValue(1);
      const result = await repository.exists('lib-123');
      expect(result).toBe(true);
      expect(mockTx.library.count).toHaveBeenCalledWith({ where: { id: 'lib-123' } });
    });

    it('existsForUser should return true if library exists for user', async () => {
      mockTx.library.count.mockResolvedValue(1);
      const result = await repository.existsForUser('user-123');
      expect(result).toBe(true);
      expect(mockTx.library.count).toHaveBeenCalledWith({ where: { userId: 'user-123' } });
    });

    it('count should return total number of libraries', async () => {
      mockTx.library.count.mockResolvedValue(5);
      const result = await repository.count();
      expect(result).toBe(5);
      expect(mockTx.library.count).toHaveBeenCalledWith({ where: undefined });
    });
  });

  describe('CREATE', () => {
    it('should create a library', async () => {
      mockTx.library.create.mockResolvedValue(mockLibrary);
      const data = { user: { connect: { id: 'user-123' } } };

      const result = await repository.create(data);
      expect(result).toEqual(mockLibrary);
      expect(mockTx.library.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('UPDATE', () => {
    it('should update a library', async () => {
      const updatedLibrary = { ...mockLibrary, updatedAt: new Date() };
      mockTx.library.update.mockResolvedValue(updatedLibrary);
      const data = { updatedAt: new Date() };

      const result = await repository.update('lib-123', data);
      expect(result).toEqual(updatedLibrary);
      expect(mockTx.library.update).toHaveBeenCalledWith({ data, where: { id: 'lib-123' } });
    });
  });

  describe('DELETE', () => {
    it('should delete a library by id', async () => {
      mockTx.library.delete.mockResolvedValue(mockLibrary);
      const result = await repository.delete('lib-123');
      expect(result).toEqual(mockLibrary);
      expect(mockTx.library.delete).toHaveBeenCalledWith({ where: { id: 'lib-123' } });
    });

    it('should delete a library by userId', async () => {
      mockTx.library.delete.mockResolvedValue(mockLibrary);
      const result = await repository.deleteByUserId('user-123');
      expect(result).toEqual(mockLibrary);
      expect(mockTx.library.delete).toHaveBeenCalledWith({ where: { userId: 'user-123' } });
    });
  });
});
