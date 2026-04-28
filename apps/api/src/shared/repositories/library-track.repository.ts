import { Injectable } from '@nestjs/common';
import {
  LibraryTrack,
  LibraryTrackCreateInput,
  LibraryTrackGetPayload,
  LibraryTrackOrderByWithRelationInput,
  LibraryTrackUpdateInput,
  LibraryTrackWhereInput,
  Prisma,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

function mergeLibraryTrackWhere(where: LibraryTrackWhereInput): LibraryTrackWhereInput {
  const { track, ...rest } = where;
  return {
    ...rest,
    track: {
      ...((track as object) || {}),
      deletedAt: null,
    },
  };
}

@Injectable()
export class LibraryTrackRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<LibraryTrack | null>;
  async getById<T extends Prisma.LibraryTrackInclude>(
    id: string,
    options: { include: T },
  ): Promise<LibraryTrackGetPayload<{ include: T }> | null>;
  async getById(
    id: string,
    options?: { include: Prisma.LibraryTrackInclude },
  ): Promise<
    LibraryTrack | LibraryTrackGetPayload<{ include: Prisma.LibraryTrackInclude }> | null
  > {
    const row = await this.prisma.client.libraryTrack.findUnique({
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
    if (!row || row.deletedAt) {
      return null;
    }
    return row;
  }

  async getByLibraryAndTrack(
    libraryId: string,
    trackId: string,
  ): Promise<LibraryTrack | null>;
  async getByLibraryAndTrack<T extends Prisma.LibraryTrackInclude>(
    libraryId: string,
    trackId: string,
    options: { include: T },
  ): Promise<LibraryTrackGetPayload<{ include: T }> | null>;
  async getByLibraryAndTrack(
    libraryId: string,
    trackId: string,
    options?: { include: Prisma.LibraryTrackInclude },
  ): Promise<
    LibraryTrack | LibraryTrackGetPayload<{ include: Prisma.LibraryTrackInclude }> | null
  > {
    return await this.prisma.client.libraryTrack.findFirst({
      where: mergeLibraryTrackWhere({ libraryId, trackId }),
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async getPaginated(
    page: number,
    limit: number,
    filter?: LibraryTrackWhereInput,
    orderBy?:
      | LibraryTrackOrderByWithRelationInput
      | LibraryTrackOrderByWithRelationInput[],
  ): Promise<LibraryTrack[]>;
  async getPaginated<T extends Prisma.LibraryTrackInclude>(
    page: number,
    limit: number,
    filter: LibraryTrackWhereInput | undefined,
    orderBy:
      | LibraryTrackOrderByWithRelationInput
      | LibraryTrackOrderByWithRelationInput[]
      | undefined,
    options: { include: T },
  ): Promise<LibraryTrackGetPayload<{ include: T }>[]>;
  async getPaginated(
    page: number,
    limit: number,
    filter?: LibraryTrackWhereInput,
    orderBy?:
      | LibraryTrackOrderByWithRelationInput
      | LibraryTrackOrderByWithRelationInput[],
    options?: { include: Prisma.LibraryTrackInclude },
  ): Promise<
    LibraryTrack[] | LibraryTrackGetPayload<{ include: Prisma.LibraryTrackInclude }>[]
  > {
    const { track, ...rest } = filter || {};
    return await this.prisma.client.libraryTrack.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where: {
        ...rest,
        deletedAt:
          filter && 'deletedAt' in filter && filter.deletedAt !== undefined
            ? filter.deletedAt
            : null,
        track: {
          ...((track as object) || {}),
          deletedAt: null,
        },
      },
      orderBy,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  /** All library-track rows for a library whose tracks belong to the given album (no pagination). */
  async listByLibraryAndAlbum(
    libraryId: string,
    albumId: string,
    options?: {
      orderBy?:
        | LibraryTrackOrderByWithRelationInput
        | LibraryTrackOrderByWithRelationInput[];
      include?: Prisma.LibraryTrackInclude;
    },
  ): Promise<LibraryTrack[]>;
  async listByLibraryAndAlbum<T extends Prisma.LibraryTrackInclude>(
    libraryId: string,
    albumId: string,
    options: {
      orderBy?:
        | LibraryTrackOrderByWithRelationInput
        | LibraryTrackOrderByWithRelationInput[];
      include: T;
    },
  ): Promise<LibraryTrackGetPayload<{ include: T }>[]>;
  async listByLibraryAndAlbum(
    libraryId: string,
    albumId: string,
    options?: {
      orderBy?:
        | LibraryTrackOrderByWithRelationInput
        | LibraryTrackOrderByWithRelationInput[];
      include?: Prisma.LibraryTrackInclude;
    },
  ): Promise<
    LibraryTrack[] | LibraryTrackGetPayload<{ include: Prisma.LibraryTrackInclude }>[]
  > {
    return await this.prisma.client.libraryTrack.findMany({
      where: {
        ...mergeLibraryTrackWhere({
          libraryId,
          track: { albumId },
        }),
        deletedAt: null,
      },
      orderBy: options?.orderBy,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  /** Junction row ids linking this track to libraries owned by `userId` (non-deleted rows). */
  async listIdsByTrackAndUser(trackId: string, userId: string): Promise<string[]> {
    const rows = await this.prisma.client.libraryTrack.findMany({
      where: {
        trackId,
        deletedAt: null,
        library: { userId },
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  // ─────────────────────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────────────────────

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.libraryTrack.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }

  async existsForLibraryAndTrack(libraryId: string, trackId: string): Promise<boolean> {
    const count = await this.prisma.client.libraryTrack.count({
      where: mergeLibraryTrackWhere({ libraryId, trackId }),
    });
    return count > 0;
  }

  async count(where?: LibraryTrackWhereInput): Promise<number> {
    const { track, ...rest } = where || {};
    return await this.prisma.client.libraryTrack.count({
      where: {
        ...rest,
        deletedAt:
          where && 'deletedAt' in where && where.deletedAt !== undefined
            ? where.deletedAt
            : null,
        track: {
          ...((track as object) || {}),
          deletedAt: null,
        },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: LibraryTrackCreateInput): Promise<LibraryTrack>;
  async create<T extends Prisma.LibraryTrackInclude>(
    data: LibraryTrackCreateInput,
    options: { include: T },
  ): Promise<LibraryTrackGetPayload<{ include: T }>>;
  async create(
    data: LibraryTrackCreateInput,
    options?: { include: Prisma.LibraryTrackInclude },
  ): Promise<
    LibraryTrack | LibraryTrackGetPayload<{ include: Prisma.LibraryTrackInclude }>
  > {
    return await this.prisma.client.libraryTrack.create({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async createMany(data: Prisma.LibraryTrackCreateManyInput[]): Promise<LibraryTrack[]>;
  async createMany<T extends Prisma.LibraryTrackInclude>(
    data: Prisma.LibraryTrackCreateManyInput[],
    options: { include: T },
  ): Promise<LibraryTrackGetPayload<{ include: T }>[]>;
  async createMany(
    data: Prisma.LibraryTrackCreateManyInput[],
    options?: { include: Prisma.LibraryTrackInclude },
  ): Promise<
    LibraryTrack[] | LibraryTrackGetPayload<{ include: Prisma.LibraryTrackInclude }>[]
  > {
    return await this.prisma.client.libraryTrack.createManyAndReturn({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: LibraryTrackUpdateInput): Promise<LibraryTrack>;
  async update<T extends Prisma.LibraryTrackInclude>(
    id: string,
    data: LibraryTrackUpdateInput,
    options: { include: T },
  ): Promise<LibraryTrackGetPayload<{ include: T }>>;
  async update(
    id: string,
    data: LibraryTrackUpdateInput,
    options?: { include: Prisma.LibraryTrackInclude },
  ): Promise<
    LibraryTrack | LibraryTrackGetPayload<{ include: Prisma.LibraryTrackInclude }>
  > {
    return await this.prisma.client.libraryTrack.update({
      data,
      where: { id },
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async updateMany(
    updates: { id: string; data: LibraryTrackUpdateInput }[],
  ): Promise<LibraryTrack[]>;
  async updateMany<T extends Prisma.LibraryTrackInclude>(
    updates: { id: string; data: LibraryTrackUpdateInput }[],
    options: { include: T },
  ): Promise<LibraryTrackGetPayload<{ include: T }>[]>;
  async updateMany(
    updates: { id: string; data: LibraryTrackUpdateInput }[],
    options?: { include: Prisma.LibraryTrackInclude },
  ): Promise<
    LibraryTrack[] | LibraryTrackGetPayload<{ include: Prisma.LibraryTrackInclude }>[]
  > {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.libraryTrack.update({
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

  async delete(id: string): Promise<LibraryTrack> {
    return await this.prisma.client.libraryTrack.delete({ where: { id } });
  }

  async softDelete(id: string): Promise<LibraryTrack> {
    return await this.prisma.client.libraryTrack.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Hard-delete by primary keys only. No-op when `ids` is empty. */
  async deleteMany(ids: string[]): Promise<LibraryTrack[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.prisma.client.libraryTrack.findMany({
      where: { id: { in: ids } },
    });
    await this.prisma.client.libraryTrack.deleteMany({
      where: { id: { in: ids } },
    });
    return rows;
  }

  /** Soft-delete by primary keys only. No-op when `ids` is empty. */
  async softDeleteMany(ids: string[]): Promise<LibraryTrack[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.prisma.client.libraryTrack.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });
    await this.prisma.client.libraryTrack.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return rows;
  }
}
