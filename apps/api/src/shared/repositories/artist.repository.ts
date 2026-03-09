import { Injectable } from '@nestjs/common';
import {
  Artist,
  ArtistCreateInput,
  ArtistCreateManyInput,
  ArtistOrderByWithRelationInput,
  ArtistUpdateInput,
  ArtistWhereInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class ArtistRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async findOne(where: ArtistWhereInput): Promise<Artist | null> {
    return await this.prisma.client.artist.findFirst({
      where: { ...where, deletedAt: null },
      include: { avatar: true, banner: true },
    });
  }

  async findMany(options: {
    where?: ArtistWhereInput;
    take?: number;
    skip?: number;
    orderBy?: ArtistOrderByWithRelationInput;
  }): Promise<Artist[]> {
    return await this.prisma.client.artist.findMany({
      where: { ...options.where, deletedAt: null },
      take: options.take,
      skip: options.skip,
      include: { avatar: true, banner: true },
      orderBy: options.orderBy ?? { createdAt: 'desc' },
    });
  }

  async checkAccess(id: string, userId?: string): Promise<boolean> {
    const guestId = 'GUEST';
    const activeUserId = userId ?? guestId;

    const artist = await this.prisma.client.artist.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { visibility: 'public' },
          {
            access: {
              some: { userId: activeUserId },
            },
          },
        ],
      },
      select: { id: true },
    });

    return !!artist;
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.artist.count({ where: { id } });
    return count > 0;
  }

  async count(filter?: ArtistWhereInput): Promise<number> {
    return await this.prisma.client.artist.count({
      where: {
        ...filter,
        deletedAt: null,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: ArtistCreateInput): Promise<Artist> {
    return await this.prisma.client.artist.create({ data });
  }

  async createMany(data: ArtistCreateManyInput[]): Promise<Artist[]> {
    return await this.prisma.client.artist.createManyAndReturn({ data });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: ArtistUpdateInput): Promise<Artist> {
    return await this.prisma.client.artist.update({ where: { id }, data });
  }

  async updateMany(updates: { id: string; data: ArtistUpdateInput }[]): Promise<Artist[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) => this.prisma.client.artist.update({ where: { id }, data })),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  async delete(id: string): Promise<Artist> {
    return await this.prisma.client.artist.delete({ where: { id } });
  }

  async deleteMany(filter: ArtistWhereInput): Promise<Artist[]> {
    const artistsToDelete = await this.prisma.client.artist.findMany({
      where: filter,
    });
    await this.prisma.client.artist.deleteMany({ where: filter });
    return artistsToDelete;
  }

  async softDeleteCascade(id: string): Promise<Artist> {
    // 1. Get albums to delete tracks first
    const albums = await this.prisma.client.album.findMany({
      where: {
        artists: { some: { id } },
        deletedAt: null,
      },
      select: { id: true },
    });

    const albumIds = albums.map((a) => a.id);

    // 2. Transaction: Mark artist, albums, and tracks as deleted
    const [deletedArtist] = await this.prisma.mainClient.$transaction([
      this.prisma.client.artist.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
      this.prisma.client.album.updateMany({
        where: { id: { in: albumIds } },
        data: { deletedAt: new Date() },
      }),
      this.prisma.client.track.updateMany({
        where: { albumId: { in: albumIds } },
        data: { deletedAt: new Date() },
      }),
    ]);

    return deletedArtist;
  }
}
