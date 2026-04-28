import { Injectable } from '@nestjs/common';
import {
  Library,
  LibraryCreateInput,
  LibraryGetPayload,
  LibraryOrderByWithRelationInput,
  LibraryUpdateInput,
  LibraryWhereInput,
  Prisma,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class LibraryRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<Library | null>;
  async getById<T extends Prisma.LibraryInclude>(
    id: string,
    options: { include: T },
  ): Promise<LibraryGetPayload<{ include: T }> | null>;
  async getById(
    id: string,
    options?: { include: Prisma.LibraryInclude },
  ): Promise<Library | LibraryGetPayload<{ include: Prisma.LibraryInclude }> | null> {
    const row = await this.prisma.client.library.findUnique({
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
    if (!row || row.deletedAt) {
      return null;
    }
    return row;
  }

  async getByUserId(userId: string): Promise<Library | null>;
  async getByUserId<T extends Prisma.LibraryInclude>(
    userId: string,
    options: { include: T },
  ): Promise<LibraryGetPayload<{ include: T }> | null>;
  async getByUserId(
    userId: string,
    options?: { include: Prisma.LibraryInclude },
  ): Promise<Library | LibraryGetPayload<{ include: Prisma.LibraryInclude }> | null> {
    const row = await this.prisma.client.library.findUnique({
      where: { userId },
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
    filter?: LibraryWhereInput,
    orderBy?: LibraryOrderByWithRelationInput,
  ): Promise<Library[]>;
  async getPaginated<T extends Prisma.LibraryInclude>(
    page: number,
    limit: number,
    filter: LibraryWhereInput | undefined,
    orderBy: LibraryOrderByWithRelationInput | undefined,
    options: { include: T },
  ): Promise<LibraryGetPayload<{ include: T }>[]>;
  async getPaginated(
    page: number,
    limit: number,
    filter?: LibraryWhereInput,
    orderBy?: LibraryOrderByWithRelationInput,
    options?: { include: Prisma.LibraryInclude },
  ): Promise<Library[] | LibraryGetPayload<{ include: Prisma.LibraryInclude }>[]> {
    return await this.prisma.client.library.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where: {
        ...filter,
        deletedAt:
          filter && 'deletedAt' in filter && filter.deletedAt !== undefined
            ? filter.deletedAt
            : null,
      },
      orderBy,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────────────────────

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.library.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }

  async existsForUser(userId: string): Promise<boolean> {
    const count = await this.prisma.client.library.count({
      where: { userId, deletedAt: null },
    });
    return count > 0;
  }

  async count(filter?: LibraryWhereInput): Promise<number> {
    return await this.prisma.client.library.count({
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

  async create(data: LibraryCreateInput): Promise<Library>;
  async create<T extends Prisma.LibraryInclude>(
    data: LibraryCreateInput,
    options: { include: T },
  ): Promise<LibraryGetPayload<{ include: T }>>;
  async create(
    data: LibraryCreateInput,
    options?: { include: Prisma.LibraryInclude },
  ): Promise<Library | LibraryGetPayload<{ include: Prisma.LibraryInclude }>> {
    return await this.prisma.client.library.create({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async createMany(data: Prisma.LibraryCreateManyInput[]): Promise<Library[]>;
  async createMany<T extends Prisma.LibraryInclude>(
    data: Prisma.LibraryCreateManyInput[],
    options: { include: T },
  ): Promise<LibraryGetPayload<{ include: T }>[]>;
  async createMany(
    data: Prisma.LibraryCreateManyInput[],
    options?: { include: Prisma.LibraryInclude },
  ): Promise<
    Library[] | LibraryGetPayload<{ include: Prisma.LibraryInclude }>[]
  > {
    return await this.prisma.client.library.createManyAndReturn({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: LibraryUpdateInput): Promise<Library>;
  async update<T extends Prisma.LibraryInclude>(
    id: string,
    data: LibraryUpdateInput,
    options: { include: T },
  ): Promise<LibraryGetPayload<{ include: T }>>;
  async update(
    id: string,
    data: LibraryUpdateInput,
    options?: { include: Prisma.LibraryInclude },
  ): Promise<Library | LibraryGetPayload<{ include: Prisma.LibraryInclude }>> {
    return await this.prisma.client.library.update({
      data,
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async updateMany(
    updates: { id: string; data: LibraryUpdateInput }[],
  ): Promise<Library[]>;
  async updateMany<T extends Prisma.LibraryInclude>(
    updates: { id: string; data: LibraryUpdateInput }[],
    options: { include: T },
  ): Promise<LibraryGetPayload<{ include: T }>[]>;
  async updateMany(
    updates: { id: string; data: LibraryUpdateInput }[],
    options?: { include: Prisma.LibraryInclude },
  ): Promise<
    Library[] | LibraryGetPayload<{ include: Prisma.LibraryInclude }>[]
  > {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.library.update({
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

  async delete(id: string): Promise<Library> {
    return await this.prisma.client.library.delete({ where: { id } });
  }

  async softDelete(id: string): Promise<Library> {
    return await this.prisma.client.library.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async deleteByUserId(userId: string): Promise<Library> {
    return await this.prisma.client.library.delete({ where: { userId } });
  }

  /** Hard-delete by primary keys only. No-op when `ids` is empty. */
  async deleteMany(ids: string[]): Promise<Library[]> {
    if (ids.length === 0) {
      return [];
    }
    const libraries = await this.prisma.client.library.findMany({
      where: { id: { in: ids } },
    });
    await this.prisma.client.library.deleteMany({
      where: { id: { in: ids } },
    });
    return libraries;
  }

  /** Soft-delete by primary keys only. No-op when `ids` is empty. */
  async softDeleteMany(ids: string[]): Promise<Library[]> {
    if (ids.length === 0) {
      return [];
    }
    const libraries = await this.prisma.client.library.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });
    await this.prisma.client.library.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return libraries;
  }
}
