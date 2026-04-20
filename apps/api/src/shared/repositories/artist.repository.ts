import { Injectable } from '@nestjs/common';
import {
  ArtistGetPayload,
  ArtistInclude,
  ArtistCreateInput,
  ArtistCreateManyInput,
  ArtistOrderByWithRelationInput,
  ArtistUpdateInput,
  ArtistWhereInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class ArtistRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  /**
   * Finds a single artist by the given where conditions.
   * @param where - The where conditions to filter the artists by.
   * @param include - The relations to include in the result.
   * @returns The found artist or null if not found.
   */
  async findOne<I extends ArtistInclude>(
    where: ArtistWhereInput,
    include?: I,
  ): Promise<ArtistGetPayload<{ include: I }> | null> {
    return await this.prisma.client.artist.findFirst({
      where: { ...where, deletedAt: null },
      include: include ?? { avatar: true, banner: true },
    });
  }

  /**
   * Finds multiple artists by the given where conditions.
   * @param where - The where conditions to filter the artists by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of artists to return. Defaults to 10.
   *   - `skip` (number, optional): The number of artists to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (ArtistOrderByWithRelationInput, optional): The order in which to sort the artists. Defaults to descending by `createdAt`.
   * @param include - The relations to include in the result.
   * @returns The found artists.
   */
  async findMany<I extends ArtistInclude>(
    where: ArtistWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: ArtistOrderByWithRelationInput;
    },
    include?: I,
  ): Promise<ArtistGetPayload<{ include: I }>[]> {
    return await this.prisma.client.artist.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: include ?? { avatar: true, banner: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

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
    return await this.prisma.client.artist.count({ where: { ...where, deletedAt: null } });
  }

  /**
   * Checks if a user has access to an artist by the given ID.
   * @param where - The where conditions to filter the artists by.
   * @param userId - The ID of the user to check access for.
   * @returns True if the user has access, false otherwise.
   */
  async checkAccess(where: ArtistWhereInput, userId?: string): Promise<boolean> {
    const guestId = 'GUEST';
    const activeUserId = userId ?? guestId;

    const artist = await this.prisma.client.artist.findFirst({
      where: {
        ...where,
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

  /**
   * Creates a new artist.
   * @param data - The data for the artist.
   * @param include - The relations to include in the result.
   * @returns The created artist.
   */
  async create<I extends ArtistInclude>(
    data: ArtistCreateInput,
    include?: I,
  ): Promise<ArtistGetPayload<{ include: I }>> {
    return await this.prisma.client.artist.create({
      data,
      include: include ?? { avatar: true, banner: true },
    });
  }

  /**
   * Creates multiple new artists.
   * @param data - The data for the artists.
   * @param include - The relations to include in the result.
   * @returns The created artists.
   */
  async createMany<I extends ArtistInclude>(
    data: ArtistCreateManyInput[],
    include?: I,
  ): Promise<ArtistGetPayload<{ include: I }>[]> {
    return await this.prisma.client.artist.createManyAndReturn({
      data,
      include: include ?? { avatar: true, banner: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Updates an artist by the given ID.
   * @param id - The ID of the artist to update.
   * @param data - The data to update the artist with.
   * @param include - The relations to include in the result.
   * @returns The updated artist.
   */
  async update<I extends ArtistInclude>(
    id: string,
    data: ArtistUpdateInput,
    include?: I,
  ): Promise<ArtistGetPayload<{ include: I }>> {
    return await this.prisma.client.artist.update({
      where: { id },
      data,
      include: include ?? { avatar: true, banner: true },
    });
  }

  /**
   * Updates multiple artists by the given IDs.
   * @param updates - The updates to apply to the artists.
   * @param include - The relations to include in the result.
   * @returns The updated artists.
   */
  async updateMany<I extends ArtistInclude>(
    updates: { id: string; data: ArtistUpdateInput }[],
    include?: I,
  ): Promise<ArtistGetPayload<{ include: I }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.artist.update({
          where: { id },
          data,
          include: include ?? { avatar: true, banner: true },
        }),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  /**
   * Deletes an artist by the given ID.
   * @param id - The ID of the artist to delete.
   * @param include - The relations to include in the result.
   * @returns The deleted artist.
   */
  async delete<I extends ArtistInclude>(
    id: string,
    include?: I,
  ): Promise<ArtistGetPayload<{ include: I }>> {
    return await this.prisma.client.artist.delete({
      where: { id },
      include: include ?? { avatar: true, banner: true },
    });
  }

  /**
   * Deletes multiple artists by the given where conditions.
   * @param filter - The where conditions to filter the artists by.
   * @param include - The relations to include in the result.
   * @returns The deleted artists.
   */
  async deleteMany<I extends ArtistInclude>(
    filter: ArtistWhereInput,
    include?: I,
  ): Promise<ArtistGetPayload<{ include: I }>[]> {
    const artistsToDelete = await this.prisma.client.artist.findMany({
      where: filter,
      include: include ?? { avatar: true, banner: true },
    });
    if (artistsToDelete.length === 0) return [];

    await this.prisma.client.artist.deleteMany({
      where: { id: { in: artistsToDelete.map((artist) => artist.id) } },
    });

    return artistsToDelete;
  }

  // ─────────────────────────────────────────────────────────────
  // SOFT DELETE
  // ─────────────────────────────────────────────────────────────

  /**
   * Soft deletes an artist by the given ID.
   * @param id - The ID of the artist to soft delete.
   * @param include - The relations to include in the result.
   * @returns The deleted artist.
   */
  async softDelete<I extends ArtistInclude>(
    id: string,
    include?: I,
  ): Promise<ArtistGetPayload<{ include: I }>> {
    return await this.prisma.client.artist.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: include ?? { avatar: true, banner: true },
    });
  }

  /**
   * Soft deletes multiple artists by the given where conditions.
   * @param where - The where conditions to filter the artists by.
   * @param include - The relations to include in the result.
   * @returns The deleted artists.
   */
  async softDeleteMany<I extends ArtistInclude>(
    where: ArtistWhereInput,
    include?: I,
  ): Promise<ArtistGetPayload<{ include: I }>[]> {
    const artistsToDelete = await this.prisma.client.artist.findMany({
      where,
      include: include ?? { avatar: true, banner: true },
    });
    if (artistsToDelete.length === 0) return [];

    const artistIds = artistsToDelete.map((artist) => artist.id);
    await this.prisma.client.artist.updateMany({
      where: { id: { in: artistIds } },
      data: { deletedAt: new Date() },
    });

    return await this.prisma.client.artist.findMany({
      where: { id: { in: artistIds } },
      include: include ?? { avatar: true, banner: true },
    });
  }

  /**
   * Soft deletes an artist by the given ID and deletes its albums and tracks.
   * @param id - The ID of the artist to soft delete.
   * @returns The deleted artist.
   */
  async softDeleteCascade(id: string): Promise<ArtistGetPayload<{ include: undefined }>> {
    // 1. Get albums to delete tracks first
    const albums = await this.prisma.client.album.findMany({
      where: {
        artists: { some: { id } },
        deletedAt: null,
      },
      select: { id: true },
    });

    const albumIds = albums.map((a) => a.id);

    // 2. Transaction: Mark artist, albums, and tracks as deleted
    const [deletedArtist] = await this.prisma.mainClient.$transaction([
      this.prisma.client.artist.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
      this.prisma.client.album.updateMany({
        where: { id: { in: albumIds } },
        data: { deletedAt: new Date() },
      }),
      this.prisma.client.track.updateMany({
        where: { albumId: { in: albumIds } },
        data: { deletedAt: new Date() },
      }),
    ]);

    return deletedArtist;
  }

  // ─────────────────────────────────────────────────────────────
  // RESTORE
  // ─────────────────────────────────────────────────────────────

  /**
   * Restores a soft deleted artist by the given ID.
   * @param id - The ID of the artist to restore.
   * @param include - The relations to include in the result.
   * @returns The restored artist.
   */
  async restore<I extends ArtistInclude>(
    id: string,
    include?: I,
  ): Promise<ArtistGetPayload<{ include: I }>> {
    return await this.prisma.client.artist.update({
      where: { id },
      data: { deletedAt: null },
      include: include ?? { avatar: true, banner: true },
    });
  }

  /**
   * Restores multiple soft deleted artists by the given where conditions.
   * @param where - The where conditions to filter the artists by.
   * @param include - The relations to include in the result.
   * @returns The restored artists.
   */
  async restoreMany<I extends ArtistInclude>(
    where: ArtistWhereInput,
    include?: I,
  ): Promise<ArtistGetPayload<{ include: I }>[]> {
    const artistsToRestore = await this.prisma.client.artist.findMany({
      where,
      include: include ?? { avatar: true, banner: true },
    });
    if (artistsToRestore.length === 0) return [];

    const artistIds = artistsToRestore.map((artist) => artist.id);
    await this.prisma.client.artist.updateMany({
      where: { id: { in: artistIds } },
      data: { deletedAt: null },
    });

    return await this.prisma.client.artist.findMany({
      where: { id: { in: artistIds } },
      include: include ?? { avatar: true, banner: true },
    });
  }
}
