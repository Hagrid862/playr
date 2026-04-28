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

  /** Artist row where the user has owner ACL (edit, delete, uploads). */
  async getByIdForOwner(id: string, userId: string): Promise<Artist | null>;
  async getByIdForOwner<T extends Prisma.ArtistInclude>(
    id: string,
    userId: string,
    options: { include: T },
  ): Promise<ArtistGetPayload<{ include: T }> | null>;
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

  /** Name collision within the user's owned artists. */
  async getByNameForOwner(name: string, userId: string): Promise<Artist | null>;
  async getByNameForOwner<T extends Prisma.ArtistInclude>(
    name: string,
    userId: string,
    options: { include: T },
  ): Promise<ArtistGetPayload<{ include: T }> | null>;
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

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.artist.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }

  async count(filter?: ArtistWhereInput): Promise<number> {
    return await this.prisma.client.artist.count({
      where: {
        ...filter,
        deletedAt: null,
      },
    });
  }

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

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: ArtistCreateInput): Promise<Artist>;
  async create<T extends Prisma.ArtistInclude>(
    data: ArtistCreateInput,
    options: { include: T },
  ): Promise<ArtistGetPayload<{ include: T }>>;
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
  async createMany(
    data: Prisma.ArtistCreateManyInput[],
    options?: { include: Prisma.ArtistInclude },
  ): Promise<
    Artist[] | ArtistGetPayload<{ include: Prisma.ArtistInclude }>[]
  > {
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

  async updateMany(
    updates: { id: string; data: ArtistUpdateInput }[],
  ): Promise<Artist[]>;
  async updateMany<T extends Prisma.ArtistInclude>(
    updates: { id: string; data: ArtistUpdateInput }[],
    options: { include: T },
  ): Promise<ArtistGetPayload<{ include: T }>[]>;
  async updateMany(
    updates: { id: string; data: ArtistUpdateInput }[],
    options?: { include: Prisma.ArtistInclude },
  ): Promise<
    Artist[] | ArtistGetPayload<{ include: Prisma.ArtistInclude }>[]
  > {
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

  async delete(id: string): Promise<Artist> {
    return await this.prisma.client.artist.delete({ where: { id } });
  }

  async softDelete(id: string): Promise<Artist> {
    return await this.prisma.client.artist.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Hard-delete by primary keys only. No-op when `ids` is empty. */
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

  /** Soft-delete by primary keys only. No-op when `ids` is empty. */
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
   * Hard-delete an artist and associated domain data: playlists owned by the artist,
   * report targets, library pins / library-artist rows, albums (and cascaded tracks,
   * audio files, playlist entries, etc.), any remaining tracks crediting this artist,
   * then the artist row. Clears optional `artistId` on artist/community profiles.
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

      const albums = await tx.album.findMany({
        where: { artists: { some: { id } } },
        select: { id: true },
      });
      const albumIds = albums.map((a) => a.id);

      if (albumIds.length > 0) {
        await tx.album.deleteMany({ where: { id: { in: albumIds } } });
      }

      await tx.track.deleteMany({
        where: { artists: { some: { id } } },
      });

      return tx.artist.delete({ where: { id } });
    });
  }

  /**
   * Soft-delete an artist and associated data: playlists, report targets, library
   * artist links and pins, albums and their tracks (plus any remaining tracks crediting
   * this artist). Clears optional `artistId` on profiles; does not soft-delete entire
   * community profiles.
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

      const albums = await tx.album.findMany({
        where: {
          artists: { some: { id } },
          deletedAt: null,
        },
        select: { id: true },
      });
      const albumIds = albums.map((a) => a.id);

      if (albumIds.length > 0) {
        await tx.album.updateMany({
          where: { id: { in: albumIds }, deletedAt: null },
          data: { deletedAt: now },
        });
        await tx.track.updateMany({
          where: { albumId: { in: albumIds }, deletedAt: null },
          data: { deletedAt: now },
        });
      }

      await tx.track.updateMany({
        where: {
          deletedAt: null,
          artists: { some: { id } },
        },
        data: { deletedAt: now },
      });

      return tx.artist.update({
        where: { id },
        data: { deletedAt: now },
      });
    });
  }
}
