import { Injectable } from '@nestjs/common';
import {
  AlbumGetPayload,
  AlbumInclude,
  AlbumCreateInput,
  AlbumCreateManyInput,
  AlbumOrderByWithRelationInput,
  AlbumUpdateInput,
  AlbumWhereInput,
  Album,
  Prisma,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class AlbumRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds a single album by the given where conditions.
   * @param where - The where conditions to filter the albums by.
   * @returns The found album or null if not found.
   */
  async findOne(
    where: AlbumWhereInput,
  ): Promise<AlbumGetPayload<{ include: { access: true; cover: true } }> | null> {
    return this.prisma.client.album.findFirst({
      where: { ...where, deletedAt: null },
      include: { access: true, cover: true },
    });
  }

  /**
   * Finds a single album by the given where conditions with relations.
   * @param where - The where conditions to filter the albums by.
   * @param include - The relations to include in the result.
   * @returns The found album with relations or null if not found.
   */
  async findOneWithInclude<I extends AlbumInclude>(
    where: AlbumWhereInput,
    include: I,
  ): Promise<AlbumGetPayload<{ include: I }> | null> {
    return this.prisma.client.album.findFirst({
      where: { ...where, deletedAt: null },
      include: include,
    });
  }

  /**
   * Finds multiple albums by the given where conditions.
   * @param where - The where conditions to filter the albums by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of albums to return. Defaults to 10.
   *   - `skip` (number, optional): The number of albums to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (AlbumOrderByWithRelationInput or array of it, optional): The order in which to sort the albums. Defaults to descending by `createdAt`.
   * @returns The found albums.
   */
  async findMany(
    where: AlbumWhereInput,
    options?: {
      take?: number;
      skip?: number;
      orderBy?: AlbumOrderByWithRelationInput | AlbumOrderByWithRelationInput[];
    },
  ): Promise<AlbumGetPayload<{ include: { access: true; cover: true } }>[]> {
    return this.prisma.client.album.findMany({
      where: { ...where, deletedAt: null },
      take: options?.take ?? 10,
      skip: options?.skip ?? 0,
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
      include: { access: true, cover: true },
    });
  }

  /**
   * Finds multiple albums by the given where conditions with relations.
   * @param where - The where conditions to filter the albums by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of albums to return. Defaults to 10.
   *   - `skip` (number, optional): The number of albums to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (AlbumOrderByWithRelationInput or array of it, optional): The order in which to sort the albums. Defaults to descending by `createdAt`.
   * @param include - The relations to include in the result.
   * @returns The found albums with relations.
   */
  async findManyWithInclude<I extends AlbumInclude>(
    where: AlbumWhereInput,
    include: I,
    options?: {
      take?: number;
      skip?: number;
      orderBy?: AlbumOrderByWithRelationInput | AlbumOrderByWithRelationInput[];
    },
  ): Promise<AlbumGetPayload<{ include: I }>[]> {
    return this.prisma.client.album.findMany({
      where: { ...where, deletedAt: null },
      take: options?.take ?? 10,
      skip: options?.skip ?? 0,
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
      include: include,
    });
  }

  /**
   * Checks if an album exists by the given where conditions.
   * @param where - The where conditions to filter the albums by.
   * @returns True if the album exists, false otherwise.
   */
  async exists(where: AlbumWhereInput): Promise<boolean> {
    const count = await this.prisma.client.album.count({ where: { ...where, deletedAt: null } });
    return count > 0;
  }

  /**
   * Counts the number of albums by the given where conditions.
   * @param where - The where conditions to filter the albums by.
   * @returns The number of albums.
   */
  async count(where?: AlbumWhereInput): Promise<number> {
    return this.prisma.client.album.count({ where: { ...where, deletedAt: null } });
  }

  /**
   * Checks if a user has access to an album by the given ID.
   * @param where - The where conditions to filter the albums by.
   * @param userId - The ID of the user to check.
   * @returns True if the user has access, false otherwise.
   */
  async checkAccess(where: AlbumWhereInput, userId?: string): Promise<boolean> {
    const { OR: callerOr, AND: callerAnd, ...baseWhere } = where;
    const accessOr: AlbumWhereInput[] = [{ visibility: 'public' }];
    if (userId) {
      accessOr.push(
        {
          access: {
            some: { userId },
          },
        },
        {
          artists: {
            some: {
              access: {
                some: { userId },
              },
            },
          },
        },
      );
    }

    const andClauses: AlbumWhereInput[] = [{ OR: accessOr }];
    if (callerOr && callerOr.length > 0) {
      andClauses.unshift({ OR: callerOr });
    }
    if (callerAnd) {
      andClauses.push(...(Array.isArray(callerAnd) ? callerAnd : [callerAnd]));
    }

    const album = await this.prisma.client.album.findFirst({
      where: {
        ...baseWhere,
        deletedAt: null,
        AND: andClauses,
      },
      select: { id: true },
    });

    return !!album;
  }

  /**
   * Creates a new album.
   * @param data - The data for the album.
   * @returns The created album.
   */
  async create(data: AlbumCreateInput): Promise<Album> {
    return this.prisma.client.album.create({
      data,
    });
  }

  /**
   * Creates multiple new albums.
   * @param data - The data for the albums.
   * @returns The created albums.
   */
  async createMany(data: AlbumCreateManyInput[]): Promise<Album[]> {
    return this.prisma.client.album.createManyAndReturn({
      data,
    });
  }

  /**
   * Updates an album by the given ID.
   * @param id - The ID of the album to update.
   * @param data - The data to update the album with.
   * @returns The updated album.
   */
  async update(id: string, data: AlbumUpdateInput): Promise<Album> {
    return this.prisma.client.album.update({
      where: { id, deletedAt: null },
      data,
    });
  }

  /**
   * Updates multiple albums by the given IDs.
   * @param updates - The updates to apply to the albums.
   * @returns The updated albums.
   */
  async updateMany(updates: { id: string; data: AlbumUpdateInput }[]): Promise<Album[]> {
    return this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.album.update({
          where: { id, deletedAt: null },
          data,
        }),
      ),
    );
  }

  /**
   * WARNING: This method performs a permanent (hard) delete and purges the album from the database without checking or respecting the deletedAt field.
   * Deletes an album by the given ID.
   * @param id - The ID of the album to delete.
   * @returns The deleted album.
   */
  async delete(id: string): Promise<Album> {
    return this.prisma.client.album.delete({
      where: { id },
    });
  }

  /**
   * WARNING: This method performs a permanent (hard) delete and purges the albums from the database without checking or respecting the deletedAt field.
   * Deletes multiple albums by the given where conditions.
   * @param filter - The where conditions to filter the albums by.
   * @returns The deleted albums.
   */
  async deleteMany(filter: AlbumWhereInput): Promise<Album[]> {
    const combinedWhere: AlbumWhereInput = {
      ...filter,
      deletedAt: filter.deletedAt ?? null,
    };
    return this.prisma.mainClient.$transaction(async (tx: Prisma.TransactionClient) => {
      const toDelete = await tx.album.findMany({
        where: combinedWhere,
      });

      if (toDelete.length === 0) return [];

      await tx.album.deleteMany({
        where: { id: { in: toDelete.map((a) => a.id) } },
      });

      return toDelete;
    });
  }

  /**
   * Soft deletes an album by the given ID.
   * @param id - The ID of the album to soft delete.
   * @param options - Set `{ cascade: true }` to soft delete related tracks and library links.
   * @returns The deleted album.
   */
  async softDelete(id: string, { cascade = false }: { cascade?: boolean } = {}): Promise<Album> {
    if (!cascade) {
      return this.prisma.client.album.update({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    }

    const deletedAt = new Date();
    return this.prisma.mainClient.$transaction(async (tx) => {
      const tracks = await tx.track.findMany({
        where: { albumId: id, deletedAt: null },
        select: { id: true },
      });
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

      await tx.libraryAlbum.updateMany({
        where: { albumId: id, deletedAt: null },
        data: { deletedAt },
      });

      return tx.album.update({
        where: { id, deletedAt: null },
        data: { deletedAt },
      });
    });
  }

  /**
   * Soft deletes multiple albums by the given where conditions.
   * @param where - The where conditions to filter the albums by.
   * @returns The deleted albums.
   */
  async softDeleteMany(
    where: AlbumWhereInput,
    { cascade = false }: { cascade?: boolean } = {},
  ): Promise<Album[]> {
    const deletedAt = new Date();
    return this.prisma.mainClient.$transaction(async (tx) => {
      const updatedAlbums = await tx.album.updateManyAndReturn({
        where: { ...where, deletedAt: null },
        data: { deletedAt },
      });

      if (cascade && updatedAlbums.length > 0) {
        const albumIds = updatedAlbums.map((a) => a.id);
        const tracks = await tx.track.findMany({
          where: { albumId: { in: albumIds }, deletedAt: null },
          select: { id: true },
        });
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

        await tx.libraryAlbum.updateMany({
          where: { albumId: { in: albumIds }, deletedAt: null },
          data: { deletedAt },
        });
      }

      return updatedAlbums;
    });
  }

  /**
   * Restores a soft deleted album by the given ID.
   * @param id - The ID of the album to restore.
   * @returns The restored album.
   */
  async restore(id: string): Promise<Album> {
    return this.prisma.client.album.update({
      where: { id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
  }

  /**
   * Restores multiple soft deleted albums by the given where conditions.
   * @param where - The where conditions to filter the albums by.
   * @returns The restored albums.
   */
  async restoreMany(where: AlbumWhereInput): Promise<Album[]> {
    return this.prisma.client.album.updateManyAndReturn({
      where: { ...where, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
  }
}
