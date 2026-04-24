import { Injectable } from '@nestjs/common';
import {
  ArtistGetPayload,
  ArtistInclude,
  ArtistCreateInput,
  ArtistCreateManyInput,
  ArtistOrderByWithRelationInput,
  ArtistUpdateInput,
  ArtistWhereInput,
  Artist,
  Prisma,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class ArtistRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds a single artist by the given where conditions.
   * @param where - The where conditions to filter the artists by.
   * @returns The found artist or null if not found.
   */
  async findOne(
    where: ArtistWhereInput,
  ): Promise<ArtistGetPayload<{ include: { avatar: true; banner: true } }> | null> {
    return this.prisma.client.artist.findFirst({
      where: { ...where, deletedAt: null },
      include: { avatar: true, banner: true },
    });
  }

  /**
   * Finds a single artist by the given where conditions with relations.
   * @param where - The where conditions to filter the artists by.
   * @param include - The relations to include in the result.
   * @returns The found artist with relations or null if not found.
   */
  async findOneWithInclude<I extends ArtistInclude>(
    where: ArtistWhereInput,
    include: I,
  ): Promise<ArtistGetPayload<{ include: I }> | null> {
    return this.prisma.client.artist.findFirst({
      where: { ...where, deletedAt: null },
      include: include,
    });
  }

  /**
   * Finds multiple artists by the given where conditions.
   * @param where - The where conditions to filter the artists by.
   * @param options - Optional query options (`take`, `skip`, `orderBy`).
   * @returns The found artists.
   */
  async findMany(
    where: ArtistWhereInput,
    options?: {
      take?: number;
      skip?: number;
      orderBy?: ArtistOrderByWithRelationInput | ArtistOrderByWithRelationInput[];
    },
  ): Promise<ArtistGetPayload<{ include: { avatar: true; banner: true } }>[]> {
    return this.prisma.client.artist.findMany({
      where: { ...where, deletedAt: null },
      take: options?.take ?? 10,
      skip: options?.skip ?? 0,
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
      include: { avatar: true, banner: true },
    });
  }

  /**
   * Finds multiple artists by the given where conditions with relations.
   * @param where - The where conditions to filter the artists by.
   * @param options - Optional query options (`take`, `skip`, `orderBy`).
   * @param include - The relations to include in the result.
   * @returns The found artists with relations.
   */
  async findManyWithInclude<I extends ArtistInclude>(
    where: ArtistWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: ArtistOrderByWithRelationInput | ArtistOrderByWithRelationInput[];
    },
    include: I,
  ): Promise<ArtistGetPayload<{ include: I }>[]> {
    return this.prisma.client.artist.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: include,
    });
  }

  /**
   * Checks if an artist exists by the given where conditions.
   * @param where - The where conditions to filter the artists by.
   * @returns True if the artist exists, false otherwise.
   */
  async exists(where: ArtistWhereInput): Promise<boolean> {
    const count = await this.prisma.client.artist.count({ where: { ...where, deletedAt: null } });
    return count > 0;
  }

  /**
   * Counts the number of artists by the given where conditions.
   * @param where - The where conditions to filter the artists by.
   * @returns The number of artists.
   */
  async count(where?: ArtistWhereInput): Promise<number> {
    return this.prisma.client.artist.count({ where: { ...where, deletedAt: null } });
  }

  /**
   * Checks if a user has access to an artist by the given ID.
   * @param where - The where conditions to filter the artists by.
   * @param userId - The ID of the user to check.
   * @returns True if the user has access, false otherwise.
   */
  async checkAccess(where: ArtistWhereInput, userId?: string): Promise<boolean> {
    const { OR: callerOr, AND: callerAnd, ...baseWhere } = where;
    const accessOr: ArtistWhereInput[] = [{ visibility: 'public' }];
    if (userId) {
      accessOr.push({
        access: {
          some: { userId },
        },
      });
    }

    const andClauses: ArtistWhereInput[] = [{ OR: accessOr }];
    if (callerOr && callerOr.length > 0) {
      andClauses.unshift({ OR: callerOr });
    }
    if (callerAnd) {
      andClauses.push(...(Array.isArray(callerAnd) ? callerAnd : [callerAnd]));
    }

    const artist = await this.prisma.client.artist.findFirst({
      where: {
        ...baseWhere,
        deletedAt: null,
        AND: andClauses,
      },
      select: { id: true },
    });

    return !!artist;
  }

  /**
   * Creates a new artist.
   * @param data - The data for the artist.
   * @returns The created artist.
   */
  async create(data: ArtistCreateInput): Promise<Artist> {
    return this.prisma.client.artist.create({
      data,
    });
  }

  /**
   * Creates multiple new artists.
   * @param data - The data for the artists.
   * @returns The created artists.
   */
  async createMany(data: ArtistCreateManyInput[]): Promise<Artist[]> {
    return this.prisma.client.artist.createManyAndReturn({
      data,
    });
  }

  /**
   * Updates an artist by the given ID.
   * @param id - The ID of the artist to update.
   * @param data - The data to update the artist with.
   * @returns The updated artist.
   */
  async update(id: string, data: ArtistUpdateInput): Promise<Artist> {
    return this.prisma.client.artist.update({
      where: { id, deletedAt: null },
      data,
    });
  }

  /**
   * Updates multiple artists by the given IDs.
   * @param updates - The updates to apply to the artists.
   * @returns The updated artists.
   */
  async updateMany(updates: { id: string; data: ArtistUpdateInput }[]): Promise<Artist[]> {
    return this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.artist.update({
          where: { id, deletedAt: null },
          data,
        }),
      ),
    );
  }

  /**
   * WARNING: This method performs a permanent (hard) delete and purges the artist from the database without checking or respecting the deletedAt field.
   * Deletes an artist by the given ID.
   * @param id - The ID of the artist to delete.
   * @returns The deleted artist.
   */
  async delete(id: string): Promise<Artist> {
    return this.prisma.client.artist.delete({
      where: { id },
    });
  }

  /**
   * WARNING: This method performs a permanent (hard) delete and purges the artists from the database without checking or respecting the deletedAt field.
   * Deletes multiple artists by the given where conditions.
   * @param filter - The where conditions to filter the artists by.
   * @returns The deleted artists.
   */

  async deleteMany(filter: ArtistWhereInput): Promise<Artist[]> {
    return this.prisma.mainClient.$transaction(async (tx: Prisma.TransactionClient) => {
      const toDelete = await tx.artist.findMany({
        where: filter,
      });

      if (toDelete.length === 0) return [];

      await tx.artist.deleteMany({
        where: { id: { in: toDelete.map((a) => a.id) } },
      });

      return toDelete;
    });
  }

  /**
   * Soft deletes an artist by the given ID.
   * @param id - The ID of the artist to soft delete.
   * @param cascade - Option to delete related albums, tracks and library links
   * @returns The deleted artist.
   */
  async softDelete(id: string, cascade: boolean = false): Promise<Artist> {
    if (!cascade) {
      return this.prisma.client.artist.update({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    }

    const deletedAt = new Date();

    return this.prisma.mainClient.$transaction(async (tx) => {
      // 1. Soft delete albums and tracks via albums
      const albums = await tx.album.findMany({
        where: {
          deletedAt: null,
          artists: { some: { id, deletedAt: null } },
        },
        select: { id: true },
      });
      const albumIds = albums.map((a) => a.id);

      const tracks =
        albumIds.length > 0
          ? await tx.track.findMany({
              where: { albumId: { in: albumIds }, deletedAt: null },
              select: { id: true },
            })
          : [];
      const trackIds = tracks.map((t) => t.id);

      if (trackIds.length > 0) {
        await tx.libraryTrack.updateMany({
          where: { trackId: { in: trackIds }, deletedAt: null },
          data: { deletedAt },
        });
        await tx.track.updateMany({
          where: { id: { in: trackIds }, deletedAt: null },
          data: { deletedAt },
        });
      }

      if (albumIds.length > 0) {
        await tx.libraryAlbum.updateMany({
          where: { albumId: { in: albumIds }, deletedAt: null },
          data: { deletedAt },
        });
        await tx.album.updateMany({
          where: { id: { in: albumIds }, deletedAt: null },
          data: { deletedAt },
        });
      }

      // 2. Soft delete tracks directly linked to artist and their libraries
      // (i.e. where the track's artists relation contains the artist, but not already soft-deleted above)
      const directTracks =
        (await tx.track.findMany({
          where: {
            deletedAt: null,
            artists: { some: { id, deletedAt: null } },
          },
          select: { id: true },
        })) ?? [];
      // Exclude tracks that were already soft-deleted as album tracks above
      const directTrackIds = directTracks
        .map((track) => track.id)
        .filter((trackId) => !trackIds.includes(trackId));

      if (directTrackIds.length > 0) {
        await tx.libraryTrack.updateMany({
          where: { trackId: { in: directTrackIds }, deletedAt: null },
          data: { deletedAt },
        });
        await tx.track.updateMany({
          where: { id: { in: directTrackIds }, deletedAt: null },
          data: { deletedAt },
        });
      }

      await tx.libraryArtist.updateMany({
        where: { artistId: id, deletedAt: null },
        data: { deletedAt },
      });

      return tx.artist.update({
        where: { id, deletedAt: null },
        data: { deletedAt },
      });
    });
  }

  /**
   * Soft deletes multiple artists by the given where conditions.
   * @param where - The where conditions to filter the artists by.
   * @returns The deleted artists.
   */
  async softDeleteMany(where: ArtistWhereInput): Promise<Artist[]> {
    return this.prisma.client.artist.updateManyAndReturn({
      where: { ...where, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Restores a soft deleted artist by the given ID.
   * @param id - The ID of the artist to restore.
   * @returns The restored artist.
   */
  async restore(id: string): Promise<Artist> {
    return this.prisma.client.artist.update({
      where: { id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
  }

  /**
   * Restores multiple soft deleted artists by the given where conditions.
   * @param where - The where conditions to filter the artists by.
   * @returns The restored artists.
   */
  async restoreMany(where: ArtistWhereInput): Promise<Artist[]> {
    return this.prisma.client.artist.updateManyAndReturn({
      where: { ...where, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
  }
}
