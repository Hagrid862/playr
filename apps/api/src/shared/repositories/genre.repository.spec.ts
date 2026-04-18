import { Test, TestingModule } from '@nestjs/testing';
import { GenreKind, type PrismaClient } from '@repo/db';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../services/prisma.service';
import { GenreRepository } from './genre.repository';

describe('GenreRepository', () => {
  let repository: GenreRepository;
  let mockClient: DeepMocked<PrismaClient>;

  const genreRow = { id: 'g1', name: 'Rock', slug: 'rock' } as any;

  beforeEach(async () => {
    mockClient = createMock<PrismaClient>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenreRepository,
        {
          provide: PrismaService,
          useValue: { client: mockClient },
        },
      ],
    }).compile();

    repository = module.get(GenreRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findOne', () => {
    it('defaults deletedAt to null when omitted', async () => {
      mockClient.genre.findFirst.mockResolvedValue(genreRow);
      await repository.findOne({ id: 'g1' });
      expect(mockClient.genre.findFirst).toHaveBeenCalledWith({
        where: { id: 'g1', deletedAt: null },
      });
    });

    it('preserves explicit deletedAt in where', async () => {
      mockClient.genre.findFirst.mockResolvedValue(null);
      await repository.findOne({ deletedAt: { not: null } } as any);
      expect(mockClient.genre.findFirst).toHaveBeenCalledWith({
        where: { deletedAt: { not: null } },
      });
    });
  });

  describe('findMany', () => {
    it('defaults deletedAt to null when where omits it', async () => {
      mockClient.genre.findMany.mockResolvedValue([]);
      await repository.findMany({ where: { kind: GenreKind.system } });
      expect(mockClient.genre.findMany).toHaveBeenCalledWith({
        where: { kind: GenreKind.system, deletedAt: null },
        take: undefined,
        skip: undefined,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('preserves explicit deletedAt in where', async () => {
      mockClient.genre.findMany.mockResolvedValue([]);
      await repository.findMany({ where: { deletedAt: { not: null } } as any });
      expect(mockClient.genre.findMany).toHaveBeenCalledWith({
        where: { deletedAt: { not: null } },
        take: undefined,
        skip: undefined,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('count', () => {
    it('defaults deletedAt to null when filter omits it', async () => {
      mockClient.genre.count.mockResolvedValue(3);
      await repository.count({ libraryId: 'lib-1' });
      expect(mockClient.genre.count).toHaveBeenCalledWith({
        where: { libraryId: 'lib-1', deletedAt: null },
      });
    });

    it('preserves explicit deletedAt in filter', async () => {
      mockClient.genre.count.mockResolvedValue(0);
      await repository.count({ deletedAt: { not: null } } as any);
      expect(mockClient.genre.count).toHaveBeenCalledWith({
        where: { deletedAt: { not: null } },
      });
    });
  });

  describe('findForLibraryList / countForLibraryList', () => {
    const visibilityOnlyWhere = {
      deletedAt: null,
      OR: [{ libraryId: null }, { libraryId: 'lib-1' }],
    };

    it('returns visibility filter only when kind and q are omitted (no AND wrapper)', async () => {
      mockClient.genre.findMany.mockResolvedValue([]);
      mockClient.genre.count.mockResolvedValue(0);

      await repository.findForLibraryList({
        libraryId: 'lib-1',
        skip: 0,
        take: 20,
      });
      await repository.countForLibraryList({ libraryId: 'lib-1' });

      expect(mockClient.genre.findMany).toHaveBeenCalledWith({
        where: visibilityOnlyWhere,
        orderBy: { name: 'asc' },
        skip: 0,
        take: 20,
      });
      expect(mockClient.genre.count).toHaveBeenCalledWith({ where: visibilityOnlyWhere });
    });

    it('treats whitespace-only q as no search (same single-condition where)', async () => {
      mockClient.genre.findMany.mockResolvedValue([]);

      await repository.findForLibraryList({
        libraryId: 'lib-1',
        q: '   ',
        skip: 0,
        take: 10,
      });

      expect(mockClient.genre.findMany).toHaveBeenCalledWith({
        where: visibilityOnlyWhere,
        orderBy: { name: 'asc' },
        skip: 0,
        take: 10,
      });
    });

    it('uses AND with only kind when q is absent', async () => {
      mockClient.genre.findMany.mockResolvedValue([]);

      await repository.findForLibraryList({
        libraryId: 'lib-1',
        kind: GenreKind.system,
        skip: 0,
        take: 5,
      });

      expect(mockClient.genre.findMany).toHaveBeenCalledWith({
        where: {
          AND: [visibilityOnlyWhere, { kind: GenreKind.system }],
        },
        orderBy: { name: 'asc' },
        skip: 0,
        take: 5,
      });
    });

    it('uses AND with only search when kind is absent', async () => {
      mockClient.genre.count.mockResolvedValue(0);

      await repository.countForLibraryList({ libraryId: 'lib-1', q: 'pop' });

      expect(mockClient.genre.count).toHaveBeenCalledWith({
        where: {
          AND: [
            visibilityOnlyWhere,
            {
              OR: [
                { name: { contains: 'pop', mode: 'insensitive' } },
                { slug: { contains: 'pop', mode: 'insensitive' } },
              ],
            },
          ],
        },
      });
    });

    it('uses AND with kind and search when both provided', async () => {
      mockClient.genre.findMany.mockResolvedValue([]);
      mockClient.genre.count.mockResolvedValue(0);

      await repository.findForLibraryList({
        libraryId: 'lib-1',
        q: '  rock ',
        kind: GenreKind.custom,
        skip: 0,
        take: 10,
      });
      await repository.countForLibraryList({
        libraryId: 'lib-1',
        q: 'rock',
        kind: GenreKind.custom,
      });

      const expectedWhere = {
        AND: [
          visibilityOnlyWhere,
          { kind: GenreKind.custom },
          {
            OR: [
              { name: { contains: 'rock', mode: 'insensitive' } },
              { slug: { contains: 'rock', mode: 'insensitive' } },
            ],
          },
        ],
      };

      expect(mockClient.genre.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        orderBy: { name: 'asc' },
        skip: 0,
        take: 10,
      });
      expect(mockClient.genre.count).toHaveBeenCalledWith({ where: expectedWhere });
    });
  });

  describe('mutations', () => {
    it('create delegates to prisma.genre.create', async () => {
      const data = { name: 'X', slug: 'x', kind: 'custom' } as any;
      mockClient.genre.create.mockResolvedValue(genreRow);
      await repository.create(data);
      expect(mockClient.genre.create).toHaveBeenCalledWith({ data });
    });

    it('update delegates to prisma.genre.update', async () => {
      mockClient.genre.update.mockResolvedValue(genreRow);
      await repository.update('g1', { name: 'Y' } as any);
      expect(mockClient.genre.update).toHaveBeenCalledWith({
        where: { id: 'g1' },
        data: { name: 'Y' },
      });
    });

    it('delete soft-deletes', async () => {
      mockClient.genre.update.mockResolvedValue(genreRow);
      await repository.delete('g1');
      expect(mockClient.genre.update).toHaveBeenCalledWith({
        where: { id: 'g1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('hardDelete delegates to prisma.genre.delete', async () => {
      mockClient.genre.delete.mockResolvedValue(genreRow);
      await repository.hardDelete('g1');
      expect(mockClient.genre.delete).toHaveBeenCalledWith({ where: { id: 'g1' } });
    });
  });

  describe('areGenreIdsAssignableToLibrary', () => {
    it('returns true for empty ids', async () => {
      const result = await repository.areGenreIdsAssignableToLibrary('lib-1', []);
      expect(result).toBe(true);
      expect(mockClient.genre.count).not.toHaveBeenCalled();
    });

    it('returns true when count matches unique ids', async () => {
      mockClient.genre.count.mockResolvedValue(2);
      const result = await repository.areGenreIdsAssignableToLibrary('lib-1', ['a', 'a', 'b']);
      expect(result).toBe(true);
      expect(mockClient.genre.count).toHaveBeenCalledWith({
        where: {
          id: { in: ['a', 'b'] },
          deletedAt: null,
          OR: [{ libraryId: null }, { libraryId: 'lib-1' }],
        },
      });
    });

    it('returns false when count mismatches', async () => {
      mockClient.genre.count.mockResolvedValue(1);
      const result = await repository.areGenreIdsAssignableToLibrary('lib-1', ['a', 'b']);
      expect(result).toBe(false);
    });
  });
});
