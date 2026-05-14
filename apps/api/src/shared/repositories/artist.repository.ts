import { Injectable } from '@nestjs/common';
import {
  AccessRole,
  Artist,
  ArtistCreateInput,
  ArtistGetPayload,
  ArtistOrderByWithRelationInput,
  ArtistUpdateInput,
  ArtistWhereInput,
  Prisma,
  PrismaClient,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class ArtistRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<Artist | null>;
  async getById<T extends Prisma.ArtistInclude>(
    id: string,
    options: { include: T },
  ): Promise<ArtistGetPayload<{ include: T }> | null>;
  /**
   * Gets a single record by its ID.
   * @param id Record identifier.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getById(
    id: string,
    options?: { include: Prisma.ArtistInclude },
  ): Promise<Artist | ArtistGetPayload<{ include: Prisma.ArtistInclude }> | null> {
    const row = await this.prisma.client.artist.findUnique({
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
    if (!row || row.deletedAt) {
      return null;
    }
    return row;
  }
  async getByIdForOwner(id: string, userId: string): Promise<Artist | null>;
  async getByIdForOwner<T extends Prisma.ArtistInclude>(
    id: string,
    userId: string,
    options: { include: T },
  ): Promise<ArtistGetPayload<{ include: T }> | null>;
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
    options?: { include: Prisma.ArtistInclude },
  ): Promise<Artist | ArtistGetPayload<{ include: Prisma.ArtistInclude }> | null> {
    return await this.prisma.client.artist.findFirst({
      where: {
        id,
        deletedAt: null,
        access: { some: { userId, role: AccessRole.owner } },
      },
      ...(options?.include ? { include: options.include } : {}),
    });
  }
  async getByNameForOwner(name: string, userId: string): Promise<Artist | null>;
  async getByNameForOwner<T extends Prisma.ArtistInclude>(
    name: string,
    userId: string,
    options: { include: T },
  ): Promise<ArtistGetPayload<{ include: T }> | null>;
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
    options?: { include: Prisma.ArtistInclude },
  ): Promise<Artist | ArtistGetPayload<{ include: Prisma.ArtistInclude }> | null> {
    return await this.prisma.client.artist.findFirst({
      where: {
        name,
        deletedAt: null,
        access: { some: { userId, role: AccessRole.owner } },
      },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async getPaginated(
    page: number,
    limit: number,
    filter?: ArtistWhereInput,
    orderBy?: ArtistOrderByWithRelationInput,
  ): Promise<Artist[]>;
  async getPaginated<T extends Prisma.ArtistInclude>(
    page: number,
    limit: number,
    filter: ArtistWhereInput | undefined,
    orderBy: ArtistOrderByWithRelationInput | undefined,
    options: { include: T },
  ): Promise<ArtistGetPayload<{ include: T }>[]>;
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
    filter?: ArtistWhereInput,
    orderBy?: ArtistOrderByWithRelationInput,
    options?: { include: Prisma.ArtistInclude },
  ): Promise<Artist[] | ArtistGetPayload<{ include: Prisma.ArtistInclude }>[]> {
    return await this.prisma.client.artist.findMany({
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
    const count = await this.prisma.client.artist.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }
  /**
   * Counts records that match the provided filters.
   * @param filter Filter criteria for matching rows.
   * @returns Number of matching records.
   */
  async count(filter?: ArtistWhereInput): Promise<number> {
    return await this.prisma.client.artist.count({
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
   * @returns True when the principal is allowed to access the artist.
   */
  async checkAccess(id: string, userId?: string): Promise<boolean> {
    const guestId = 'GUEST';
    const activeUserId = userId ?? guestId;

    const artist = await this.prisma.client.artist.findFirst({
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
        ],
      },
      select: { id: true },
    });

    return !!artist;
  }

  /**
   * Counts how many of the given artist ids are active and owned by the user (owner access).
   * @param artistIds Distinct ids to check (callers should dedupe).
   */
  async countActiveOwnedByUser(artistIds: string[], userId: string): Promise<number> {
    if (artistIds.length === 0) {
      return 0;
    }
    return await this.prisma.client.artist.count({
      where: {
        id: { in: artistIds },
        deletedAt: null,
        access: { some: { userId, role: AccessRole.owner } },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: ArtistCreateInput): Promise<Artist>;
  async create<T extends Prisma.ArtistInclude>(
    data: ArtistCreateInput,
    options: { include: T },
  ): Promise<ArtistGetPayload<{ include: T }>>;
  /**
   * Creates a new record with the provided data.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created record. Includes related entities when `options.include` is provided.
   */
  async create(
    data: ArtistCreateInput,
    options?: { include: Prisma.ArtistInclude },
  ): Promise<Artist | ArtistGetPayload<{ include: Prisma.ArtistInclude }>> {
    return await this.prisma.client.artist.create({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async createMany(data: Prisma.ArtistCreateManyInput[]): Promise<Artist[]>;
  async createMany<T extends Prisma.ArtistInclude>(
    data: Prisma.ArtistCreateManyInput[],
    options: { include: T },
  ): Promise<ArtistGetPayload<{ include: T }>[]>;
  /**
   * Creates multiple records in a single operation.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created records. Includes related entities when `options.include` is provided.
   */
  async createMany(
    data: Prisma.ArtistCreateManyInput[],
    options?: { include: Prisma.ArtistInclude },
  ): Promise<Artist[] | ArtistGetPayload<{ include: Prisma.ArtistInclude }>[]> {
    return await this.prisma.client.artist.createManyAndReturn({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: ArtistUpdateInput): Promise<Artist>;
  async update<T extends Prisma.ArtistInclude>(
    id: string,
    data: ArtistUpdateInput,
    options: { include: T },
  ): Promise<ArtistGetPayload<{ include: T }>>;
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
    data: ArtistUpdateInput,
    options?: { include: Prisma.ArtistInclude },
  ): Promise<Artist | ArtistGetPayload<{ include: Prisma.ArtistInclude }>> {
    return await this.prisma.client.artist.update({
      where: { id },
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }
  async updateMany(updates: { id: string; data: ArtistUpdateInput }[]): Promise<Artist[]>;
  async updateMany<T extends Prisma.ArtistInclude>(
    updates: { id: string; data: ArtistUpdateInput }[],
    options: { include: T },
  ): Promise<ArtistGetPayload<{ include: T }>[]>;
  /**
   * Updates multiple existing records in a single operation.
   * @param updates List of record IDs and update payloads to apply.
   * @param options Optional include or query options.
   * @returns Updated records. Includes related entities when `options.include` is provided.
   */
  async updateMany(
    updates: { id: string; data: ArtistUpdateInput }[],
    options?: { include: Prisma.ArtistInclude },
  ): Promise<Artist[] | ArtistGetPayload<{ include: Prisma.ArtistInclude }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.artist.update({
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
  async delete(id: string): Promise<Artist> {
    return await this.prisma.client.artist.delete({ where: { id } });
  }
  /**
   * Soft-deletes a single record by setting its deletion timestamp.
   * @param id Record identifier.
   * @returns The resulting record after the write operation.
   * @throws Error if no matching record is found for this strict write operation.
   */
  async softDelete(id: string): Promise<Artist> {
    return await this.prisma.client.artist.update({
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
  async deleteMany(ids: string[]): Promise<Artist[]> {
    if (ids.length === 0) {
      return [];
    }
    const artists = await this.prisma.client.artist.findMany({
      where: { id: { in: ids } },
    });
    await this.prisma.client.artist.deleteMany({
      where: { id: { in: ids } },
    });
    return artists;
  }
  /**
   * Soft-deletes multiple records by setting their deletion timestamps.
   * @param ids Record identifiers to match.
   * @returns The resulting record after the write operation.
   */
  async softDeleteMany(ids: string[]): Promise<Artist[]> {
    if (ids.length === 0) {
      return [];
    }
    const artists = await this.prisma.client.artist.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });
    await this.prisma.client.artist.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return artists;
  }
  /**
   * Permanently deletes a record and its related cascade data.
   * @param id Record identifier.
   * @returns The resulting record after the write operation.
   * @throws Error if no matching record is found for this strict write operation.
   * @warning Permanently deletes records, including soft-deleted rows.
   */
  async deleteCascade(id: string): Promise<Artist> {
    return await this.prisma.mainClient.$transaction(async (tx) => {
      await tx.playlist.deleteMany({ where: { artistId: id } });

      await tx.report.updateMany({
        where: { target: { artistId: id } },
        data: { targetId: null },
      });
      await tx.reportTarget.deleteMany({ where: { artistId: id } });

      await tx.artistProfile.updateMany({
        where: { artistId: id },
        data: { artistId: null },
      });
      await tx.communityProfile.updateMany({
        where: { artistId: id },
        data: { artistId: null },
      });

      await this.disconnectArtistFromAlbumsAndTracks(tx, id);

      return tx.artist.delete({ where: { id } });
    });
  }
  /**
   * Soft-deletes a record and related cascade data.
   * @param id Record identifier.
   * @returns The resulting record after the write operation.
   * @throws Error if no matching record is found for this strict write operation.
   */
  async softDeleteCascade(id: string): Promise<Artist> {
    const now = new Date();

    return await this.prisma.mainClient.$transaction(async (tx) => {
      await tx.playlist.updateMany({
        where: { artistId: id, deletedAt: null },
        data: { deletedAt: now },
      });
      await tx.reportTarget.updateMany({
        where: { artistId: id, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.libraryArtist.updateMany({
        where: { artistId: id, deletedAt: null },
        data: { deletedAt: now },
      });
      await tx.libraryPin.updateMany({
        where: { artistId: id, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.artistProfile.updateMany({
        where: { artistId: id },
        data: { artistId: null },
      });
      await tx.communityProfile.updateMany({
        where: { artistId: id },
        data: { artistId: null },
      });

      await this.disconnectArtistFromAlbumsAndTracks(tx, id);

      return tx.artist.update({
        where: { id },
        data: { deletedAt: now },
      });
    });
  }

  /**
   * Removes implicit many-to-many links from albums/tracks for this artist only,
   * preserving albums and tracks that remain credited to other artists.
   * _AlbumArtists: A = album id, B = artist id. _TrackArtists: A = artist id, B = track id.
   */
  private async disconnectArtistFromAlbumsAndTracks(
    tx: Pick<PrismaClient, '$executeRaw'>,
    artistId: string,
  ): Promise<void> {
    await tx.$executeRaw(Prisma.sql`DELETE FROM "_AlbumArtists" WHERE "B" = ${artistId}`);
    await tx.$executeRaw(Prisma.sql`DELETE FROM "_TrackArtists" WHERE "A" = ${artistId}`);
  }
}
