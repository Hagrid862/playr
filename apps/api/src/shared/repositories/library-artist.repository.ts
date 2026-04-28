import { Injectable } from '@nestjs/common';
import {
  LibraryArtist,
  LibraryArtistCreateInput,
  LibraryArtistGetPayload,
  LibraryArtistOrderByWithRelationInput,
  LibraryArtistUpdateInput,
  LibraryArtistWhereInput,
  Prisma,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

function mergeLibraryArtistWhere(where: LibraryArtistWhereInput): LibraryArtistWhereInput {
  const { artist, ...rest } = where;
  return {
    ...rest,
    artist: {
      ...((artist as object) || {}),
      deletedAt: null,
    },
  };
}

@Injectable()
export class LibraryArtistRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<LibraryArtist | null>;
  async getById<T extends Prisma.LibraryArtistInclude>(
    id: string,
    options: { include: T },
  ): Promise<LibraryArtistGetPayload<{ include: T }> | null>;
  async getById(
    id: string,
    options?: { include: Prisma.LibraryArtistInclude },
  ): Promise<
    LibraryArtist | LibraryArtistGetPayload<{ include: Prisma.LibraryArtistInclude }> | null
  > {
    const row = await this.prisma.client.libraryArtist.findUnique({
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
    if (!row || row.deletedAt) {
      return null;
    }
    return row;
  }

  async getByLibraryAndArtist(
    libraryId: string,
    artistId: string,
  ): Promise<LibraryArtist | null>;
  async getByLibraryAndArtist<T extends Prisma.LibraryArtistInclude>(
    libraryId: string,
    artistId: string,
    options: { include: T },
  ): Promise<LibraryArtistGetPayload<{ include: T }> | null>;
  async getByLibraryAndArtist(
    libraryId: string,
    artistId: string,
    options?: { include: Prisma.LibraryArtistInclude },
  ): Promise<
    LibraryArtist | LibraryArtistGetPayload<{ include: Prisma.LibraryArtistInclude }> | null
  > {
    return await this.prisma.client.libraryArtist.findFirst({
      where: mergeLibraryArtistWhere({ libraryId, artistId }),
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async getPaginated(
    page: number,
    limit: number,
    filter?: LibraryArtistWhereInput,
    orderBy?: LibraryArtistOrderByWithRelationInput,
  ): Promise<LibraryArtist[]>;
  async getPaginated<T extends Prisma.LibraryArtistInclude>(
    page: number,
    limit: number,
    filter: LibraryArtistWhereInput | undefined,
    orderBy: LibraryArtistOrderByWithRelationInput | undefined,
    options: { include: T },
  ): Promise<LibraryArtistGetPayload<{ include: T }>[]>;
  async getPaginated(
    page: number,
    limit: number,
    filter?: LibraryArtistWhereInput,
    orderBy?: LibraryArtistOrderByWithRelationInput,
    options?: { include: Prisma.LibraryArtistInclude },
  ): Promise<
    LibraryArtist[] | LibraryArtistGetPayload<{ include: Prisma.LibraryArtistInclude }>[]
  > {
    const { artist, ...rest } = filter || {};
    return await this.prisma.client.libraryArtist.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where: {
        ...rest,
        deletedAt:
          filter && 'deletedAt' in filter && filter.deletedAt !== undefined
            ? filter.deletedAt
            : null,
        artist: {
          ...((artist as object) || {}),
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
    const count = await this.prisma.client.libraryArtist.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }

  async existsForLibraryAndArtist(libraryId: string, artistId: string): Promise<boolean> {
    const count = await this.prisma.client.libraryArtist.count({
      where: mergeLibraryArtistWhere({ libraryId, artistId }),
    });
    return count > 0;
  }

  async count(where?: LibraryArtistWhereInput): Promise<number> {
    const { artist, ...rest } = where || {};
    return await this.prisma.client.libraryArtist.count({
      where: {
        ...rest,
        deletedAt:
          where && 'deletedAt' in where && where.deletedAt !== undefined
            ? where.deletedAt
            : null,
        artist: {
          ...((artist as object) || {}),
          deletedAt: null,
        },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: LibraryArtistCreateInput): Promise<LibraryArtist>;
  async create<T extends Prisma.LibraryArtistInclude>(
    data: LibraryArtistCreateInput,
    options: { include: T },
  ): Promise<LibraryArtistGetPayload<{ include: T }>>;
  async create(
    data: LibraryArtistCreateInput,
    options?: { include: Prisma.LibraryArtistInclude },
  ): Promise<
    LibraryArtist | LibraryArtistGetPayload<{ include: Prisma.LibraryArtistInclude }>
  > {
    return await this.prisma.client.libraryArtist.create({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async createMany(data: Prisma.LibraryArtistCreateManyInput[]): Promise<LibraryArtist[]>;
  async createMany<T extends Prisma.LibraryArtistInclude>(
    data: Prisma.LibraryArtistCreateManyInput[],
    options: { include: T },
  ): Promise<LibraryArtistGetPayload<{ include: T }>[]>;
  async createMany(
    data: Prisma.LibraryArtistCreateManyInput[],
    options?: { include: Prisma.LibraryArtistInclude },
  ): Promise<
    LibraryArtist[] | LibraryArtistGetPayload<{ include: Prisma.LibraryArtistInclude }>[]
  > {
    return await this.prisma.client.libraryArtist.createManyAndReturn({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: LibraryArtistUpdateInput): Promise<LibraryArtist>;
  async update<T extends Prisma.LibraryArtistInclude>(
    id: string,
    data: LibraryArtistUpdateInput,
    options: { include: T },
  ): Promise<LibraryArtistGetPayload<{ include: T }>>;
  async update(
    id: string,
    data: LibraryArtistUpdateInput,
    options?: { include: Prisma.LibraryArtistInclude },
  ): Promise<
    LibraryArtist | LibraryArtistGetPayload<{ include: Prisma.LibraryArtistInclude }>
  > {
    return await this.prisma.client.libraryArtist.update({
      data,
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async updateMany(
    updates: { id: string; data: LibraryArtistUpdateInput }[],
  ): Promise<LibraryArtist[]>;
  async updateMany<T extends Prisma.LibraryArtistInclude>(
    updates: { id: string; data: LibraryArtistUpdateInput }[],
    options: { include: T },
  ): Promise<LibraryArtistGetPayload<{ include: T }>[]>;
  async updateMany(
    updates: { id: string; data: LibraryArtistUpdateInput }[],
    options?: { include: Prisma.LibraryArtistInclude },
  ): Promise<
    LibraryArtist[] | LibraryArtistGetPayload<{ include: Prisma.LibraryArtistInclude }>[]
  > {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.libraryArtist.update({
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

  async delete(id: string): Promise<LibraryArtist> {
    return await this.prisma.client.libraryArtist.delete({ where: { id } });
  }

  async softDelete(id: string): Promise<LibraryArtist> {
    return await this.prisma.client.libraryArtist.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Hard-delete by primary keys only. No-op when `ids` is empty. */
  async deleteMany(ids: string[]): Promise<LibraryArtist[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.prisma.client.libraryArtist.findMany({
      where: { id: { in: ids } },
    });
    await this.prisma.client.libraryArtist.deleteMany({
      where: { id: { in: ids } },
    });
    return rows;
  }

  /** Soft-delete by primary keys only. No-op when `ids` is empty. */
  async softDeleteMany(ids: string[]): Promise<LibraryArtist[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.prisma.client.libraryArtist.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });
    await this.prisma.client.libraryArtist.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return rows;
  }
}
