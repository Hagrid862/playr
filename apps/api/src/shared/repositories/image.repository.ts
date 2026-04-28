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

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.image.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }

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

  async updateMany(
    updates: { id: string; data: ImageUpdateInput }[],
  ): Promise<Image[]>;
  async updateMany<T extends Prisma.ImageInclude>(
    updates: { id: string; data: ImageUpdateInput }[],
    options: { include: T },
  ): Promise<ImageGetPayload<{ include: T }>[]>;
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

  async delete(id: string): Promise<Image> {
    return await this.prisma.client.image.delete({ where: { id } });
  }

  async softDelete(id: string): Promise<Image> {
    return await this.prisma.client.image.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Hard-delete by primary keys only. No-op when `ids` is empty. */
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

  /** Soft-delete by primary keys only. No-op when `ids` is empty. */
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
