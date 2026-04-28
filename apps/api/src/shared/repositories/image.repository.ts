import { Injectable } from '@nestjs/common';
import {
  Image,
  ImageCreateInput,
  ImageGetPayload,
  ImageUpdateInput,
  ImageWhereInput,
  Prisma,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class ImageRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<Image | null>;
  async getById<T extends Prisma.ImageInclude>(
    id: string,
    options: { include: T },
  ): Promise<ImageGetPayload<{ include: T }> | null>;
  /**
   * Gets a single record by its ID.
   * @param id Record identifier.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
  async getById(
    id: string,
    options?: { include: Prisma.ImageInclude },
  ): Promise<Image | ImageGetPayload<{ include: Prisma.ImageInclude }> | null> {
    const row = await this.prisma.client.image.findUnique({
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
    if (!row || row.deletedAt) {
      return null;
    }
    return row;
  }

  async getPaginated(
    page: number,
    limit: number,
    filter?: ImageWhereInput,
    orderBy?: Prisma.ImageOrderByWithRelationInput,
  ): Promise<Image[]>;
  async getPaginated<T extends Prisma.ImageInclude>(
    page: number,
    limit: number,
    filter: ImageWhereInput | undefined,
    orderBy: Prisma.ImageOrderByWithRelationInput | undefined,
    options: { include: T },
  ): Promise<ImageGetPayload<{ include: T }>[]>;
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
    filter?: ImageWhereInput,
    orderBy?: Prisma.ImageOrderByWithRelationInput,
    options?: { include: Prisma.ImageInclude },
  ): Promise<Image[] | ImageGetPayload<{ include: Prisma.ImageInclude }>[]> {
    return await this.prisma.client.image.findMany({
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
    const count = await this.prisma.client.image.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }
  /**
   * Counts records that match the provided filters.
   * @param filter Filter criteria for matching rows.
   * @returns Number of matching records.
   */
  async count(filter?: ImageWhereInput): Promise<number> {
    return await this.prisma.client.image.count({
      where: {
        ...filter,
        deletedAt:
          filter && 'deletedAt' in filter && filter.deletedAt !== undefined
            ? filter.deletedAt
            : null,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: ImageCreateInput): Promise<Image>;
  async create<T extends Prisma.ImageInclude>(
    data: ImageCreateInput,
    options: { include: T },
  ): Promise<ImageGetPayload<{ include: T }>>;
  /**
   * Creates a new record with the provided data.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created record. Includes related entities when `options.include` is provided.
   */
  async create(
    data: ImageCreateInput,
    options?: { include: Prisma.ImageInclude },
  ): Promise<Image | ImageGetPayload<{ include: Prisma.ImageInclude }>> {
    return await this.prisma.client.image.create({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async createMany(data: Prisma.ImageCreateManyInput[]): Promise<Image[]>;
  async createMany<T extends Prisma.ImageInclude>(
    data: Prisma.ImageCreateManyInput[],
    options: { include: T },
  ): Promise<ImageGetPayload<{ include: T }>[]>;
  /**
   * Creates multiple records in a single operation.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created records. Includes related entities when `options.include` is provided.
   */
  async createMany(
    data: Prisma.ImageCreateManyInput[],
    options?: { include: Prisma.ImageInclude },
  ): Promise<Image[] | ImageGetPayload<{ include: Prisma.ImageInclude }>[]> {
    return await this.prisma.client.image.createManyAndReturn({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: ImageUpdateInput): Promise<Image>;
  async update<T extends Prisma.ImageInclude>(
    id: string,
    data: ImageUpdateInput,
    options: { include: T },
  ): Promise<ImageGetPayload<{ include: T }>>;
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
    data: ImageUpdateInput,
    options?: { include: Prisma.ImageInclude },
  ): Promise<Image | ImageGetPayload<{ include: Prisma.ImageInclude }>> {
    return await this.prisma.client.image.update({
      where: { id },
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }
  async updateMany(updates: { id: string; data: ImageUpdateInput }[]): Promise<Image[]>;
  async updateMany<T extends Prisma.ImageInclude>(
    updates: { id: string; data: ImageUpdateInput }[],
    options: { include: T },
  ): Promise<ImageGetPayload<{ include: T }>[]>;
  /**
   * Updates multiple existing records in a single operation.
   * @param updates List of record IDs and update payloads to apply.
   * @param options Optional include or query options.
   * @returns Updated records. Includes related entities when `options.include` is provided.
   */
  async updateMany(
    updates: { id: string; data: ImageUpdateInput }[],
    options?: { include: Prisma.ImageInclude },
  ): Promise<Image[] | ImageGetPayload<{ include: Prisma.ImageInclude }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.image.update({
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
  async delete(id: string): Promise<Image> {
    return await this.prisma.client.image.delete({ where: { id } });
  }
  /**
   * Soft-deletes a single record by setting its deletion timestamp.
   * @param id Record identifier.
   * @returns The resulting record after the write operation.
   * @throws Error if no matching record is found for this strict write operation.
   */
  async softDelete(id: string): Promise<Image> {
    return await this.prisma.client.image.update({
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
  async deleteMany(ids: string[]): Promise<Image[]> {
    if (ids.length === 0) {
      return [];
    }
    const images = await this.prisma.client.image.findMany({
      where: { id: { in: ids } },
    });
    await this.prisma.client.image.deleteMany({
      where: { id: { in: ids } },
    });
    return images;
  }
  /**
   * Soft-deletes multiple records by setting their deletion timestamps.
   * @param ids Record identifiers to match.
   * @returns The resulting record after the write operation.
   */
  async softDeleteMany(ids: string[]): Promise<Image[]> {
    if (ids.length === 0) {
      return [];
    }
    const images = await this.prisma.client.image.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });
    await this.prisma.client.image.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return images;
  }
}
