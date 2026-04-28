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

/**
 * Repository conventions (see sibling `*.repository.ts` files in this folder):
 *
 * - **getById** — `findUnique` by `id`, returns `null` when missing or soft-deleted (`deletedAt`).
 * - **getPaginated(page, limit, filter?, orderBy?, options?)** — Page is 1-based; maps to Prisma skip/take.
 * - **delete** — Hard delete (`prisma.delete`). Use **softDelete** to set `deletedAt` for soft-deletable rows.
 * - **deleteMany** / **softDeleteMany** — Only accept explicit `id` arrays so callers cannot pass an empty filter and wipe a table.
 */
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

  /**
   * Track where the user has explicit owner ACL (library edit/delete flows).
   */
  async getByIdForOwner(id: string, userId: string): Promise<Track | null>;
  async getByIdForOwner<T extends Prisma.TrackInclude>(
    id: string,
    userId: string,
    options: { include: T },
  ): Promise<TrackGetPayload<{ include: T }> | null>;
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

  /** All non-deleted tracks on an album, ordered by disc then track number. */
  async listByAlbumId(albumId: string): Promise<Track[]>;
  async listByAlbumId<T extends Prisma.TrackInclude>(
    albumId: string,
    options: { include: T },
  ): Promise<TrackGetPayload<{ include: T }>[]>;
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

  /** Tracks credited to an artist (many-to-many). */
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

  /**
   * Tracks visible to a principal using the same rules as {@link checkAccess}
   * (public, track/album/artist ACL). Omit `principalUserId` or pass `undefined` for guest.
   */
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

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.track.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }

  async count(filter?: TrackWhereInput): Promise<number> {
    return await this.prisma.client.track.count({
      where: {
        ...filter,
        deletedAt: null,
      },
    });
  }

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
  async createMany(
    data: Prisma.TrackCreateManyInput[],
    options?: { include: Prisma.TrackInclude },
  ): Promise<
    Track[] | TrackGetPayload<{ include: Prisma.TrackInclude }>[]
  > {
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

  async updateMany(
    updates: { id: string; data: TrackUpdateInput }[],
  ): Promise<Track[]>;
  async updateMany<T extends Prisma.TrackInclude>(
    updates: { id: string; data: TrackUpdateInput }[],
    options: { include: T },
  ): Promise<TrackGetPayload<{ include: T }>[]>;
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

  async delete(id: string): Promise<Track> {
    return await this.prisma.client.track.delete({
      where: { id },
    });
  }

  async softDelete(id: string): Promise<Track> {
    return await this.prisma.client.track.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Hard-delete by primary keys only. No-op when `ids` is empty. */
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

  /** Soft-delete by primary keys only. No-op when `ids` is empty. */
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
