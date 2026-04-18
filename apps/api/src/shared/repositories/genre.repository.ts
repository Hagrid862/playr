import { Injectable } from '@nestjs/common';
import {
    Genre,
    GenreCreateInput,
    GenreKind,
    GenreOrderByWithRelationInput,
    GenreUpdateInput,
    GenreWhereInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class GenreRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async findOne(where: GenreWhereInput): Promise<Genre | null> {
    return await this.prisma.client.genre.findFirst({
      where: {
        ...where,
        deletedAt: 'deletedAt' in where && where.deletedAt !== undefined ? where.deletedAt : null,
      },
    });
  }

  async findMany(options: {
    where?: GenreWhereInput;
    take?: number;
    skip?: number;
    orderBy?: GenreOrderByWithRelationInput;
  }): Promise<Genre[]> {
    const w = options.where;
    return await this.prisma.client.genre.findMany({
      where: {
        ...w,
        deletedAt: w && 'deletedAt' in w && w.deletedAt !== undefined ? w.deletedAt : null,
      },
      take: options.take,
      skip: options.skip,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
    });
  }

  async count(filter?: GenreWhereInput): Promise<number> {
    return await this.prisma.client.genre.count({
      where: {
        ...filter,
        deletedAt:
          filter && 'deletedAt' in filter && filter.deletedAt !== undefined
            ? filter.deletedAt
            : null,
      },
    });
  }

  /**
   * Genres visible in a library: global/system (libraryId null) plus custom rows for this library.
   */
  private libraryListWhere(libraryId: string, q?: string, kind?: GenreKind): GenreWhereInput {
    const visibility: GenreWhereInput = {
      deletedAt: null,
      OR: [{ libraryId: null }, { libraryId }],
    };
    const conditions: GenreWhereInput[] = [visibility];
    if (kind) {
      conditions.push({ kind });
    }
    if (q?.trim()) {
      const term = q.trim();
      conditions.push({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { slug: { contains: term, mode: 'insensitive' } },
        ],
      });
    }
    return conditions.length === 1 ? conditions[0]! : { AND: conditions };
  }

  async findForLibraryList(options: {
    libraryId: string;
    q?: string;
    kind?: GenreKind;
    skip: number;
    take: number;
  }): Promise<Genre[]> {
    const { libraryId, q, kind, skip, take } = options;
    return await this.prisma.client.genre.findMany({
      where: this.libraryListWhere(libraryId, q, kind),
      orderBy: { name: 'asc' },
      skip,
      take,
    });
  }

  async countForLibraryList(options: {
    libraryId: string;
    q?: string;
    kind?: GenreKind;
  }): Promise<number> {
    const { libraryId, q, kind } = options;
    return await this.prisma.client.genre.count({
      where: this.libraryListWhere(libraryId, q, kind),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: GenreCreateInput): Promise<Genre> {
    return await this.prisma.client.genre.create({ data });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: GenreUpdateInput): Promise<Genre> {
    return await this.prisma.client.genre.update({ where: { id }, data });
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  async delete(id: string): Promise<Genre> {
    return await this.prisma.client.genre.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async hardDelete(id: string): Promise<Genre> {
    return await this.prisma.client.genre.delete({ where: { id } });
  }

  /**
   * True when every id exists, is not soft-deleted, and is either a system genre
   * (`libraryId` null) or belongs to the given library.
   */
  async areGenreIdsAssignableToLibrary(libraryId: string, genreIds: string[]): Promise<boolean> {
    if (genreIds.length === 0) {
      return true;
    }
    const unique = [...new Set(genreIds)];
    const count = await this.prisma.client.genre.count({
      where: {
        id: { in: unique },
        deletedAt: null,
        OR: [{ libraryId: null }, { libraryId }],
      },
    });
    return count === unique.length;
  }
}
