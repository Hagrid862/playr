import { Injectable } from '@nestjs/common';
import {
    Album,
    AlbumCreateInput,
    AlbumCreateManyInput,
    AlbumOrderByWithRelationInput,
    AlbumUpdateInput,
    AlbumWhereInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

export const DEFAULT_ALBUM_INCLUDE = {
  cover: true,
  artists: true,
  genres: { include: { genre: true } },
} as const;

export const DETAILED_ALBUM_INCLUDE = {
  ...DEFAULT_ALBUM_INCLUDE,
  tracks: {
    where: { deletedAt: null },
    orderBy: {
      trackNumber: 'asc' as const,
    },
    include: {
      album: {
        include: {
          cover: true,
        },
      },
      artists: true,
      audioFiles: true,
      genres: { include: { genre: true } },
    },
  },
} as const;

@Injectable()
export class AlbumRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async findOne(where: AlbumWhereInput, detailed = false): Promise<Album | null> {
    const include = detailed ? DETAILED_ALBUM_INCLUDE : DEFAULT_ALBUM_INCLUDE;

    return await this.prisma.client.album.findFirst({
      where: { ...where, deletedAt: null },
      include,
    });
  }

  async findMany(options: {
    where?: AlbumWhereInput;
    take?: number;
    skip?: number;
    orderBy?: AlbumOrderByWithRelationInput;
  }): Promise<Album[]> {
    return await this.prisma.client.album.findMany({
      take: options.take,
      skip: options.skip,
      where: {
        ...options.where,
        deletedAt: null,
      },
      include: DEFAULT_ALBUM_INCLUDE,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
    });
  }

  async checkAccess(id: string, userId?: string): Promise<boolean> {
    const guestId = 'GUEST';
    const activeUserId = userId ?? guestId;

    const album = await this.prisma.client.album.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          // 1. Is it Public?
          { visibility: 'public' },
          // 2. Direct Album Access? (viewer, editor, or owner)
          {
            access: {
              some: { userId: activeUserId },
            },
          },
          // 3. Inherited Artist Access? (If you have access to the Artist, you have access to their albums)
          {
            artists: {
              some: {
                access: {
                  some: { userId: activeUserId },
                },
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    return !!album;
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.album.count({ where: { id } });
    return count > 0;
  }

  async count(filter?: AlbumWhereInput): Promise<number> {
    return await this.prisma.client.album.count({
      where: {
        ...filter,
        deletedAt: null,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: AlbumCreateInput): Promise<Album> {
    return await this.prisma.client.album.create({
      data,
      include: DEFAULT_ALBUM_INCLUDE,
    });
  }

  async createMany(data: AlbumCreateManyInput[]): Promise<Album[]> {
    return await this.prisma.client.album.createManyAndReturn({ data });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: AlbumUpdateInput): Promise<Album> {
    return await this.prisma.client.album.update({
      where: { id },
      data,
      include: DEFAULT_ALBUM_INCLUDE,
    });
  }

  async updateMany(updates: { id: string; data: AlbumUpdateInput }[]): Promise<Album[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) => this.prisma.client.album.update({ where: { id }, data })),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  async delete(id: string): Promise<Album> {
    return await this.prisma.client.album.delete({ where: { id } });
  }

  async deleteMany(filter: AlbumWhereInput): Promise<Album[]> {
    const albumsToDelete = await this.prisma.client.album.findMany({
      where: filter,
    });
    await this.prisma.client.album.deleteMany({ where: filter });
    return albumsToDelete;
  }
}
