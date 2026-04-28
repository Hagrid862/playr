import { Injectable } from '@nestjs/common';
import {
  Genre,
  GenreCreateInput,
  GenreGetPayload,
  GenreKind,
  GenreOrderByWithRelationInput,
  GenreUpdateInput,
  GenreWhereInput,
  Prisma,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

/** Shared conventions: see docblock at top of `track.repository.ts` (getById, getPaginated, delete vs softDelete). */
@Injectable()
export class GenreRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genres visible in a library: global/system (`libraryId` null) plus custom rows for this library.
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

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<Genre | null>;
  async getById<T extends Prisma.GenreInclude>(
    id: string,
    options: { include: T },
  ): Promise<GenreGetPayload<{ include: T }> | null>;
  async getById(
    id: string,
    options?: { include: Prisma.GenreInclude },
  ): Promise<Genre | GenreGetPayload<{ include: Prisma.GenreInclude }> | null> {
    const row = await this.prisma.client.genre.findUnique({
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
    if (!row || row.deletedAt) {
      return null;
    }
    return row;
  }

  /** Single genre visible in a library context (system global or this library's custom row). */
  async getGenreForLibrary(genreId: string, libraryId: string): Promise<Genre | null>;
  async getGenreForLibrary<T extends Prisma.GenreInclude>(
    genreId: string,
    libraryId: string,
    options: { include: T },
  ): Promise<GenreGetPayload<{ include: T }> | null>;
  async getGenreForLibrary(
    genreId: string,
    libraryId: string,
    options?: { include: Prisma.GenreInclude },
  ): Promise<Genre | GenreGetPayload<{ include: Prisma.GenreInclude }> | null> {
    return await this.prisma.client.genre.findFirst({
      where: {
        id: genreId,
        deletedAt: null,
        OR: [{ libraryId: null }, { libraryId }],
      },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async getSystemGenreBySlug(slug: string): Promise<Genre | null>;
  async getSystemGenreBySlug<T extends Prisma.GenreInclude>(
    slug: string,
    options: { include: T },
  ): Promise<GenreGetPayload<{ include: T }> | null>;
  async getSystemGenreBySlug(
    slug: string,
    options?: { include: Prisma.GenreInclude },
  ): Promise<Genre | GenreGetPayload<{ include: Prisma.GenreInclude }> | null> {
    return await this.prisma.client.genre.findFirst({
      where: {
        libraryId: null,
        slug,
        kind: 'system',
        deletedAt: null,
      },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async getCustomGenreBySlugForLibrary(libraryId: string, slug: string): Promise<Genre | null>;
  async getCustomGenreBySlugForLibrary<T extends Prisma.GenreInclude>(
    libraryId: string,
    slug: string,
    options: { include: T },
  ): Promise<GenreGetPayload<{ include: T }> | null>;
  async getCustomGenreBySlugForLibrary(
    libraryId: string,
    slug: string,
    options?: { include: Prisma.GenreInclude },
  ): Promise<Genre | GenreGetPayload<{ include: Prisma.GenreInclude }> | null> {
    return await this.prisma.client.genre.findFirst({
      where: {
        libraryId,
        slug,
        kind: 'custom',
        deletedAt: null,
      },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  /** Active row for this library slug (any kind); optional exclude for rename flows. */
  async getGenreBySlugForLibrary(
    libraryId: string,
    slug: string,
    options?: { excludeGenreId?: string },
  ): Promise<Genre | null>;
  async getGenreBySlugForLibrary<T extends Prisma.GenreInclude>(
    libraryId: string,
    slug: string,
    options: { excludeGenreId?: string; include: T },
  ): Promise<GenreGetPayload<{ include: T }> | null>;
  async getGenreBySlugForLibrary(
    libraryId: string,
    slug: string,
    options?: { excludeGenreId?: string; include?: Prisma.GenreInclude },
  ): Promise<Genre | GenreGetPayload<{ include: Prisma.GenreInclude }> | null> {
    return await this.prisma.client.genre.findFirst({
      where: {
        libraryId,
        slug,
        deletedAt: null,
        ...(options?.excludeGenreId ? { NOT: { id: options.excludeGenreId } } : {}),
      },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async getPaginated(
    page: number,
    limit: number,
    filter?: GenreWhereInput,
    orderBy?: GenreOrderByWithRelationInput,
  ): Promise<Genre[]>;
  async getPaginated<T extends Prisma.GenreInclude>(
    page: number,
    limit: number,
    filter: GenreWhereInput | undefined,
    orderBy: GenreOrderByWithRelationInput | undefined,
    options: { include: T },
  ): Promise<GenreGetPayload<{ include: T }>[]>;
  async getPaginated(
    page: number,
    limit: number,
    filter?: GenreWhereInput,
    orderBy?: GenreOrderByWithRelationInput,
    options?: { include: Prisma.GenreInclude },
  ): Promise<Genre[] | GenreGetPayload<{ include: Prisma.GenreInclude }>[]> {
    const w = filter;
    return await this.prisma.client.genre.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where: {
        ...w,
        deletedAt: w && 'deletedAt' in w && w.deletedAt !== undefined ? w.deletedAt : null,
      },
      orderBy: orderBy ?? { createdAt: 'desc' },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async getGenresPaginatedForLibrary(options: {
    libraryId: string;
    q?: string;
    kind?: GenreKind;
    page: number;
    limit: number;
  }): Promise<Genre[]>;
  async getGenresPaginatedForLibrary<T extends Prisma.GenreInclude>(
    options: {
      libraryId: string;
      q?: string;
      kind?: GenreKind;
      page: number;
      limit: number;
    } & { include: T },
  ): Promise<GenreGetPayload<{ include: T }>[]>;
  async getGenresPaginatedForLibrary(
    options: {
      libraryId: string;
      q?: string;
      kind?: GenreKind;
      page: number;
      limit: number;
      include?: Prisma.GenreInclude;
    },
  ): Promise<Genre[] | GenreGetPayload<{ include: Prisma.GenreInclude }>[]> {
    const { libraryId, q, kind, page, limit, include } = options;
    const skip = (page - 1) * limit;
    return await this.prisma.client.genre.findMany({
      where: this.libraryListWhere(libraryId, q, kind),
      orderBy: { name: 'asc' },
      skip,
      take: limit,
      ...(include ? { include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────────────────────

  async countGenresForLibrary(options: {
    libraryId: string;
    q?: string;
    kind?: GenreKind;
  }): Promise<number> {
    const { libraryId, q, kind } = options;
    return await this.prisma.client.genre.count({
      where: this.libraryListWhere(libraryId, q, kind),
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

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.genre.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
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
    const matchCount = await this.prisma.client.genre.count({
      where: {
        id: { in: unique },
        deletedAt: null,
        OR: [{ libraryId: null }, { libraryId }],
      },
    });
    return matchCount === unique.length;
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: GenreCreateInput): Promise<Genre>;
  async create<T extends Prisma.GenreInclude>(
    data: GenreCreateInput,
    options: { include: T },
  ): Promise<GenreGetPayload<{ include: T }>>;
  async create(
    data: GenreCreateInput,
    options?: { include: Prisma.GenreInclude },
  ): Promise<Genre | GenreGetPayload<{ include: Prisma.GenreInclude }>> {
    return await this.prisma.client.genre.create({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async createMany(data: Prisma.GenreCreateManyInput[]): Promise<Genre[]>;
  async createMany<T extends Prisma.GenreInclude>(
    data: Prisma.GenreCreateManyInput[],
    options: { include: T },
  ): Promise<GenreGetPayload<{ include: T }>[]>;
  async createMany(
    data: Prisma.GenreCreateManyInput[],
    options?: { include: Prisma.GenreInclude },
  ): Promise<
    Genre[] | GenreGetPayload<{ include: Prisma.GenreInclude }>[]
  > {
    return await this.prisma.client.genre.createManyAndReturn({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: GenreUpdateInput): Promise<Genre>;
  async update<T extends Prisma.GenreInclude>(
    id: string,
    data: GenreUpdateInput,
    options: { include: T },
  ): Promise<GenreGetPayload<{ include: T }>>;
  async update(
    id: string,
    data: GenreUpdateInput,
    options?: { include: Prisma.GenreInclude },
  ): Promise<Genre | GenreGetPayload<{ include: Prisma.GenreInclude }>> {
    return await this.prisma.client.genre.update({
      where: { id },
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async updateMany(
    updates: { id: string; data: GenreUpdateInput }[],
  ): Promise<Genre[]>;
  async updateMany<T extends Prisma.GenreInclude>(
    updates: { id: string; data: GenreUpdateInput }[],
    options: { include: T },
  ): Promise<GenreGetPayload<{ include: T }>[]>;
  async updateMany(
    updates: { id: string; data: GenreUpdateInput }[],
    options?: { include: Prisma.GenreInclude },
  ): Promise<Genre[] | GenreGetPayload<{ include: Prisma.GenreInclude }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.genre.update({
          where: { id },
          data,
          ...(options?.include ? { include: options.include } : {}),
        }),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  async delete(id: string): Promise<Genre> {
    return await this.prisma.client.genre.delete({ where: { id } });
  }

  async softDelete(id: string): Promise<Genre> {
    return await this.prisma.client.genre.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Hard-delete by primary keys only. No-op when `ids` is empty. */
  async deleteMany(ids: string[]): Promise<Genre[]> {
    if (ids.length === 0) {
      return [];
    }
    const genres = await this.prisma.client.genre.findMany({
      where: { id: { in: ids } },
    });
    await this.prisma.client.genre.deleteMany({
      where: { id: { in: ids } },
    });
    return genres;
  }

  /** Soft-delete by primary keys only. No-op when `ids` is empty. */
  async softDeleteMany(ids: string[]): Promise<Genre[]> {
    if (ids.length === 0) {
      return [];
    }
    const genres = await this.prisma.client.genre.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });
    await this.prisma.client.genre.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return genres;
  }
}
