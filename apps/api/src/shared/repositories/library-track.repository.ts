import { Injectable } from '@nestjs/common';
import {
  LibraryTrack,
  LibraryTrackCreateInput,
  LibraryTrackGetPayload,
  LibraryTrackOrderByWithRelationInput,
  LibraryTrackUpdateInput,
  LibraryTrackWhereInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class LibraryTrackRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async findOne(where: LibraryTrackWhereInput): Promise<LibraryTrackGetPayload<{
    include: { track: { include: { artists: true; album: true } } };
  }> | null> {
    const { track, ...rest } = where;
    return await this.prisma.client.libraryTrack.findFirst({
      where: {
        ...rest,
        track: {
          ...((track as object) || {}),
          deletedAt: null,
        },
      },
      include: {
        track: {
          include: {
            artists: true,
            album: true,
          },
        },
      },
    });
  }

  async findMany(options: {
    where?: LibraryTrackWhereInput;
    take?: number;
    skip?: number;
    orderBy?: LibraryTrackOrderByWithRelationInput | LibraryTrackOrderByWithRelationInput[];
  }): Promise<
    LibraryTrackGetPayload<{
      include: { track: { include: { artists: true; album: true } } };
    }>[]
  > {
    const { track, ...rest } = options.where || {};
    return await this.prisma.client.libraryTrack.findMany({
      take: options.take,
      skip: options.skip,
      where: {
        ...rest,
        track: {
          ...((track as object) || {}),
          deletedAt: null,
        },
      },
      include: {
        track: {
          include: {
            artists: true,
            album: true,
          },
        },
      },
      orderBy: options.orderBy,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

  async exists(where: LibraryTrackWhereInput): Promise<boolean> {
    const count = await this.prisma.client.libraryTrack.count({ where });
    return count > 0;
  }

  async count(where?: LibraryTrackWhereInput): Promise<number> {
    const { track, ...rest } = where || {};
    return await this.prisma.client.libraryTrack.count({
      where: {
        ...rest,
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

  async create(data: LibraryTrackCreateInput): Promise<LibraryTrack> {
    return await this.prisma.client.libraryTrack.create({ data });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: LibraryTrackUpdateInput): Promise<LibraryTrack> {
    return await this.prisma.client.libraryTrack.update({ data, where: { id } });
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  async delete(id: string): Promise<LibraryTrack> {
    return await this.prisma.client.libraryTrack.delete({ where: { id } });
  }

  async deleteMany(where: LibraryTrackWhereInput): Promise<void> {
    await this.prisma.client.libraryTrack.deleteMany({
      where,
    });
  }
}
