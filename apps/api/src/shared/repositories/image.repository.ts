import { Injectable } from '@nestjs/common';
import {
  ImageCreateManyInput,
  ImageCreateInput,
  ImageGetPayload,
  ImageInclude,
  ImageOrderByWithRelationInput,
  ImageUpdateInput,
  ImageWhereInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class ImageRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  /**
   * Finds a single image by the given where conditions.
   * @param where - The where conditions to filter the images by.
   * @param include - The relations to include in the result.
   * @returns The found image or null if not found.
   */
  async findOne<I extends ImageInclude>(
    where: ImageWhereInput,
    include?: I,
  ): Promise<ImageGetPayload<{ include: I }> | null> {
    return await this.prisma.client.image.findFirst({
      where: { ...where, deletedAt: null },
      include: include ?? undefined,
    });
  }

  /**
   * Finds multiple images by the given where conditions.
   * @param where - The where conditions to filter the images by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of images to return. Defaults to 10.
   *   - `skip` (number, optional): The number of images to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (ImageOrderByWithRelationInput, optional): The order in which to sort the images. Defaults to descending by `createdAt`.
   * @param include - The relations to include in the result.
   * @returns The found images.
   */
  async findMany<I extends ImageInclude>(
    where: ImageWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: ImageOrderByWithRelationInput;
    },
    include?: I,
  ): Promise<ImageGetPayload<{ include: I }>[]> {
    return await this.prisma.client.image.findMany({
      where: { ...where, deletedAt: null },
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: include ?? undefined,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

  /**
   * Checks if an image exists by the given where conditions.
   * @param where - The where conditions to filter the images by.
   * @returns True if the image exists, false otherwise.
   */
  async exists(where: ImageWhereInput): Promise<boolean> {
    const count = await this.prisma.client.image.count({ where: { ...where, deletedAt: null } });
    return count > 0;
  }

  /**
   * Counts the number of images by the given where conditions.
   * @param where - The where conditions to filter the images by.
   * @returns The number of images.
   */
  async count(where?: ImageWhereInput): Promise<number> {
    return await this.prisma.client.image.count({
      where: { ...where, deletedAt: null },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Creates a new image.
   * @param data - The data for the image.
   * @param include - The relations to include in the result.
   * @returns The created image.
   */
  async create<I extends ImageInclude>(
    data: ImageCreateInput,
    include?: I,
  ): Promise<ImageGetPayload<{ include: I }>> {
    return await this.prisma.client.image.create({ data, include: include ?? undefined });
  }

  /**
   * Creates multiple new images.
   * @param data - The data for the images.
   * @param include - The relations to include in the result.
   * @returns The created images.
   */
  async createMany<I extends ImageInclude>(
    data: ImageCreateManyInput[],
    include?: I,
  ): Promise<ImageGetPayload<{ include: I }>[]> {
    return await this.prisma.client.image.createManyAndReturn({
      data,
      include: include ?? undefined,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Updates an image by the given ID.
   * @param id - The ID of the image to update.
   * @param data - The data to update the image with.
   * @param include - The relations to include in the result.
   * @returns The updated image.
   */
  async update<I extends ImageInclude>(
    id: string,
    data: ImageUpdateInput,
    include?: I,
  ): Promise<ImageGetPayload<{ include: I }>> {
    return await this.prisma.client.image.update({
      where: { id },
      data,
      include: include ?? undefined,
    });
  }

  /**
   * Updates multiple images by the given IDs.
   * @param updates - The updates to apply to the images.
   * @param include - The relations to include in the result.
   * @returns The updated images.
   */
  async updateMany<I extends ImageInclude>(
    updates: { id: string; data: ImageUpdateInput }[],
    include?: I,
  ): Promise<ImageGetPayload<{ include: I }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.image.update({ where: { id }, data, include: include ?? undefined }),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  /**
   * Deletes an image by the given ID.
   * @param id - The ID of the image to delete.
   * @param include - The relations to include in the result.
   * @returns The deleted image.
   */
  async delete<I extends ImageInclude>(
    id: string,
    include?: I,
  ): Promise<ImageGetPayload<{ include: I }>> {
    return await this.prisma.client.image.delete({ where: { id }, include: include ?? undefined });
  }

  /**
   * Deletes multiple images by the given where conditions.
   * @param filter - The where conditions to filter the images by.
   * @param include - The relations to include in the result.
   * @returns The deleted images.
   */
  async deleteMany<I extends ImageInclude>(
    filter: ImageWhereInput,
    include?: I,
  ): Promise<ImageGetPayload<{ include: I }>[]> {
    const imagesToDelete = await this.prisma.client.image.findMany({
      where: filter,
      include: include ?? undefined,
    });
    if (imagesToDelete.length === 0) return [];

    await this.prisma.client.image.deleteMany({
      where: { id: { in: imagesToDelete.map((image) => image.id) } },
    });

    return imagesToDelete;
  }

  // ─────────────────────────────────────────────────────────────
  // SOFT DELETE
  // ─────────────────────────────────────────────────────────────

  /**
   * Soft deletes an image by the given ID.
   * @param id - The ID of the image to soft delete.
   * @param include - The relations to include in the result.
   * @returns The deleted image.
   */
  async softDelete<I extends ImageInclude>(
    id: string,
    include?: I,
  ): Promise<ImageGetPayload<{ include: I }>> {
    return await this.prisma.client.image.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: include ?? undefined,
    });
  }

  /**
   * Soft deletes multiple images by the given where conditions.
   * @param where - The where conditions to filter the images by.
   * @param include - The relations to include in the result.
   * @returns The deleted images.
   */
  async softDeleteMany<I extends ImageInclude>(
    where: ImageWhereInput,
    include?: I,
  ): Promise<ImageGetPayload<{ include: I }>[]> {
    const imagesToDelete = await this.prisma.client.image.findMany({
      where,
      include: include ?? undefined,
    });
    if (imagesToDelete.length === 0) return [];

    const imageIds = imagesToDelete.map((image) => image.id);
    await this.prisma.client.image.updateMany({
      where: { id: { in: imageIds } },
      data: { deletedAt: new Date() },
    });

    return await this.prisma.client.image.findMany({
      where: { id: { in: imageIds } },
      include: include ?? undefined,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // RESTORE
  // ─────────────────────────────────────────────────────────────

  /**
   * Restores a soft deleted image by the given ID.
   * @param id - The ID of the image to restore.
   * @param include - The relations to include in the result.
   * @returns The restored image.
   */
  async restore<I extends ImageInclude>(
    id: string,
    include?: I,
  ): Promise<ImageGetPayload<{ include: I }>> {
    return await this.prisma.client.image.update({
      where: { id },
      data: { deletedAt: null },
      include: include ?? undefined,
    });
  }

  /**
   * Restores multiple soft deleted images by the given where conditions.
   * @param where - The where conditions to filter the images by.
   * @param include - The relations to include in the result.
   * @returns The restored images.
   */
  async restoreMany<I extends ImageInclude>(
    where: ImageWhereInput,
    include?: I,
  ): Promise<ImageGetPayload<{ include: I }>[]> {
    const imagesToRestore = await this.prisma.client.image.findMany({
      where,
      include: include ?? undefined,
    });
    if (imagesToRestore.length === 0) return [];

    const imageIds = imagesToRestore.map((image) => image.id);
    await this.prisma.client.image.updateMany({
      where: { id: { in: imageIds } },
      data: { deletedAt: null },
    });

    return await this.prisma.client.image.findMany({
      where: { id: { in: imageIds } },
      include: include ?? undefined,
    });
  }
}
