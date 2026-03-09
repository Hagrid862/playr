import { Injectable } from '@nestjs/common';
import { Image, ImageCreateInput, ImageUpdateInput, ImageWhereInput, Prisma } from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class ImageRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async findOne(where: ImageWhereInput): Promise<Image | null> {
    return await this.prisma.client.image.findFirst({
      where,
    });
  }

  async findMany(options: {
    where?: ImageWhereInput;
    take?: number;
    skip?: number;
    orderBy?: Prisma.ImageOrderByWithRelationInput;
  }): Promise<Image[]> {
    return await this.prisma.client.image.findMany({
      take: options.take,
      skip: options.skip,
      where: options.where,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.image.count({ where: { id } });
    return count > 0;
  }

  async count(filter?: ImageWhereInput): Promise<number> {
    return await this.prisma.client.image.count({
      where: filter,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: ImageCreateInput): Promise<Image> {
    return await this.prisma.client.image.create({ data });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: ImageUpdateInput): Promise<Image> {
    return await this.prisma.client.image.update({ where: { id }, data });
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  async delete(id: string): Promise<Image> {
    return await this.prisma.client.image.delete({ where: { id } });
  }
}
