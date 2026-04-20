import { Injectable } from '@nestjs/common';
import {
  AlbumGetPayload,
  AlbumInclude,
  AlbumCreateInput,
  AlbumCreateManyInput,
  AlbumOrderByWithRelationInput,
  AlbumUpdateInput,
  AlbumWhereInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class AlbumRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  /**
   * Finds a single album by the given where conditions.
   * @param where - The where conditions to filter the albums by.
   * @param include - The relations to include in the result.
   * @returns The found album or null if not found.
   */
  async findOne<I extends AlbumInclude>(
    where: AlbumWhereInput,
    include?: I,
  ): Promise<AlbumGetPayload<{ include: I }> | null> {
    return await this.prisma.client.album.findFirst({
      where: { ...where, deletedAt: null },
      include: include ?? { access: true, cover: true },
    });
  }

  /**
   * Finds multiple albums by the given where conditions.
   *
   * @param where - The where conditions to filter the albums by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of albums to return. Defaults to 10.
   *   - `skip` (number, optional): The number of albums to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (AlbumOrderByWithRelationInput, optional): The order in which to sort the albums. Defaults to descending by `createdAt`.
   * @param include - The relations to include in the result.
   * @returns The found albums.
   */
  async findMany<I extends AlbumInclude>(
    where: AlbumWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: AlbumOrderByWithRelationInput;
    },
    include?: I,
  ): Promise<AlbumGetPayload<{ include: I }>[]> {
    return await this.prisma.client.album.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: include ?? { access: true, cover: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

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
    return await this.prisma.client.album.count({ where: { ...where, deletedAt: null } });
  }

  /**
   * Checks if a user has access to an album by the given ID.
   * @param where - The where conditions to filter the albums by.
   * @param userId - The ID of the user to check.
   * @returns True if the user has access, false otherwise.
   */
  async checkAccess(where: AlbumWhereInput, userId?: string): Promise<boolean> {
    const guestId = 'GUEST';
    const activeUserId = userId ?? guestId;

    const album = await this.prisma.client.album.findFirst({
      where: {
        ...where,
        deletedAt: null,
        OR: [
          // 1. Is it Public?
          { visibility: 'public' },
          // 2. Direct Album Access? (viewer, editor, or owner)
          {
            access: {
              some: { userId: activeUserId },
            },
          },
          // 3. Inherited Artist Access? (If you have access to the Artist, you have access to their albums)
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

  /**
   * Creates a new album.
   * @param data - The data for the album.
   * @param include - The relations to include in the result.
   * @returns The created album.
   */
  async create<I extends AlbumInclude>(
    data: AlbumCreateInput,
    include?: I,
  ): Promise<AlbumGetPayload<{ include: I }>> {
    return await this.prisma.client.album.create({
      data,
      include: include ?? { access: true, cover: true },
    });
  }

  /**
   * Creates multiple new albums.
   * @param data - The data for the albums.
   * @param include - The relations to include in the result.
   * @returns The created albums.
   */
  async createMany<I extends AlbumInclude>(
    data: AlbumCreateManyInput[],
    include?: I,
  ): Promise<AlbumGetPayload<{ include: I }>[]> {
    return await this.prisma.client.album.createManyAndReturn({
      data,
      include: include ?? { access: true, cover: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Updates an album by the given ID.
   * @param id - The ID of the album to update.
   * @param data - The data to update the album with.
   * @param include - The relations to include in the result.
   * @returns The updated album.
   */
  async update<I extends AlbumInclude>(
    id: string,
    data: AlbumUpdateInput,
    include?: I,
  ): Promise<AlbumGetPayload<{ include: I }>> {
    return await this.prisma.client.album.update({
      where: { id },
      data,
      include: include ?? { access: true, cover: true },
    });
  }

  /**
   * Updates multiple albums by the given IDs.
   * @param updates - The updates to apply to the albums.
   * @param include - The relations to include in the result.
   * @returns The updated albums.
   */
  async updateMany<I extends AlbumInclude>(
    updates: { id: string; data: AlbumUpdateInput }[],
    include?: I,
  ): Promise<AlbumGetPayload<{ include: I }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.album.update({
          where: { id },
          data,
          include: include ?? { access: true, cover: true },
        }),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  /**
   * Deletes an album by the given ID.
   * @param id - The ID of the album to delete.
   * @param include - The relations to include in the result.
   * @returns The deleted album.
   */
  async delete<I extends AlbumInclude>(
    id: string,
    include?: I,
  ): Promise<AlbumGetPayload<{ include: I }>> {
    return await this.prisma.client.album.delete({
      where: { id },
      include: include ?? { access: true, cover: true },
    });
  }

  /**
   * Deletes multiple albums by the given where conditions.
   * @param filter - The where conditions to filter the albums by.
   * @param include - The relations to include in the result.
   * @returns The deleted albums.
   */
  async deleteMany<I extends AlbumInclude>(
    filter: AlbumWhereInput,
    include?: I,
  ): Promise<AlbumGetPayload<{ include: I }>[]> {
    const albumsToDelete = await this.prisma.client.album.findMany({
      where: filter,
      include: include ?? { access: true, cover: true },
    });
    if (albumsToDelete.length === 0) return [];

    await this.prisma.client.album.deleteMany({
      where: { id: { in: albumsToDelete.map((album) => album.id) } },
    });

    return albumsToDelete;
  }

  // ─────────────────────────────────────────────────────────────
  // SOFT DELETE
  // ─────────────────────────────────────────────────────────────

  /**
   * Soft deletes an album by the given ID.
   * @param id - The ID of the album to soft delete.
   * @param include - The relations to include in the result.
   * @param options - The options for the soft delete.
   *   - `tracks` (boolean, optional): Whether to delete the tracks associated with the album. Defaults to false.
   * @returns The deleted album.
   */
  async softDelete<I extends AlbumInclude>(
    id: string,
    options: {
      tracks?: boolean;
    },
    include?: I,
  ): Promise<AlbumGetPayload<{ include: I }>> {
    const data: AlbumUpdateInput = { deletedAt: new Date() };
    if (options.tracks) {
      data.tracks = { updateMany: { data: { deletedAt: new Date() }, where: { albumId: id } } };
    }
    return await this.prisma.client.album.update({
      where: { id },
      data,
      include: include ?? { access: true, cover: true },
    });
  }

  /**
   * Soft deletes multiple albums by the given where conditions.
   * @param where - The where conditions to filter the albums by.
   * @param options - The options for the soft delete.
   *   - `tracks` (boolean, optional): Whether to delete the tracks associated with the albums. Defaults to false.
   * @param include - The relations to include in the result.
   * @returns The deleted albums.
   */
  async softDeleteMany<I extends AlbumInclude>(
    where: AlbumWhereInput,
    options: {
      tracks?: boolean;
    },
    include?: I,
  ): Promise<AlbumGetPayload<{ include: I }>[]> {
    const deletedAt = new Date();
    return await this.prisma.mainClient.$transaction(async (tx) => {
      const albums = await tx.album.findMany({
        where,
        include: include ?? { access: true, cover: true },
      });
      if (albums.length === 0) return [];

      const albumIds = albums.map((album) => album.id);
      await tx.album.updateMany({
        where: { id: { in: albumIds } },
        data: { deletedAt },
      });

      if (options.tracks) {
        await tx.track.updateMany({
          where: { albumId: { in: albumIds } },
          data: { deletedAt },
        });
      }

      return await tx.album.findMany({
        where: { id: { in: albumIds } },
        include: include ?? { access: true, cover: true },
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // RESTORE
  // ─────────────────────────────────────────────────────────────

  /**
   * Restores a soft deleted album by the given ID.
   * @param id - The ID of the album to restore.
   * @param include - The relations to include in the result.
   * @returns The restored album.
   */
  async restore<I extends AlbumInclude>(
    id: string,
    include?: I,
  ): Promise<AlbumGetPayload<{ include: I }>> {
    return await this.prisma.client.album.update({
      where: { id },
      data: { deletedAt: null },
      include: include ?? { access: true, cover: true },
    });
  }

  /**
   * Restores multiple soft deleted albums by the given where conditions.
   * @param where - The where conditions to filter the albums by.
   * @param include - The relations to include in the result.
   * @returns The restored albums.
   */
  async restoreMany<I extends AlbumInclude>(
    where: AlbumWhereInput,
    include?: I,
  ): Promise<AlbumGetPayload<{ include: I }>[]> {
    const albumsToRestore = await this.prisma.client.album.findMany({
      where,
      include: include ?? { access: true, cover: true },
    });
    if (albumsToRestore.length === 0) return [];

    const albumIds = albumsToRestore.map((album) => album.id);
    await this.prisma.client.album.updateMany({
      where: { id: { in: albumIds } },
      data: { deletedAt: null },
    });

    return await this.prisma.client.album.findMany({
      where: { id: { in: albumIds } },
      include: include ?? { access: true, cover: true },
    });
  }
}
