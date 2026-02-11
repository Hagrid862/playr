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

  async getById(id: string): Promise<Artist | null> {
    return await this.prisma.client.artist.findUnique({
      where: { id },
      include: { avatar: true, banner: true },
    });
  }

  async getByName(name: string): Promise<Artist | null> {
    return await this.prisma.client.artist.findFirst({
      where: { name },
      include: { avatar: true, banner: true },
    });
  }

  async getByNameAndOwnerId(name: string, ownerId: string): Promise<Artist | null> {
    return await this.prisma.client.artist.findFirst({
      where: {
        name,
        deletedAt: null,
        OR: [
          { artistProfile: { id: ownerId } },
          { communityProfile: { id: ownerId } },
          {
            privateArtistProfile: {
              userPrivateProfile: {
                id: ownerId,
              },
            },
          },
        ],
      },
      include: { avatar: true, banner: true },
    });
  }

  async getByIdAndOwnerId(id: string, ownerId: string): Promise<Artist | null> {
    return await this.prisma.client.artist.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { artistProfile: { id: ownerId } },
          { communityProfile: { id: ownerId } },
          {
            privateArtistProfile: {
              userPrivateProfile: {
                id: ownerId,
              },
            },
          },
        ],
      },
      include: { avatar: true, banner: true },
    });
  }

  async getPrivateByUserId(userId: string): Promise<Artist[]> {
    return await this.prisma.client.artist.findMany({
      where: {
        privateArtistProfile: {
          userPrivateProfile: {
            userId,
          },
        },
        deletedAt: null,
      },
      include: { avatar: true, banner: true },
    });
  }

  async getPaginated(
    page: number,
    limit: number,
    filter?: ArtistWhereInput,
    orderBy?: ArtistOrderByWithRelationInput,
  ): Promise<Artist[]> {
    return await this.prisma.client.artist.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where: {
        ...filter,
        deletedAt: null,
      },
      include: { avatar: true, banner: true },
      orderBy,
    });
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
}
