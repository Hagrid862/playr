import { Injectable } from '@nestjs/common';
import {
    LibraryArtist,
    LibraryArtistCreateInput,
    LibraryArtistOrderByWithRelationInput,
    LibraryArtistUpdateInput,
    LibraryArtistWhereInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class LibraryArtistRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async findOne(where: LibraryArtistWhereInput): Promise<LibraryArtist | null> {
    return await this.prisma.client.libraryArtist.findFirst({
      where: {
        ...where,
        artist: {
          deletedAt: null,
        },
      },
      include: {
        artist: {
          include: {
            avatar: true,
            banner: true,
          },
        },
      },
    });
  }

  async findMany(options: {
    where?: LibraryArtistWhereInput;
    take?: number;
    skip?: number;
    orderBy?: LibraryArtistOrderByWithRelationInput;
  }): Promise<LibraryArtist[]> {
    return await this.prisma.client.libraryArtist.findMany({
      take: options.take,
      skip: options.skip,
      where: {
        ...options.where,
        artist: {
          deletedAt: null,
        },
      },
      include: {
        artist: {
          include: {
            avatar: true,
            banner: true,
          },
        },
      },
      orderBy: options.orderBy,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

  async exists(where: LibraryArtistWhereInput): Promise<boolean> {
    const count = await this.prisma.client.libraryArtist.count({ where });
    return count > 0;
  }

  async count(where?: LibraryArtistWhereInput): Promise<number> {
    return await this.prisma.client.libraryArtist.count({
      where: {
        ...where,
        artist: {
          deletedAt: null,
        },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: LibraryArtistCreateInput): Promise<LibraryArtist> {
    return await this.prisma.client.libraryArtist.create({ data });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: LibraryArtistUpdateInput): Promise<LibraryArtist> {
    return await this.prisma.client.libraryArtist.update({ data, where: { id } });
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  async delete(id: string): Promise<LibraryArtist> {
    return await this.prisma.client.libraryArtist.delete({ where: { id } });
  }

  async deleteMany(where: LibraryArtistWhereInput): Promise<void> {
    await this.prisma.client.libraryArtist.deleteMany({
      where,
    });
  }
}
