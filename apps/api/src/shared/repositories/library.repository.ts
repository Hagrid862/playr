import { Injectable } from '@nestjs/common';
import {
  Library,
  LibraryCreateInput,
  LibraryOrderByWithRelationInput,
  LibraryUpdateInput,
  LibraryWhereInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class LibraryRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<Library | null> {
    return await this.prisma.client.library.findUnique({ where: { id } });
  }

  async getByUserId(userId: string): Promise<Library | null> {
    return await this.prisma.client.library.findUnique({ where: { userId } });
  }

  async getPaginated(
    page: number,
    limit: number,
    filter?: LibraryWhereInput,
    orderBy?: LibraryOrderByWithRelationInput,
  ): Promise<Library[]> {
    return await this.prisma.client.library.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where: filter,
      orderBy,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.library.count({ where: { id } });
    return count > 0;
  }

  async existsForUser(userId: string): Promise<boolean> {
    const count = await this.prisma.client.library.count({ where: { userId } });
    return count > 0;
  }

  async count(filter?: LibraryWhereInput): Promise<number> {
    return await this.prisma.client.library.count({ where: filter });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: LibraryCreateInput): Promise<Library> {
    return await this.prisma.client.library.create({ data });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: LibraryUpdateInput): Promise<Library> {
    return await this.prisma.client.library.update({ data, where: { id } });
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  async delete(id: string): Promise<Library> {
    return await this.prisma.client.library.delete({ where: { id } });
  }

  async deleteByUserId(userId: string): Promise<Library> {
    return await this.prisma.client.library.delete({ where: { userId } });
  }
}
