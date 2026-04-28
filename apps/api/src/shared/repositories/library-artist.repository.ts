import { Injectable } from '@nestjs/common';
import {
  LibraryArtist,
  LibraryArtistCreateInput,
  LibraryArtistGetPayload,
  LibraryArtistOrderByWithRelationInput,
  LibraryArtistUpdateInput,
  LibraryArtistWhereInput,
  Prisma,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

function mergeLibraryArtistWhere(where: LibraryArtistWhereInput): LibraryArtistWhereInput {
  const { artist, ...rest } = where;
  return {
    ...rest,
    artist: {
      ...((artist as object) || {}),
      deletedAt: null,
    },
  };
}

@Injectable()
export class LibraryArtistRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<LibraryArtist | null>;
  async getById<T extends Prisma.LibraryArtistInclude>(
    id: string,
    options: { include: T },
  ): Promise<LibraryArtistGetPayload<{ include: T }> | null>;
  /**
   * Gets a single record by its ID.
   * @param id Record identifier.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getById(
    id: string,
    options?: { include: Prisma.LibraryArtistInclude },
  ): Promise<
    LibraryArtist | LibraryArtistGetPayload<{ include: Prisma.LibraryArtistInclude }> | null
  > {
    const row = await this.prisma.client.libraryArtist.findUnique({
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
    if (!row || row.deletedAt) {
      return null;
    }
    return row;
  }

  async getByLibraryAndArtist(libraryId: string, artistId: string): Promise<LibraryArtist | null>;
  async getByLibraryAndArtist<T extends Prisma.LibraryArtistInclude>(
    libraryId: string,
    artistId: string,
    options: { include: T },
  ): Promise<LibraryArtistGetPayload<{ include: T }> | null>;
  /**
   * Gets a library-artist link by library ID and artist ID.
   * @param libraryId libraryId to match.
   * @param artistId artistId to match.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getByLibraryAndArtist(
    libraryId: string,
    artistId: string,
    options?: { include: Prisma.LibraryArtistInclude },
  ): Promise<
    LibraryArtist | LibraryArtistGetPayload<{ include: Prisma.LibraryArtistInclude }> | null
  > {
    return await this.prisma.client.libraryArtist.findFirst({
      where: mergeLibraryArtistWhere({ libraryId, artistId }),
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async getPaginated(
    page: number,
    limit: number,
    filter?: LibraryArtistWhereInput,
    orderBy?: LibraryArtistOrderByWithRelationInput,
  ): Promise<LibraryArtist[]>;
  async getPaginated<T extends Prisma.LibraryArtistInclude>(
    page: number,
    limit: number,
    filter: LibraryArtistWhereInput | undefined,
    orderBy: LibraryArtistOrderByWithRelationInput | undefined,
    options: { include: T },
  ): Promise<LibraryArtistGetPayload<{ include: T }>[]>;
  /**
   * Returns a paginated list of matching records.
   * @param page 1-based page index.
   * @param limit Maximum rows to return.
   * @param filter Filter criteria for matching rows.
   * @param orderBy Sort order for the query.
   * @param options Optional include or query options.
   * @returns Records that match the query criteria.
   */
  async getPaginated(
    page: number,
    limit: number,
    filter?: LibraryArtistWhereInput,
    orderBy?: LibraryArtistOrderByWithRelationInput,
    options?: { include: Prisma.LibraryArtistInclude },
  ): Promise<
    LibraryArtist[] | LibraryArtistGetPayload<{ include: Prisma.LibraryArtistInclude }>[]
  > {
    const { artist, ...rest } = filter || {};
    return await this.prisma.client.libraryArtist.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where: {
        ...rest,
        deletedAt:
          filter && 'deletedAt' in filter && filter.deletedAt !== undefined
            ? filter.deletedAt
            : null,
        artist: {
          ...((artist as object) || {}),
          deletedAt: null,
        },
      },
      orderBy,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────────────────────
  /**
   * Checks whether a matching record currently exists.
   * @param id Record identifier.
   * @returns True when a matching record exists.
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.libraryArtist.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }
  /**
   * Checks whether a library-artist link exists for the provided IDs.
   * @param libraryId libraryId to match.
   * @param artistId artistId to match.
   * @returns True when a matching record exists.
   */
  async existsForLibraryAndArtist(libraryId: string, artistId: string): Promise<boolean> {
    const count = await this.prisma.client.libraryArtist.count({
      where: mergeLibraryArtistWhere({ libraryId, artistId }),
    });
    return count > 0;
  }
  /**
   * Counts records that match the provided filters.
   * @param where Where clause constraints.
   * @returns Number of matching records.
   */
  async count(where?: LibraryArtistWhereInput): Promise<number> {
    const { artist, ...rest } = where || {};
    return await this.prisma.client.libraryArtist.count({
      where: {
        ...rest,
        deletedAt:
          where && 'deletedAt' in where && where.deletedAt !== undefined ? where.deletedAt : null,
        artist: {
          ...((artist as object) || {}),
          deletedAt: null,
        },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: LibraryArtistCreateInput): Promise<LibraryArtist>;
  async create<T extends Prisma.LibraryArtistInclude>(
    data: LibraryArtistCreateInput,
    options: { include: T },
  ): Promise<LibraryArtistGetPayload<{ include: T }>>;
  /**
   * Creates a new record with the provided data.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created record. Includes related entities when `options.include` is provided.
   */
  async create(
    data: LibraryArtistCreateInput,
    options?: { include: Prisma.LibraryArtistInclude },
  ): Promise<LibraryArtist | LibraryArtistGetPayload<{ include: Prisma.LibraryArtistInclude }>> {
    return await this.prisma.client.libraryArtist.create({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async createMany(data: Prisma.LibraryArtistCreateManyInput[]): Promise<LibraryArtist[]>;
  async createMany<T extends Prisma.LibraryArtistInclude>(
    data: Prisma.LibraryArtistCreateManyInput[],
    options: { include: T },
  ): Promise<LibraryArtistGetPayload<{ include: T }>[]>;
  /**
   * Creates multiple records in a single operation.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created records. Includes related entities when `options.include` is provided.
   */
  async createMany(
    data: Prisma.LibraryArtistCreateManyInput[],
    options?: { include: Prisma.LibraryArtistInclude },
  ): Promise<
    LibraryArtist[] | LibraryArtistGetPayload<{ include: Prisma.LibraryArtistInclude }>[]
  > {
    return await this.prisma.client.libraryArtist.createManyAndReturn({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: LibraryArtistUpdateInput): Promise<LibraryArtist>;
  async update<T extends Prisma.LibraryArtistInclude>(
    id: string,
    data: LibraryArtistUpdateInput,
    options: { include: T },
  ): Promise<LibraryArtistGetPayload<{ include: T }>>;
  /**
   * Updates an existing record with the provided data.
   * @param id Record identifier.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Updated record. Includes related entities when `options.include` is provided.
   * @throws Error if no matching record is found for this strict write operation.
   */
  async update(
    id: string,
    data: LibraryArtistUpdateInput,
    options?: { include: Prisma.LibraryArtistInclude },
  ): Promise<LibraryArtist | LibraryArtistGetPayload<{ include: Prisma.LibraryArtistInclude }>> {
    return await this.prisma.client.libraryArtist.update({
      data,
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
  }
  async updateMany(
    updates: { id: string; data: LibraryArtistUpdateInput }[],
  ): Promise<LibraryArtist[]>;
  async updateMany<T extends Prisma.LibraryArtistInclude>(
    updates: { id: string; data: LibraryArtistUpdateInput }[],
    options: { include: T },
  ): Promise<LibraryArtistGetPayload<{ include: T }>[]>;
  /**
   * Updates multiple existing records in a single operation.
   * @param updates List of record IDs and update payloads to apply.
   * @param options Optional include or query options.
   * @returns Updated records. Includes related entities when `options.include` is provided.
   */
  async updateMany(
    updates: { id: string; data: LibraryArtistUpdateInput }[],
    options?: { include: Prisma.LibraryArtistInclude },
  ): Promise<
    LibraryArtist[] | LibraryArtistGetPayload<{ include: Prisma.LibraryArtistInclude }>[]
  > {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.libraryArtist.update({
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
  /**
   * Permanently deletes a single record by ID.
   * @param id Record identifier.
   * @returns Deleted record.
   * @throws Error if no matching record is found for this strict write operation.
   * @warning Permanently deletes records, including soft-deleted rows.
   */
  async delete(id: string): Promise<LibraryArtist> {
    return await this.prisma.client.libraryArtist.delete({ where: { id } });
  }
  /**
   * Soft-deletes a single record by setting its deletion timestamp.
   * @param id Record identifier.
   * @returns The resulting record after the write operation.
   * @throws Error if no matching record is found for this strict write operation.
   */
  async softDelete(id: string): Promise<LibraryArtist> {
    return await this.prisma.client.libraryArtist.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
  /**
   * Permanently deletes multiple records by their IDs.
   * @param ids Record identifiers to match.
   * @returns Pre-delete snapshots of deleted records.
   * @warning Permanently deletes records, including soft-deleted rows.
   */
  async deleteMany(ids: string[]): Promise<LibraryArtist[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.prisma.client.libraryArtist.findMany({
      where: { id: { in: ids } },
    });
    await this.prisma.client.libraryArtist.deleteMany({
      where: { id: { in: ids } },
    });
    return rows;
  }
  /**
   * Soft-deletes multiple records by setting their deletion timestamps.
   * @param ids Record identifiers to match.
   * @returns The resulting record after the write operation.
   */
  async softDeleteMany(ids: string[]): Promise<LibraryArtist[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.prisma.client.libraryArtist.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });
    await this.prisma.client.libraryArtist.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return rows;
  }
}
