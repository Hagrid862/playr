import { Injectable } from '@nestjs/common';
import {
  AccessRole,
  Album,
  AlbumCreateInput,
  AlbumGetPayload,
  AlbumOrderByWithRelationInput,
  AlbumUpdateInput,
  AlbumWhereInput,
  Prisma,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

/** Shared conventions: see docblock at top of `track.repository.ts` (getById, getPaginated, delete vs softDelete). */
@Injectable()
export class AlbumRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Owner ACL on the album row, or owner ACL on a linked artist (library edit flows). */
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

  /**
   * Album the user may edit via album owner ACL or artist owner ACL (update + name uniqueness).
   */
  async getByIdForOwner(id: string, userId: string): Promise<Album | null>;
  async getByIdForOwner<T extends Prisma.AlbumInclude>(
    id: string,
    userId: string,
    options: { include: T },
  ): Promise<AlbumGetPayload<{ include: T }> | null>;
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

  /** Album where the user has owner ACL on the album row (covers, strict delete). */
  async getByIdForAlbumOwner(id: string, userId: string): Promise<Album | null>;
  async getByIdForAlbumOwner<T extends Prisma.AlbumInclude>(
    id: string,
    userId: string,
    options: { include: T },
  ): Promise<AlbumGetPayload<{ include: T }> | null>;
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
  async getByNameForOwner(
    name: string,
    userId: string,
    options?: { include: Prisma.AlbumInclude },
  ): Promise<Album | AlbumGetPayload<{ include: Prisma.AlbumInclude }> | null> {
    return await this.prisma.client.album.findFirst({
      where: {
        name,
        deletedAt: null,
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

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.album.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }

  async count(filter?: AlbumWhereInput): Promise<number> {
    return await this.prisma.client.album.count({
      where: {
        ...filter,
        deletedAt: null,
      },
    });
  }

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

  async updateMany(
    updates: { id: string; data: AlbumUpdateInput }[],
  ): Promise<Album[]>;
  async updateMany<T extends Prisma.AlbumInclude>(
    updates: { id: string; data: AlbumUpdateInput }[],
    options: { include: T },
  ): Promise<AlbumGetPayload<{ include: T }>[]>;
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

  async delete(id: string): Promise<Album> {
    return await this.prisma.client.album.delete({ where: { id } });
  }

  async softDelete(id: string): Promise<Album> {
    return await this.prisma.client.album.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Hard-delete by primary keys only. No-op when `ids` is empty. */
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

  /** Soft-delete by primary keys only. No-op when `ids` is empty. */
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
   * Hard-delete an album and dependent rows: report targets, then the album row (DB
   * cascades tracks, audio files, playlist track links, library rows, album comments,
   * genres, access, etc.). Deletes the cover {@link Image} row when present.
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
   * Soft-delete an album: report targets, library album links, pins on this album,
   * album comments, playlist/library rows for tracks on this album, track comments,
   * favorites, tracks (songs), cover image, then the album.
   */
  async softDeleteCascade(id: string): Promise<Album> {
    const now = new Date();

    return await this.prisma.mainClient.$transaction(async (tx) => {
      const albumRow = await tx.album.findUnique({
        where: { id },
        select: { coverId: true, deletedAt: true },
      });
      const snapshot =
        albumRow && !albumRow.deletedAt ? { coverId: albumRow.coverId } : null;

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
}
