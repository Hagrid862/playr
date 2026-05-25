import { Injectable } from '@nestjs/common';
import { UNKNOWN_BUCKET_ALBUM_DISPLAY_NAME } from '@repo/contracts';
import {
  AccessRole,
  Album,
  AlbumCreateInput,
  AlbumGetPayload,
  AlbumOrderByWithRelationInput,
  AlbumSystemKind,
  AlbumType,
  AlbumUpdateInput,
  AlbumWhereInput,
  Prisma,
  Visibility,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2002'
  );
}

@Injectable()
export class AlbumRepository {
  constructor(private readonly prisma: PrismaService) {}
  private ownerEditOr(userId: string) {
    return [
      { access: { some: { userId, role: AccessRole.owner } } },
      { artists: { some: { access: { some: { userId, role: AccessRole.owner } } } } },
    ];
  }

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<Album | null>;
  async getById<T extends Prisma.AlbumInclude>(
    id: string,
    options: { include: T },
  ): Promise<AlbumGetPayload<{ include: T }> | null>;
  /**
   * Gets a single record by its ID.
   * @param id Record identifier.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getById(
    id: string,
    options?: { include: Prisma.AlbumInclude },
  ): Promise<Album | AlbumGetPayload<{ include: Prisma.AlbumInclude }> | null> {
    const row = await this.prisma.client.album.findUnique({
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
    if (!row || row.deletedAt) {
      return null;
    }
    return row;
  }

  async getByIdForOwner(id: string, userId: string): Promise<Album | null>;
  async getByIdForOwner<T extends Prisma.AlbumInclude>(
    id: string,
    userId: string,
    options: { include: T },
  ): Promise<AlbumGetPayload<{ include: T }> | null>;
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
    options?: { include: Prisma.AlbumInclude },
  ): Promise<Album | AlbumGetPayload<{ include: Prisma.AlbumInclude }> | null> {
    return await this.prisma.client.album.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: this.ownerEditOr(userId),
      },
      ...(options?.include ? { include: options.include } : {}),
    });
  }
  async getByIdForAlbumOwner(id: string, userId: string): Promise<Album | null>;
  async getByIdForAlbumOwner<T extends Prisma.AlbumInclude>(
    id: string,
    userId: string,
    options: { include: T },
  ): Promise<AlbumGetPayload<{ include: T }> | null>;
  /**
   * Gets a single album by ID when the user owns that album.
   * @param id Record identifier.
   * @param userId userId to match.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getByIdForAlbumOwner(
    id: string,
    userId: string,
    options?: { include: Prisma.AlbumInclude },
  ): Promise<Album | AlbumGetPayload<{ include: Prisma.AlbumInclude }> | null> {
    return await this.prisma.client.album.findFirst({
      where: {
        id,
        deletedAt: null,
        access: { some: { userId, role: AccessRole.owner } },
      },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async getByNameForOwner(name: string, userId: string): Promise<Album | null>;
  async getByNameForOwner<T extends Prisma.AlbumInclude>(
    name: string,
    userId: string,
    options: { include: T },
  ): Promise<AlbumGetPayload<{ include: T }> | null>;
  /**
   * Gets a single record by name when the user is an owner.
   * @param name Name value to look up.
   * @param userId userId to match.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getByNameForOwner(
    name: string,
    userId: string,
    options?: { include: Prisma.AlbumInclude },
  ): Promise<Album | AlbumGetPayload<{ include: Prisma.AlbumInclude }> | null> {
    return await this.prisma.client.album.findFirst({
      where: {
        name,
        deletedAt: null,
        systemKind: AlbumSystemKind.none,
        OR: this.ownerEditOr(userId),
      },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async getPaginated(
    page: number,
    limit: number,
    filter?: AlbumWhereInput,
    orderBy?: AlbumOrderByWithRelationInput,
  ): Promise<Album[]>;
  async getPaginated<T extends Prisma.AlbumInclude>(
    page: number,
    limit: number,
    filter: AlbumWhereInput | undefined,
    orderBy: AlbumOrderByWithRelationInput | undefined,
    options: { include: T },
  ): Promise<AlbumGetPayload<{ include: T }>[]>;
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
    filter?: AlbumWhereInput,
    orderBy?: AlbumOrderByWithRelationInput,
    options?: { include: Prisma.AlbumInclude },
  ): Promise<Album[] | AlbumGetPayload<{ include: Prisma.AlbumInclude }>[]> {
    return await this.prisma.client.album.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where: {
        ...filter,
        deletedAt:
          filter && 'deletedAt' in filter && filter.deletedAt !== undefined
            ? filter.deletedAt
            : null,
      },
      orderBy: orderBy ?? { createdAt: 'desc' },
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
    const count = await this.prisma.client.album.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }
  /**
   * Counts records that match the provided filters.
   * @param filter Filter criteria for matching rows.
   * @returns Number of matching records.
   */
  async count(filter?: AlbumWhereInput): Promise<number> {
    return await this.prisma.client.album.count({
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
   * @returns True when the principal is allowed to access the album.
   */
  async checkAccess(id: string, userId?: string): Promise<boolean> {
    const guestId = 'GUEST';
    const activeUserId = userId ?? guestId;

    const album = await this.prisma.client.album.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { visibility: 'public' },
          {
            access: {
              some: { userId: activeUserId },
            },
          },
          {
            artists: {
              some: {
                access: {
                  some: { userId: activeUserId },
                },
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    return !!album;
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: AlbumCreateInput): Promise<Album>;
  async create<T extends Prisma.AlbumInclude>(
    data: AlbumCreateInput,
    options: { include: T },
  ): Promise<AlbumGetPayload<{ include: T }>>;
  /**
   * Creates a new record with the provided data.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created record. Includes related entities when `options.include` is provided.
   */
  async create(
    data: AlbumCreateInput,
    options?: { include: Prisma.AlbumInclude },
  ): Promise<Album | AlbumGetPayload<{ include: Prisma.AlbumInclude }>> {
    return await this.prisma.client.album.create({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async createMany(data: Prisma.AlbumCreateManyInput[]): Promise<Album[]>;
  async createMany<T extends Prisma.AlbumInclude>(
    data: Prisma.AlbumCreateManyInput[],
    options: { include: T },
  ): Promise<AlbumGetPayload<{ include: T }>[]>;
  /**
   * Creates multiple records in a single operation.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created records. Includes related entities when `options.include` is provided.
   */
  async createMany(
    data: Prisma.AlbumCreateManyInput[],
    options?: { include: Prisma.AlbumInclude },
  ): Promise<Album[] | AlbumGetPayload<{ include: Prisma.AlbumInclude }>[]> {
    return await this.prisma.client.album.createManyAndReturn({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: AlbumUpdateInput): Promise<Album>;
  async update<T extends Prisma.AlbumInclude>(
    id: string,
    data: AlbumUpdateInput,
    options: { include: T },
  ): Promise<AlbumGetPayload<{ include: T }>>;
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
    data: AlbumUpdateInput,
    options?: { include: Prisma.AlbumInclude },
  ): Promise<Album | AlbumGetPayload<{ include: Prisma.AlbumInclude }>> {
    return await this.prisma.client.album.update({
      where: { id },
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }
  async updateMany(updates: { id: string; data: AlbumUpdateInput }[]): Promise<Album[]>;
  async updateMany<T extends Prisma.AlbumInclude>(
    updates: { id: string; data: AlbumUpdateInput }[],
    options: { include: T },
  ): Promise<AlbumGetPayload<{ include: T }>[]>;
  /**
   * Updates multiple existing records in a single operation.
   * @param updates List of record IDs and update payloads to apply.
   * @param options Optional include or query options.
   * @returns Updated records. Includes related entities when `options.include` is provided.
   */
  async updateMany(
    updates: { id: string; data: AlbumUpdateInput }[],
    options?: { include: Prisma.AlbumInclude },
  ): Promise<Album[] | AlbumGetPayload<{ include: Prisma.AlbumInclude }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.album.update({
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
  async delete(id: string): Promise<Album> {
    return await this.prisma.client.album.delete({ where: { id } });
  }
  /**
   * Soft-deletes a single record by setting its deletion timestamp.
   * @param id Record identifier.
   * @returns The resulting record after the write operation.
   * @throws Error if no matching record is found for this strict write operation.
   */
  async softDelete(id: string): Promise<Album> {
    return await this.prisma.client.album.update({
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
  async deleteMany(ids: string[]): Promise<Album[]> {
    if (ids.length === 0) {
      return [];
    }
    const albums = await this.prisma.client.album.findMany({
      where: { id: { in: ids } },
    });
    await this.prisma.client.album.deleteMany({
      where: { id: { in: ids } },
    });
    return albums;
  }
  /**
   * Soft-deletes multiple records by setting their deletion timestamps.
   * @param ids Record identifiers to match.
   * @returns The resulting record after the write operation.
   */
  async softDeleteMany(ids: string[]): Promise<Album[]> {
    if (ids.length === 0) {
      return [];
    }
    const albums = await this.prisma.client.album.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });
    await this.prisma.client.album.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return albums;
  }
  /**
   * Permanently deletes a record and its related cascade data.
   * @param id Record identifier.
   * @returns The resulting record after the write operation.
   * @throws Error if no matching record is found for this strict write operation.
   * @warning Permanently deletes records, including soft-deleted rows.
   */
  async deleteCascade(id: string): Promise<Album> {
    return await this.prisma.mainClient.$transaction(async (tx) => {
      const snapshot = await tx.album.findUnique({
        where: { id },
        select: { coverId: true },
      });

      await tx.report.updateMany({
        where: { target: { albumId: id } },
        data: { targetId: null },
      });
      await tx.reportTarget.deleteMany({ where: { albumId: id } });

      const deleted = await tx.album.delete({ where: { id } });
      if (snapshot?.coverId) {
        await tx.image.deleteMany({ where: { id: snapshot.coverId } });
      }

      return deleted;
    });
  }
  /**
   * Soft-deletes a record and related cascade data.
   * @param id Record identifier.
   * @returns The resulting record after the write operation.
   * @throws Error if no matching record is found for this strict write operation.
   */
  async softDeleteCascade(id: string): Promise<Album> {
    const now = new Date();

    return await this.prisma.mainClient.$transaction(async (tx) => {
      const albumRow = await tx.album.findUnique({
        where: { id },
        select: { coverId: true, deletedAt: true },
      });
      const snapshot = albumRow && !albumRow.deletedAt ? { coverId: albumRow.coverId } : null;

      await tx.reportTarget.updateMany({
        where: { albumId: id, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.libraryAlbum.updateMany({
        where: { albumId: id, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.libraryPin.updateMany({
        where: { albumId: id, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.communityComment.updateMany({
        where: { albumId: id, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.playlistTrack.updateMany({
        where: { track: { albumId: id }, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.libraryTrack.updateMany({
        where: { track: { albumId: id }, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.libraryPin.updateMany({
        where: { track: { albumId: id }, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.libraryFavorite.updateMany({
        where: { track: { albumId: id }, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.communityComment.updateMany({
        where: { track: { albumId: id }, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.track.updateMany({
        where: { albumId: id, deletedAt: null },
        data: { deletedAt: now },
      });
      if (snapshot?.coverId) {
        await tx.image.updateMany({
          where: { id: snapshot.coverId, deletedAt: null },
          data: { deletedAt: now },
        });
      }

      return tx.album.update({
        where: { id },
        data: { deletedAt: now },
      });
    });
  }

  /**
   * Moves active tracks from {@link sourceAlbumId} into the user's unknown-bucket album, then
   * soft-deletes album-scoped rows without removing tracks from playlists or library.
   */
  async softDeleteAlbumReassignTracksToUnknownBucket(params: {
    userId: string;
    libraryId: string;
    sourceAlbumId: string;
  }): Promise<Album> {
    const { userId, libraryId, sourceAlbumId } = params;
    const now = new Date();

    return await this.prisma.mainClient.$transaction(async (tx) => {
      const findUnknownBucketAlbumId = async (): Promise<string | null> => {
        const row = await tx.album.findFirst({
          where: {
            systemKind: AlbumSystemKind.unknown_bucket,
            libraryId,
            deletedAt: null,
            access: { some: { userId, role: AccessRole.owner } },
            libraryAlbums: { some: { libraryId, deletedAt: null } },
          },
          select: { id: true },
        });
        return row?.id ?? null;
      };

      let unknownAlbumId = await findUnknownBucketAlbumId();

      if (!unknownAlbumId) {
        try {
          const created = await tx.album.create({
            data: {
              name: UNKNOWN_BUCKET_ALBUM_DISPLAY_NAME,
              systemKind: AlbumSystemKind.unknown_bucket,
              visibility: Visibility.private,
              type: AlbumType.compilation,
              library: { connect: { id: libraryId } },
              access: {
                create: { userId, role: AccessRole.owner },
              },
              libraryAlbums: {
                create: {
                  library: { connect: { id: libraryId } },
                },
              },
            },
            select: { id: true },
          });
          unknownAlbumId = created.id;
        } catch (e) {
          if (!isPrismaUniqueViolation(e)) {
            throw e;
          }
          unknownAlbumId = await findUnknownBucketAlbumId();
          if (!unknownAlbumId) {
            throw e;
          }
        }
      }

      if (unknownAlbumId === sourceAlbumId) {
        throw new Error('Cannot reassign tracks from the unknown album to itself');
      }

      await tx.track.updateMany({
        where: { albumId: sourceAlbumId, deletedAt: null },
        data: { albumId: unknownAlbumId },
      });

      await tx.reportTarget.updateMany({
        where: { albumId: sourceAlbumId, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.libraryAlbum.updateMany({
        where: { albumId: sourceAlbumId, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.libraryPin.updateMany({
        where: { albumId: sourceAlbumId, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.communityComment.updateMany({
        where: { albumId: sourceAlbumId, deletedAt: null },
        data: { deletedAt: now },
      });

      const albumRow = await tx.album.findUnique({
        where: { id: sourceAlbumId },
        select: { coverId: true, deletedAt: true },
      });
      const snapshot = albumRow && !albumRow.deletedAt ? { coverId: albumRow.coverId } : null;

      if (snapshot?.coverId) {
        await tx.image.updateMany({
          where: { id: snapshot.coverId, deletedAt: null },
          data: { deletedAt: now },
        });
      }

      return tx.album.update({
        where: { id: sourceAlbumId },
        data: { deletedAt: now },
      });
    });
  }
}
