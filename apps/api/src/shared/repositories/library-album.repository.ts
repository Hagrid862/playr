import { Injectable } from '@nestjs/common';
import {
    LibraryAlbum,
    LibraryAlbumCreateInput,
    LibraryAlbumOrderByWithRelationInput,
    LibraryAlbumUpdateInput,
    LibraryAlbumWhereInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class LibraryAlbumRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async findOne(where: LibraryAlbumWhereInput): Promise<LibraryAlbum | null> {
    return await this.prisma.client.libraryAlbum.findFirst({
      where: {
        ...where,
        album: {
          deletedAt: null,
        },
      },
      include: {
        album: {
          include: {
            cover: true,
            artists: true,
          },
        },
      },
    });
  }

  async findMany(options: {
    where?: LibraryAlbumWhereInput;
    take?: number;
    skip?: number;
    orderBy?: LibraryAlbumOrderByWithRelationInput;
  }): Promise<LibraryAlbum[]> {
    return await this.prisma.client.libraryAlbum.findMany({
      take: options.take,
      skip: options.skip,
      where: {
        ...options.where,
        album: {
          deletedAt: null,
        },
      },
      include: {
        album: {
          include: {
            cover: true,
            artists: true,
          },
        },
      },
      orderBy: options.orderBy,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

  async exists(where: LibraryAlbumWhereInput): Promise<boolean> {
    const count = await this.prisma.client.libraryAlbum.count({ where });
    return count > 0;
  }

  async count(where?: LibraryAlbumWhereInput): Promise<number> {
    return await this.prisma.client.libraryAlbum.count({
      where: {
        ...where,
        album: {
          deletedAt: null,
        },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: LibraryAlbumCreateInput): Promise<LibraryAlbum> {
    return await this.prisma.client.libraryAlbum.create({ data });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: LibraryAlbumUpdateInput): Promise<LibraryAlbum> {
    return await this.prisma.client.libraryAlbum.update({ data, where: { id } });
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  async delete(id: string): Promise<LibraryAlbum> {
    return await this.prisma.client.libraryAlbum.delete({ where: { id } });
  }

  async deleteMany(where: LibraryAlbumWhereInput): Promise<void> {
    await this.prisma.client.libraryAlbum.deleteMany({
      where,
    });
  }
}
