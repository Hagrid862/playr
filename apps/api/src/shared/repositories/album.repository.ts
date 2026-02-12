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

@Injectable()
export class AlbumRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<Album | null> {
    return await this.prisma.client.album.findUnique({
      where: { id },
      include: {
        cover: true,
        artists: true,
      },
    });
  }

  async getByName(name: string): Promise<Album | null> {
    return await this.prisma.client.album.findFirst({
      where: { name },
      include: {
        cover: true,
        artists: true,
      },
    });
  }

  async getByNameAndOwnerId(name: string, ownerId: string): Promise<Album | null> {
    return await this.prisma.client.album.findFirst({
      where: {
        name,
        deletedAt: null,
        artists: {
          some: {
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
        },
      },
      include: {
        cover: true,
        artists: true,
      },
    });
  }

  async getByIdAndOwnerId(id: string, ownerId: string): Promise<Album | null> {
    return await this.prisma.client.album.findFirst({
      where: {
        id,
        deletedAt: null,
        artists: {
          some: {
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
        },
      },
      include: {
        cover: true,
        artists: true,
      },
    });
  }

  async getByIdDetailed(id: string): Promise<Album | null> {
    return await this.prisma.client.album.findUnique({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        cover: true,
        artists: true,
        tracks: {
          orderBy: {
            trackNumber: 'asc',
          },
          include: {
            artists: true,
          },
        },
      },
    });
  }

  async hasAccess(id: string, userId: string): Promise<boolean> {
    const album = await this.prisma.client.album.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          {
            libraryAlbums: {
              some: {
                library: {
                  userId,
                },
              },
            },
          },
          {
            artists: {
              some: {
                OR: [
                  { artistProfile: { userId } },
                  { communityProfile: { userId } },
                  {
                    privateArtistProfile: {
                      userPrivateProfile: {
                        userId,
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    return !!album;
  }

  async checkAccess(id: string, userId?: string): Promise<boolean> {
    const album = await this.prisma.client.album.findFirst({
      where: { id, deletedAt: null },
      select: {
        artists: {
          select: {
            artistProfile: { select: { id: true } },
            communityProfile: { select: { id: true } },
            privateArtistProfile: {
              select: {
                userPrivateProfile: {
                  select: {
                    userId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!album) return false;

    // An album is public if any of its artists is a Public Profile or Community Profile
    const isPublic = album.artists.some((a) => a.artistProfile || a.communityProfile);
    if (isPublic) return true;

    // If it's private, we must have a user and they must own one of the private profiles
    if (!userId) return false;

    return album.artists.some((a) => a.privateArtistProfile?.userPrivateProfile?.userId === userId);
  }

  async getPrivateByUserId(userId: string): Promise<Album[]> {
    return await this.prisma.client.album.findMany({
      where: {
        artists: {
          some: {
            privateArtistProfile: {
              userPrivateProfile: {
                userId,
              },
            },
          },
        },
        deletedAt: null,
      },
      include: {
        cover: true,
        artists: true,
      },
    });
  }

  async getByArtistId(artistId: string): Promise<Album[]> {
    return await this.prisma.client.album.findMany({
      where: {
        artists: {
          some: { id: artistId },
        },
        deletedAt: null,
      },
      include: {
        cover: true,
        artists: true,
      },
    });
  }

  async getByArtistIdAndUserId(artistId: string, userId: string): Promise<Album[]> {
    return await this.prisma.client.album.findMany({
      where: {
        artists: {
          some: {
            id: artistId,
            OR: [
              { artistProfile: { userId } },
              { communityProfile: { userId } },
              {
                privateArtistProfile: {
                  userPrivateProfile: {
                    userId,
                  },
                },
              },
            ],
          },
        },
        deletedAt: null,
      },
      include: {
        cover: true,
        artists: true,
      },
    });
  }

  async getPaginated(
    page: number,
    limit: number,
    filter?: AlbumWhereInput,
    orderBy?: AlbumOrderByWithRelationInput,
  ): Promise<Album[]> {
    return await this.prisma.client.album.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where: {
        ...filter,
        deletedAt: null,
      },
      include: {
        cover: true,
        artists: true,
      },
      orderBy,
    });
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
    return await this.prisma.client.album.create({ data });
  }

  async createMany(data: AlbumCreateManyInput[]): Promise<Album[]> {
    return await this.prisma.client.album.createManyAndReturn({ data });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: AlbumUpdateInput): Promise<Album> {
    return await this.prisma.client.album.update({ where: { id }, data });
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
