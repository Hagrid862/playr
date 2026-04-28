import { Injectable } from '@nestjs/common';
import {
  LibraryTrack,
  LibraryTrackCreateInput,
  LibraryTrackGetPayload,
  LibraryTrackOrderByWithRelationInput,
  LibraryTrackUpdateInput,
  LibraryTrackWhereInput,
  Prisma,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

function mergeLibraryTrackWhere(where: LibraryTrackWhereInput): LibraryTrackWhereInput {
  const { track, ...rest } = where;
  return {
    ...rest,
    track: {
      ...((track as object) || {}),
      deletedAt: null,
    },
  };
}

@Injectable()
export class LibraryTrackRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<LibraryTrack | null>;
  async getById<T extends Prisma.LibraryTrackInclude>(
    id: string,
    options: { include: T },
  ): Promise<LibraryTrackGetPayload<{ include: T }> | null>;
  /**
   * Gets a single record by its ID.
   * @param id Record identifier.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getById(
    id: string,
    options?: { include: Prisma.LibraryTrackInclude },
  ): Promise<
    LibraryTrack | LibraryTrackGetPayload<{ include: Prisma.LibraryTrackInclude }> | null
  > {
    const row = await this.prisma.client.libraryTrack.findUnique({
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
    if (!row || row.deletedAt) {
      return null;
    }
    return row;
  }

  async getByLibraryAndTrack(libraryId: string, trackId: string): Promise<LibraryTrack | null>;
  async getByLibraryAndTrack<T extends Prisma.LibraryTrackInclude>(
    libraryId: string,
    trackId: string,
    options: { include: T },
  ): Promise<LibraryTrackGetPayload<{ include: T }> | null>;
  /**
   * Gets a library-track link by library ID and track ID.
   * @param libraryId libraryId to match.
   * @param trackId trackId to match.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getByLibraryAndTrack(
    libraryId: string,
    trackId: string,
    options?: { include: Prisma.LibraryTrackInclude },
  ): Promise<
    LibraryTrack | LibraryTrackGetPayload<{ include: Prisma.LibraryTrackInclude }> | null
  > {
    return await this.prisma.client.libraryTrack.findFirst({
      where: mergeLibraryTrackWhere({ libraryId, trackId }),
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async getPaginated(
    page: number,
    limit: number,
    filter?: LibraryTrackWhereInput,
    orderBy?: LibraryTrackOrderByWithRelationInput | LibraryTrackOrderByWithRelationInput[],
  ): Promise<LibraryTrack[]>;
  async getPaginated<T extends Prisma.LibraryTrackInclude>(
    page: number,
    limit: number,
    filter: LibraryTrackWhereInput | undefined,
    orderBy:
      | LibraryTrackOrderByWithRelationInput
      | LibraryTrackOrderByWithRelationInput[]
      | undefined,
    options: { include: T },
  ): Promise<LibraryTrackGetPayload<{ include: T }>[]>;
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
    filter?: LibraryTrackWhereInput,
    orderBy?: LibraryTrackOrderByWithRelationInput | LibraryTrackOrderByWithRelationInput[],
    options?: { include: Prisma.LibraryTrackInclude },
  ): Promise<LibraryTrack[] | LibraryTrackGetPayload<{ include: Prisma.LibraryTrackInclude }>[]> {
    const { track, ...rest } = filter || {};
    return await this.prisma.client.libraryTrack.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where: {
        ...rest,
        deletedAt:
          filter && 'deletedAt' in filter && filter.deletedAt !== undefined
            ? filter.deletedAt
            : null,
        track: {
          ...((track as object) || {}),
          deletedAt: null,
        },
      },
      orderBy,
      ...(options?.include ? { include: options.include } : {}),
    });
  }
  async listByLibraryAndAlbum(
    libraryId: string,
    albumId: string,
    options?: {
      orderBy?: LibraryTrackOrderByWithRelationInput | LibraryTrackOrderByWithRelationInput[];
      include?: Prisma.LibraryTrackInclude;
    },
  ): Promise<LibraryTrack[]>;
  async listByLibraryAndAlbum<T extends Prisma.LibraryTrackInclude>(
    libraryId: string,
    albumId: string,
    options: {
      orderBy?: LibraryTrackOrderByWithRelationInput | LibraryTrackOrderByWithRelationInput[];
      include: T;
    },
  ): Promise<LibraryTrackGetPayload<{ include: T }>[]>;
  /**
   * Lists library-track links for a library and album.
   * @param libraryId libraryId to match.
   * @param albumId albumId to match.
   * @param options Optional include or query options.
   * @returns Records that match the query criteria.
   */
  async listByLibraryAndAlbum(
    libraryId: string,
    albumId: string,
    options?: {
      orderBy?: LibraryTrackOrderByWithRelationInput | LibraryTrackOrderByWithRelationInput[];
      include?: Prisma.LibraryTrackInclude;
    },
  ): Promise<LibraryTrack[] | LibraryTrackGetPayload<{ include: Prisma.LibraryTrackInclude }>[]> {
    return await this.prisma.client.libraryTrack.findMany({
      where: {
        ...mergeLibraryTrackWhere({
          libraryId,
          track: { albumId },
        }),
        deletedAt: null,
      },
      orderBy: options?.orderBy,
      ...(options?.include ? { include: options.include } : {}),
    });
  }
  /**
   * Lists library-track IDs for a track and user.
   * @param trackId trackId to match.
   * @param userId userId to match.
   * @returns Records that match the query criteria.
   */
  async listIdsByTrackAndUser(trackId: string, userId: string): Promise<string[]> {
    const rows = await this.prisma.client.libraryTrack.findMany({
      where: {
        trackId,
        deletedAt: null,
        library: { userId },
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
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
    const count = await this.prisma.client.libraryTrack.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }
  /**
   * Checks whether a library-track link exists for the provided IDs.
   * @param libraryId libraryId to match.
   * @param trackId trackId to match.
   * @returns True when a matching record exists.
   */
  async existsForLibraryAndTrack(libraryId: string, trackId: string): Promise<boolean> {
    const count = await this.prisma.client.libraryTrack.count({
      where: mergeLibraryTrackWhere({ libraryId, trackId }),
    });
    return count > 0;
  }
  /**
   * Counts records that match the provided filters.
   * @param where Where clause constraints.
   * @returns Number of matching records.
   */
  async count(where?: LibraryTrackWhereInput): Promise<number> {
    const { track, ...rest } = where || {};
    return await this.prisma.client.libraryTrack.count({
      where: {
        ...rest,
        deletedAt:
          where && 'deletedAt' in where && where.deletedAt !== undefined ? where.deletedAt : null,
        track: {
          ...((track as object) || {}),
          deletedAt: null,
        },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: LibraryTrackCreateInput): Promise<LibraryTrack>;
  async create<T extends Prisma.LibraryTrackInclude>(
    data: LibraryTrackCreateInput,
    options: { include: T },
  ): Promise<LibraryTrackGetPayload<{ include: T }>>;
  /**
   * Creates a new record with the provided data.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created record. Includes related entities when `options.include` is provided.
   */
  async create(
    data: LibraryTrackCreateInput,
    options?: { include: Prisma.LibraryTrackInclude },
  ): Promise<LibraryTrack | LibraryTrackGetPayload<{ include: Prisma.LibraryTrackInclude }>> {
    return await this.prisma.client.libraryTrack.create({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async createMany(data: Prisma.LibraryTrackCreateManyInput[]): Promise<LibraryTrack[]>;
  async createMany<T extends Prisma.LibraryTrackInclude>(
    data: Prisma.LibraryTrackCreateManyInput[],
    options: { include: T },
  ): Promise<LibraryTrackGetPayload<{ include: T }>[]>;
  /**
   * Creates multiple records in a single operation.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created records. Includes related entities when `options.include` is provided.
   */
  async createMany(
    data: Prisma.LibraryTrackCreateManyInput[],
    options?: { include: Prisma.LibraryTrackInclude },
  ): Promise<LibraryTrack[] | LibraryTrackGetPayload<{ include: Prisma.LibraryTrackInclude }>[]> {
    return await this.prisma.client.libraryTrack.createManyAndReturn({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: LibraryTrackUpdateInput): Promise<LibraryTrack>;
  async update<T extends Prisma.LibraryTrackInclude>(
    id: string,
    data: LibraryTrackUpdateInput,
    options: { include: T },
  ): Promise<LibraryTrackGetPayload<{ include: T }>>;
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
    data: LibraryTrackUpdateInput,
    options?: { include: Prisma.LibraryTrackInclude },
  ): Promise<LibraryTrack | LibraryTrackGetPayload<{ include: Prisma.LibraryTrackInclude }>> {
    return await this.prisma.client.libraryTrack.update({
      data,
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
  }
  async updateMany(
    updates: { id: string; data: LibraryTrackUpdateInput }[],
  ): Promise<LibraryTrack[]>;
  async updateMany<T extends Prisma.LibraryTrackInclude>(
    updates: { id: string; data: LibraryTrackUpdateInput }[],
    options: { include: T },
  ): Promise<LibraryTrackGetPayload<{ include: T }>[]>;
  /**
   * Updates multiple existing records in a single operation.
   * @param updates List of record IDs and update payloads to apply.
   * @param options Optional include or query options.
   * @returns Updated records. Includes related entities when `options.include` is provided.
   */
  async updateMany(
    updates: { id: string; data: LibraryTrackUpdateInput }[],
    options?: { include: Prisma.LibraryTrackInclude },
  ): Promise<LibraryTrack[] | LibraryTrackGetPayload<{ include: Prisma.LibraryTrackInclude }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.libraryTrack.update({
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
  async delete(id: string): Promise<LibraryTrack> {
    return await this.prisma.client.libraryTrack.delete({ where: { id } });
  }
  /**
   * Soft-deletes a single record by setting its deletion timestamp.
   * @param id Record identifier.
   * @returns The resulting record after the write operation.
   * @throws Error if no matching record is found for this strict write operation.
   */
  async softDelete(id: string): Promise<LibraryTrack> {
    return await this.prisma.client.libraryTrack.update({
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
  async deleteMany(ids: string[]): Promise<LibraryTrack[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.prisma.client.libraryTrack.findMany({
      where: { id: { in: ids } },
    });
    await this.prisma.client.libraryTrack.deleteMany({
      where: { id: { in: ids } },
    });
    return rows;
  }
  /**
   * Soft-deletes multiple records by setting their deletion timestamps.
   * @param ids Record identifiers to match.
   * @returns The resulting record after the write operation.
   */
  async softDeleteMany(ids: string[]): Promise<LibraryTrack[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.prisma.client.libraryTrack.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });
    await this.prisma.client.libraryTrack.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return rows;
  }
}
