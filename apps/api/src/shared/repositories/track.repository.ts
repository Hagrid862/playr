import { Injectable } from '@nestjs/common';
import {
  AccessRole,
  Prisma,
  Track,
  TrackCreateInput,
  TrackGetPayload,
  TrackOrderByWithRelationInput,
  TrackUpdateInput,
  TrackWhereInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';
@Injectable()
export class TrackRepository {
  private static readonly GUEST_USER_ID = 'GUEST';

  constructor(private readonly prisma: PrismaService) {}
  private accessibleOr(activeUserId: string) {
    return [
      { visibility: 'public' as const },
      { access: { some: { userId: activeUserId } } },
      { album: { access: { some: { userId: activeUserId } } } },
      {
        artists: {
          some: {
            access: { some: { userId: activeUserId } },
          },
        },
      },
    ];
  }

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<Track | null>;
  async getById<T extends Prisma.TrackInclude>(
    id: string,
    options: { include: T },
  ): Promise<TrackGetPayload<{ include: T }> | null>;
  /**
   * Gets a single record by its ID.
   * @param id Record identifier.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getById(
    id: string,
    options?: { include: Prisma.TrackInclude },
  ): Promise<Track | TrackGetPayload<{ include: Prisma.TrackInclude }> | null> {
    const row = await this.prisma.client.track.findUnique({
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
    if (!row || row.deletedAt) {
      return null;
    }
    return row;
  }

  async getByIdForOwner(id: string, userId: string): Promise<Track | null>;
  async getByIdForOwner<T extends Prisma.TrackInclude>(
    id: string,
    userId: string,
    options: { include: T },
  ): Promise<TrackGetPayload<{ include: T }> | null>;
  /**
   * Gets a single record by ID when the user is an owner.
   * @param id Record identifier.
   * @param userId userId to match.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getByIdForOwner(
    id: string,
    userId: string,
    options?: { include: Prisma.TrackInclude },
  ): Promise<Track | TrackGetPayload<{ include: Prisma.TrackInclude }> | null> {
    return await this.prisma.client.track.findFirst({
      where: {
        id,
        deletedAt: null,
        access: { some: { userId, role: AccessRole.owner } },
      },
      ...(options?.include ? { include: options.include } : {}),
    });
  }
  async listByAlbumId(albumId: string): Promise<Track[]>;
  async listByAlbumId<T extends Prisma.TrackInclude>(
    albumId: string,
    options: { include: T },
  ): Promise<TrackGetPayload<{ include: T }>[]>;
  /**
   * Lists tracks that belong to the provided album ID.
   * @param albumId albumId to match.
   * @param options Optional include or query options.
   * @returns Records that match the query criteria.
   */
  async listByAlbumId<T extends Prisma.TrackInclude>(
    albumId: string,
    options?: { include: T },
  ): Promise<Track[] | TrackGetPayload<{ include: T }>[]> {
    return await this.prisma.client.track.findMany({
      where: { albumId, deletedAt: null },
      orderBy: [{ diskNumber: 'asc' }, { trackNumber: 'asc' }],
      ...(options?.include ? { include: options.include } : {}),
    });
  }
  async listByArtistId(artistId: string): Promise<Track[]>;
  async listByArtistId(
    artistId: string,
    options: { take?: number; skip?: number; orderBy?: TrackOrderByWithRelationInput },
  ): Promise<Track[]>;
  async listByArtistId<T extends Prisma.TrackInclude>(
    artistId: string,
    options: {
      include: T;
      take?: number;
      skip?: number;
      orderBy?: TrackOrderByWithRelationInput;
    },
  ): Promise<TrackGetPayload<{ include: T }>[]>;
  /**
   * Lists tracks associated with the provided artist ID.
   * @param artistId artistId to match.
   * @param options Optional pagination (`take`, `skip`), sorting (`orderBy`), and relation include (`include`) options.
   * @returns Records that match the query criteria.
   */
  async listByArtistId<T extends Prisma.TrackInclude>(
    artistId: string,
    options?: {
      include?: T;
      take?: number;
      skip?: number;
      orderBy?: TrackOrderByWithRelationInput;
    },
  ): Promise<Track[] | TrackGetPayload<{ include: T }>[]> {
    const { take, skip, orderBy, include } = options ?? {};
    return await this.prisma.client.track.findMany({
      where: {
        deletedAt: null,
        artists: { some: { id: artistId } },
      },
      take,
      skip,
      orderBy: orderBy ?? { createdAt: 'desc' },
      ...(include ? { include } : {}),
    });
  }
  async listAccessibleForPrincipal(
    principalUserId: string | undefined,
    options?: {
      take?: number;
      skip?: number;
      orderBy?: TrackOrderByWithRelationInput;
    },
  ): Promise<Track[]>;
  async listAccessibleForPrincipal<T extends Prisma.TrackInclude>(
    principalUserId: string | undefined,
    options: {
      take?: number;
      skip?: number;
      orderBy?: TrackOrderByWithRelationInput;
      include: T;
    },
  ): Promise<TrackGetPayload<{ include: T }>[]>;
  /**
   * Lists tracks accessible to the provided principal.
   * @param principalUserId principalUserId to match.
   * @param options Optional pagination (`take`, `skip`), sorting (`orderBy`), and relation include (`include`) options.
   * @returns Records that match the query criteria.
   */
  async listAccessibleForPrincipal<T extends Prisma.TrackInclude>(
    principalUserId: string | undefined,
    options?: {
      take?: number;
      skip?: number;
      orderBy?: TrackOrderByWithRelationInput;
      include?: T;
    },
  ): Promise<Track[] | TrackGetPayload<{ include: T }>[]> {
    const activeUserId = principalUserId ?? TrackRepository.GUEST_USER_ID;
    return await this.prisma.client.track.findMany({
      where: {
        deletedAt: null,
        OR: this.accessibleOr(activeUserId),
      },
      take: options?.take,
      skip: options?.skip,
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async getPaginated(
    page: number,
    limit: number,
    filter?: TrackWhereInput,
    orderBy?: TrackOrderByWithRelationInput,
  ): Promise<Track[]>;
  async getPaginated<T extends Prisma.TrackInclude>(
    page: number,
    limit: number,
    filter: TrackWhereInput | undefined,
    orderBy: TrackOrderByWithRelationInput | undefined,
    options: { include: T },
  ): Promise<TrackGetPayload<{ include: T }>[]>;
  /**
   * Returns a paginated list of matching records.
   * @param page 1-based page index.
   * @param limit Maximum rows to return.
   * @param filter Filter criteria for matching rows.
   * @param orderBy Sort order for the query.
   * @param options Optional include or query options.
   * @returns Records that match the query criteria.
   */
  async getPaginated<T extends Prisma.TrackInclude>(
    page: number,
    limit: number,
    filter?: TrackWhereInput,
    orderBy?: TrackOrderByWithRelationInput,
    options?: { include: T },
  ): Promise<Track[] | TrackGetPayload<{ include: T }>[]> {
    return await this.prisma.client.track.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where: {
        ...filter,
        deletedAt: null,
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
    const count = await this.prisma.client.track.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }
  /**
   * Counts records that match the provided filters.
   * @param filter Filter criteria for matching rows.
   * @returns Number of matching records.
   */
  async count(filter?: TrackWhereInput): Promise<number> {
    return await this.prisma.client.track.count({
      where: {
        ...filter,
        deletedAt: null,
      },
    });
  }
  /**
   * Checks whether the user can access the requested record.
   * @param id Record identifier.
   * @param userId userId to match.
   * @returns True when the principal is allowed to access the track.
   */
  async checkAccess(id: string, userId?: string): Promise<boolean> {
    const activeUserId = userId ?? TrackRepository.GUEST_USER_ID;

    const track = await this.prisma.client.track.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: this.accessibleOr(activeUserId),
      },
      select: { id: true },
    });

    return !!track;
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: TrackCreateInput): Promise<Track>;
  async create<T extends Prisma.TrackInclude>(
    data: TrackCreateInput,
    options: { include: T },
  ): Promise<TrackGetPayload<{ include: T }>>;
  /**
   * Creates a new record with the provided data.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created record. Includes related entities when `options.include` is provided.
   */
  async create(
    data: TrackCreateInput,
    options?: { include: Prisma.TrackInclude },
  ): Promise<Track | TrackGetPayload<{ include: Prisma.TrackInclude }>> {
    return await this.prisma.client.track.create({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async createMany(data: Prisma.TrackCreateManyInput[]): Promise<Track[]>;
  async createMany<T extends Prisma.TrackInclude>(
    data: Prisma.TrackCreateManyInput[],
    options: { include: T },
  ): Promise<TrackGetPayload<{ include: T }>[]>;
  /**
   * Creates multiple records in a single operation.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created records. Includes related entities when `options.include` is provided.
   */
  async createMany(
    data: Prisma.TrackCreateManyInput[],
    options?: { include: Prisma.TrackInclude },
  ): Promise<Track[] | TrackGetPayload<{ include: Prisma.TrackInclude }>[]> {
    return await this.prisma.client.track.createManyAndReturn({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: TrackUpdateInput): Promise<Track>;
  async update<T extends Prisma.TrackInclude>(
    id: string,
    data: TrackUpdateInput,
    options: { include: T },
  ): Promise<TrackGetPayload<{ include: T }>>;
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
    data: TrackUpdateInput,
    options?: { include: Prisma.TrackInclude },
  ): Promise<Track | TrackGetPayload<{ include: Prisma.TrackInclude }>> {
    return await this.prisma.client.track.update({
      where: { id },
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }
  async updateMany(updates: { id: string; data: TrackUpdateInput }[]): Promise<Track[]>;
  async updateMany<T extends Prisma.TrackInclude>(
    updates: { id: string; data: TrackUpdateInput }[],
    options: { include: T },
  ): Promise<TrackGetPayload<{ include: T }>[]>;
  /**
   * Updates multiple existing records in a single operation.
   * @param updates List of record IDs and update payloads to apply.
   * @param options Optional include or query options.
   * @returns Updated records. Includes related entities when `options.include` is provided.
   */
  async updateMany(
    updates: { id: string; data: TrackUpdateInput }[],
    options?: { include: Prisma.TrackInclude },
  ): Promise<Track[] | TrackGetPayload<{ include: Prisma.TrackInclude }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.track.update({
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
  async delete(id: string): Promise<Track> {
    return await this.prisma.client.track.delete({
      where: { id },
    });
  }
  /**
   * Soft-deletes a single record by setting its deletion timestamp.
   * @param id Record identifier.
   * @returns The resulting record after the write operation.
   * @throws Error if no matching record is found for this strict write operation.
   */
  async softDelete(id: string): Promise<Track> {
    return await this.prisma.client.track.update({
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
  async deleteMany(ids: string[]): Promise<Track[]> {
    if (ids.length === 0) {
      return [];
    }
    const tracks = await this.prisma.client.track.findMany({
      where: { id: { in: ids } },
    });
    await this.prisma.client.track.deleteMany({
      where: { id: { in: ids } },
    });
    return tracks;
  }
  /**
   * Soft-deletes multiple records by setting their deletion timestamps.
   * @param ids Record identifiers to match.
   * @returns The resulting record after the write operation.
   */
  async softDeleteMany(ids: string[]): Promise<Track[]> {
    if (ids.length === 0) {
      return [];
    }
    const tracks = await this.prisma.client.track.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });
    await this.prisma.client.track.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return tracks;
  }
}
