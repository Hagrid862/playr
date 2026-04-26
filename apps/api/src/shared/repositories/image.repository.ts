import { Injectable } from '@nestjs/common';
import {
  Image,
  ImageCreateInput,
  ImageCreateManyInput,
  ImageGetPayload,
  ImageInclude,
  ImageOrderByWithRelationInput,
  ImageUpdateInput,
  ImageWhereInput,
  Prisma,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class ImageRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds a single image by the given where conditions.
   * @param where - The where conditions to filter the images by.
   * @returns The found image or null if not found.
   */
  async findOne(
    where: ImageWhereInput,
  ): Promise<ImageGetPayload<{ include: { variants: true } }> | null> {
    return this.prisma.client.image.findFirst({
      where: { ...where, deletedAt: null },
      include: { variants: true },
    });
  }

  /**
   * Finds a single image by the given where conditions with relations.
   * @param where - The where conditions to filter the images by.
   * @param include - The relations to include in the result.
   * @returns The found image with relations or null if not found.
   */
  async findOneWithInclude<I extends ImageInclude>(
    where: ImageWhereInput,
    include: I,
  ): Promise<ImageGetPayload<{ include: I }> | null> {
    return this.prisma.client.image.findFirst({
      where: { ...where, deletedAt: null },
      include: include,
    });
  }

  /**
   * Finds multiple images by the given where conditions.
   * @param where - The where conditions to filter the images by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of images to return. Defaults to 10.
   *   - `skip` (number, optional): The number of images to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (ImageOrderByWithRelationInput or array of it, optional): The order in which to sort the images. Defaults to descending by `createdAt`.
   * @returns The found images.
   */
  async findMany(
    where: ImageWhereInput,
    options?: {
      take?: number;
      skip?: number;
      orderBy?: ImageOrderByWithRelationInput | ImageOrderByWithRelationInput[];
    },
  ): Promise<ImageGetPayload<{ include: { variants: true } }>[]> {
    return this.prisma.client.image.findMany({
      where: { ...where, deletedAt: null },
      take: options?.take ?? 10,
      skip: options?.skip ?? 0,
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
      include: { variants: true },
    });
  }

  /**
   * Finds multiple images by the given where conditions with relations.
   * @param where - The where conditions to filter the images by.
   * @param options - The options for the query:
   *   - `take` (number, optional): The maximum number of images to return. Defaults to 10.
   *   - `skip` (number, optional): The number of images to skip before starting to collect the result set. Defaults to 0.
   *   - `orderBy` (ImageOrderByWithRelationInput or array of it, optional): The order in which to sort the images. Defaults to descending by `createdAt`.
   * @param include - The relations to include in the result.
   * @returns The found images with relations.
   */
  async findManyWithInclude<I extends ImageInclude>(
    where: ImageWhereInput,
    include: I,
    options?: {
      take?: number;
      skip?: number;
      orderBy?: ImageOrderByWithRelationInput | ImageOrderByWithRelationInput[];
    },
  ): Promise<ImageGetPayload<{ include: I }>[]> {
    return this.prisma.client.image.findMany({
      where: { ...where, deletedAt: null },
      take: options?.take ?? 10,
      skip: options?.skip ?? 0,
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
      include: include,
    });
  }

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
    return this.prisma.client.image.count({
      where: { ...where, deletedAt: null },
    });
  }

  /**
   * Creates a new image.
   * @param data - The data for the image.
   * @returns The created image.
   */
  async create(data: ImageCreateInput): Promise<Image> {
    return this.prisma.client.image.create({
      data,
    });
  }

  /**
   * Creates multiple new images.
   * @param data - The data for the images.
   * @returns The created images.
   */
  async createMany(data: ImageCreateManyInput[]): Promise<Image[]> {
    return this.prisma.client.image.createManyAndReturn({
      data,
    });
  }

  /**
   * Updates an image by the given ID.
   * @param id - The ID of the image to update.
   * @param data - The data to update the image with.
   * @returns The updated image.
   */
  async update(id: string, data: ImageUpdateInput): Promise<Image> {
    return this.prisma.client.image.update({
      where: { id, deletedAt: null },
      data,
    });
  }

  /**
   * Updates multiple images by the given IDs.
   * @param updates - The updates to apply to the images.
   * @returns The updated images.
   */
  async updateMany(updates: { id: string; data: ImageUpdateInput }[]): Promise<Image[]> {
    return this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.image.update({
          where: { id, deletedAt: null },
          data,
        }),
      ),
    );
  }

  /**
   * WARNING: This method performs a permanent (hard) delete and purges the image from the database without checking or respecting the deletedAt field.
   * Use softDelete(id) if you want to mark the image as deleted instead of removing it permanently.
   *
   * Deletes an image by the given ID.
   * @param id - The ID of the image to delete.
   * @returns The deleted image.
   */
  async delete(id: string): Promise<Image> {
    return this.prisma.client.image.delete({
      where: { id },
    });
  }

  /**
   * WARNING: This method performs a permanent (hard) delete and purges the images from the database.
   * By default, it only targets active rows (deletedAt: null) to prevent accidental double-deletion or purging already soft-deleted data.
   * Pass an explicit `deletedAt` filter if you intend to purge soft-deleted rows.
   *
   * @param filter - The where conditions to filter the images by.
   * @returns The deleted images.
   */
  async deleteMany(filter: ImageWhereInput): Promise<Image[]> {
    const combinedWhere: ImageWhereInput = {
      ...filter,
      deletedAt: filter.deletedAt ?? null,
    };
    return this.prisma.mainClient.$transaction(async (tx: Prisma.TransactionClient) => {
      const toDelete = await tx.image.findMany({ where: combinedWhere });

      if (toDelete.length === 0) return [];

      await tx.image.deleteMany({
        where: { id: { in: toDelete.map((a) => a.id) } },
      });

      return toDelete;
    });
  }

  /**
   * Soft deletes an image by the given ID.
   * @param id - The ID of the image to soft delete.
   * @returns The deleted image.
   */
  async softDelete(id: string): Promise<Image> {
    return this.prisma.client.image.update({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Soft deletes multiple images by the given where conditions.
   * @param where - The where conditions to filter the images by.
   * @returns The deleted images.
   */
  async softDeleteMany(where: ImageWhereInput): Promise<Image[]> {
    const deletedAt = new Date();
    return this.prisma.mainClient.$transaction((tx) =>
      tx.image.updateManyAndReturn({
        where: { ...where, deletedAt: null },
        data: { deletedAt },
      }),
    );
  }

  /**
   * Restores a soft deleted image by the given ID.
   * @param id - The ID of the image to restore.
   * @returns The restored image.
   */
  async restore(id: string): Promise<Image> {
    return this.prisma.client.image.update({
      where: { id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
  }

  /**
   * Restores multiple soft deleted images by the given where conditions.
   * @param where - The where conditions to filter the images by.
   * @returns The restored images.
   */
  async restoreMany(where: ImageWhereInput): Promise<Image[]> {
    return this.prisma.mainClient.$transaction((tx) =>
      tx.image.updateManyAndReturn({
        where: { ...where, deletedAt: { not: null } },
        data: { deletedAt: null },
      }),
    );
  }
}
