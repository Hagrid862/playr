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

  async getById(id: string): Promise<LibraryArtist | null> {
    return await this.prisma.client.libraryArtist.findUnique({ where: { id } });
  }

  async getByLibraryIdAndArtistId(
    libraryId: string,
    artistId: string,
  ): Promise<LibraryArtist | null> {
    return await this.prisma.client.libraryArtist.findUnique({
      where: {
        libraryId_artistId: {
          libraryId,
          artistId,
        },
      },
    });
  }

  async getByArtistIdAndUserId(artistId: string, userId: string): Promise<LibraryArtist | null> {
    return await this.prisma.client.libraryArtist.findFirst({
      where: {
        artistId,
        library: {
          userId,
        },
      },
    });
  }

  async getByLibraryId(
    libraryId: string,
    page: number,
    limit: number,
    filter?: LibraryArtistWhereInput,
    orderBy?: LibraryArtistOrderByWithRelationInput,
  ): Promise<LibraryArtist[]> {
    return await this.prisma.client.libraryArtist.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where: {
        ...filter,
        libraryId,
      },
      orderBy,
    });
  }

  async getAllByLibraryId(libraryId: string): Promise<LibraryArtist[]> {
    return await this.prisma.client.libraryArtist.findMany({
      where: { libraryId },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.libraryArtist.count({ where: { id } });
    return count > 0;
  }

  async existsInLibrary(libraryId: string, artistId: string): Promise<boolean> {
    const count = await this.prisma.client.libraryArtist.count({
      where: {
        libraryId,
        artistId,
      },
    });
    return count > 0;
  }

  async count(filter?: LibraryArtistWhereInput): Promise<number> {
    return await this.prisma.client.libraryArtist.count({ where: filter });
  }

  async countByLibraryId(libraryId: string): Promise<number> {
    return await this.prisma.client.libraryArtist.count({ where: { libraryId } });
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

  async deleteByLibraryIdAndArtistId(libraryId: string, artistId: string): Promise<LibraryArtist> {
    return await this.prisma.client.libraryArtist.delete({
      where: {
        libraryId_artistId: {
          libraryId,
          artistId,
        },
      },
    });
  }

  async deleteAllFromLibrary(libraryId: string): Promise<void> {
    await this.prisma.client.libraryArtist.deleteMany({
      where: { libraryId },
    });
  }
}
