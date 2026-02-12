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

  async getById(id: string): Promise<LibraryAlbum | null> {
    return await this.prisma.client.libraryAlbum.findUnique({ where: { id } });
  }

  async getByLibraryIdAndAlbumId(libraryId: string, albumId: string): Promise<LibraryAlbum | null> {
    return await this.prisma.client.libraryAlbum.findUnique({
      where: {
        libraryId_albumId: {
          libraryId,
          albumId,
        },
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

  async getByAlbumIdAndUserId(albumId: string, userId: string): Promise<LibraryAlbum | null> {
    return await this.prisma.client.libraryAlbum.findFirst({
      where: {
        albumId,
        library: {
          userId,
        },
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

  async getByLibraryId(
    libraryId: string,
    page: number,
    limit: number,
    filter?: LibraryAlbumWhereInput,
    orderBy?: LibraryAlbumOrderByWithRelationInput,
  ): Promise<LibraryAlbum[]> {
    return await this.prisma.client.libraryAlbum.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where: {
        ...filter,
        libraryId,
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
      orderBy,
    });
  }

  async getAllByLibraryId(libraryId: string): Promise<LibraryAlbum[]> {
    return await this.prisma.client.libraryAlbum.findMany({
      where: {
        libraryId,
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

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.libraryAlbum.count({ where: { id } });
    return count > 0;
  }

  async existsInLibrary(libraryId: string, albumId: string): Promise<boolean> {
    const count = await this.prisma.client.libraryAlbum.count({
      where: {
        libraryId,
        albumId,
      },
    });
    return count > 0;
  }

  async count(filter?: LibraryAlbumWhereInput): Promise<number> {
    return await this.prisma.client.libraryAlbum.count({ where: filter });
  }

  async countByLibraryId(libraryId: string): Promise<number> {
    return await this.prisma.client.libraryAlbum.count({
      where: {
        libraryId,
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

  async deleteByLibraryIdAndAlbumId(libraryId: string, albumId: string): Promise<LibraryAlbum> {
    return await this.prisma.client.libraryAlbum.delete({
      where: {
        libraryId_albumId: {
          libraryId,
          albumId,
        },
      },
    });
  }

  async deleteAllFromLibrary(libraryId: string): Promise<void> {
    await this.prisma.client.libraryAlbum.deleteMany({
      where: { libraryId },
    });
  }
}
