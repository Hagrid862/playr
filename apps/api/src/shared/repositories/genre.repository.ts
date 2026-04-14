import { Injectable } from '@nestjs/common';
import {
  Genre,
  GenreCreateInput,
  GenreOrderByWithRelationInput,
  GenreUpdateInput,
  GenreWhereInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class GenreRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async findOne(where: GenreWhereInput): Promise<Genre | null> {
    return await this.prisma.client.genre.findFirst({
      where: { ...where, deletedAt: null },
    });
  }

  async findMany(options: {
    where?: GenreWhereInput;
    take?: number;
    skip?: number;
    orderBy?: GenreOrderByWithRelationInput;
  }): Promise<Genre[]> {
    return await this.prisma.client.genre.findMany({
      where: {
        ...options.where,
        deletedAt: null,
      },
      take: options.take,
      skip: options.skip,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
    });
  }

  async count(filter?: GenreWhereInput): Promise<number> {
    return await this.prisma.client.genre.count({
      where: {
        ...filter,
        deletedAt: null,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: GenreCreateInput): Promise<Genre> {
    return await this.prisma.client.genre.create({ data });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: GenreUpdateInput): Promise<Genre> {
    return await this.prisma.client.genre.update({ where: { id }, data });
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  async delete(id: string): Promise<Genre> {
    return await this.prisma.client.genre.delete({ where: { id } });
  }
}
