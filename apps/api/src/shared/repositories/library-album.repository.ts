import { Injectable } from '@nestjs/common';
import {
  LibraryAlbum,
  LibraryAlbumCreateInput,
  LibraryAlbumGetPayload,
  LibraryAlbumOrderByWithRelationInput,
  LibraryAlbumUpdateInput,
  LibraryAlbumWhereInput,
  Prisma,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

function mergeLibraryAlbumWhere(where: LibraryAlbumWhereInput): LibraryAlbumWhereInput {
  const { album, ...rest } = where;
  return {
    ...rest,
    album: {
      ...((album as object) || {}),
      deletedAt: null,
    },
  };
}

@Injectable()
export class LibraryAlbumRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<LibraryAlbum | null>;
  async getById<T extends Prisma.LibraryAlbumInclude>(
    id: string,
    options: { include: T },
  ): Promise<LibraryAlbumGetPayload<{ include: T }> | null>;
  async getById(
    id: string,
    options?: { include: Prisma.LibraryAlbumInclude },
  ): Promise<
    LibraryAlbum | LibraryAlbumGetPayload<{ include: Prisma.LibraryAlbumInclude }> | null
  > {
    const row = await this.prisma.client.libraryAlbum.findUnique({
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
    if (!row || row.deletedAt) {
      return null;
    }
    return row;
  }

  async getByLibraryAndAlbum(
    libraryId: string,
    albumId: string,
  ): Promise<LibraryAlbum | null>;
  async getByLibraryAndAlbum<T extends Prisma.LibraryAlbumInclude>(
    libraryId: string,
    albumId: string,
    options: { include: T },
  ): Promise<LibraryAlbumGetPayload<{ include: T }> | null>;
  async getByLibraryAndAlbum(
    libraryId: string,
    albumId: string,
    options?: { include: Prisma.LibraryAlbumInclude },
  ): Promise<
    LibraryAlbum | LibraryAlbumGetPayload<{ include: Prisma.LibraryAlbumInclude }> | null
  > {
    return await this.prisma.client.libraryAlbum.findFirst({
      where: mergeLibraryAlbumWhere({ libraryId, albumId }),
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async getPaginated(
    page: number,
    limit: number,
    filter?: LibraryAlbumWhereInput,
    orderBy?: LibraryAlbumOrderByWithRelationInput,
  ): Promise<LibraryAlbum[]>;
  async getPaginated<T extends Prisma.LibraryAlbumInclude>(
    page: number,
    limit: number,
    filter: LibraryAlbumWhereInput | undefined,
    orderBy: LibraryAlbumOrderByWithRelationInput | undefined,
    options: { include: T },
  ): Promise<LibraryAlbumGetPayload<{ include: T }>[]>;
  async getPaginated(
    page: number,
    limit: number,
    filter?: LibraryAlbumWhereInput,
    orderBy?: LibraryAlbumOrderByWithRelationInput,
    options?: { include: Prisma.LibraryAlbumInclude },
  ): Promise<
    LibraryAlbum[] | LibraryAlbumGetPayload<{ include: Prisma.LibraryAlbumInclude }>[]
  > {
    const { album, ...rest } = filter || {};
    return await this.prisma.client.libraryAlbum.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where: {
        ...rest,
        deletedAt:
          filter && 'deletedAt' in filter && filter.deletedAt !== undefined
            ? filter.deletedAt
            : null,
        album: {
          ...((album as object) || {}),
          deletedAt: null,
        },
      },
      orderBy,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────────────────────

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.libraryAlbum.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }

  async existsForLibraryAndAlbum(libraryId: string, albumId: string): Promise<boolean> {
    const count = await this.prisma.client.libraryAlbum.count({
      where: mergeLibraryAlbumWhere({ libraryId, albumId }),
    });
    return count > 0;
  }

  async count(where?: LibraryAlbumWhereInput): Promise<number> {
    const { album, ...rest } = where || {};
    return await this.prisma.client.libraryAlbum.count({
      where: {
        ...rest,
        deletedAt:
          where && 'deletedAt' in where && where.deletedAt !== undefined
            ? where.deletedAt
            : null,
        album: {
          ...((album as object) || {}),
          deletedAt: null,
        },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: LibraryAlbumCreateInput): Promise<LibraryAlbum>;
  async create<T extends Prisma.LibraryAlbumInclude>(
    data: LibraryAlbumCreateInput,
    options: { include: T },
  ): Promise<LibraryAlbumGetPayload<{ include: T }>>;
  async create(
    data: LibraryAlbumCreateInput,
    options?: { include: Prisma.LibraryAlbumInclude },
  ): Promise<
    LibraryAlbum | LibraryAlbumGetPayload<{ include: Prisma.LibraryAlbumInclude }>
  > {
    return await this.prisma.client.libraryAlbum.create({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async createMany(data: Prisma.LibraryAlbumCreateManyInput[]): Promise<LibraryAlbum[]>;
  async createMany<T extends Prisma.LibraryAlbumInclude>(
    data: Prisma.LibraryAlbumCreateManyInput[],
    options: { include: T },
  ): Promise<LibraryAlbumGetPayload<{ include: T }>[]>;
  async createMany(
    data: Prisma.LibraryAlbumCreateManyInput[],
    options?: { include: Prisma.LibraryAlbumInclude },
  ): Promise<
    LibraryAlbum[] | LibraryAlbumGetPayload<{ include: Prisma.LibraryAlbumInclude }>[]
  > {
    return await this.prisma.client.libraryAlbum.createManyAndReturn({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: LibraryAlbumUpdateInput): Promise<LibraryAlbum>;
  async update<T extends Prisma.LibraryAlbumInclude>(
    id: string,
    data: LibraryAlbumUpdateInput,
    options: { include: T },
  ): Promise<LibraryAlbumGetPayload<{ include: T }>>;
  async update(
    id: string,
    data: LibraryAlbumUpdateInput,
    options?: { include: Prisma.LibraryAlbumInclude },
  ): Promise<
    LibraryAlbum | LibraryAlbumGetPayload<{ include: Prisma.LibraryAlbumInclude }>
  > {
    return await this.prisma.client.libraryAlbum.update({
      data,
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async updateMany(
    updates: { id: string; data: LibraryAlbumUpdateInput }[],
  ): Promise<LibraryAlbum[]>;
  async updateMany<T extends Prisma.LibraryAlbumInclude>(
    updates: { id: string; data: LibraryAlbumUpdateInput }[],
    options: { include: T },
  ): Promise<LibraryAlbumGetPayload<{ include: T }>[]>;
  async updateMany(
    updates: { id: string; data: LibraryAlbumUpdateInput }[],
    options?: { include: Prisma.LibraryAlbumInclude },
  ): Promise<
    LibraryAlbum[] | LibraryAlbumGetPayload<{ include: Prisma.LibraryAlbumInclude }>[]
  > {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.libraryAlbum.update({
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

  async delete(id: string): Promise<LibraryAlbum> {
    return await this.prisma.client.libraryAlbum.delete({ where: { id } });
  }

  async softDelete(id: string): Promise<LibraryAlbum> {
    return await this.prisma.client.libraryAlbum.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Hard-delete by primary keys only. No-op when `ids` is empty. */
  async deleteMany(ids: string[]): Promise<LibraryAlbum[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.prisma.client.libraryAlbum.findMany({
      where: { id: { in: ids } },
    });
    await this.prisma.client.libraryAlbum.deleteMany({
      where: { id: { in: ids } },
    });
    return rows;
  }

  /** Soft-delete by primary keys only. No-op when `ids` is empty. */
  async softDeleteMany(ids: string[]): Promise<LibraryAlbum[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.prisma.client.libraryAlbum.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });
    await this.prisma.client.libraryAlbum.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return rows;
  }
}
