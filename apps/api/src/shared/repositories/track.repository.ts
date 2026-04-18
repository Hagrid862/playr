import { Injectable } from '@nestjs/common';
import {
    Track,
    TrackCreateInput,
    TrackOrderByWithRelationInput,
    TrackUpdateInput,
    TrackWhereInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

export const DEFAULT_TRACK_INCLUDE = {
  artists: true,
  album: true,
  access: true,
  genres: { include: { genre: true } },
} as const;

@Injectable()
export class TrackRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async findOne(where: TrackWhereInput, includeRelations = false): Promise<Track | null> {
    return await this.prisma.client.track.findFirst({
      where: { ...where, deletedAt: null },
      include: includeRelations ? DEFAULT_TRACK_INCLUDE : undefined,
    });
  }

  async findMany(options: {
    where?: TrackWhereInput;
    take?: number;
    skip?: number;
    orderBy?: TrackOrderByWithRelationInput;
    includeRelations?: boolean;
  }): Promise<Track[]> {
    const includeRelations = options.includeRelations ?? true;
    return await this.prisma.client.track.findMany({
      take: options.take,
      skip: options.skip,
      where: {
        ...options.where,
        deletedAt: null,
      },
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      ...(includeRelations ? { include: DEFAULT_TRACK_INCLUDE } : {}),
    });
  }

  async checkAccess(id: string, userId?: string): Promise<boolean> {
    const guestId = 'GUEST';
    const activeUserId = userId ?? guestId;

    const track = await this.prisma.client.track.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          // 1. Is it Public?
          { visibility: 'public' },
          // 2. Direct Track Access?
          {
            access: {
              some: { userId: activeUserId },
            },
          },
          // 3. Inherited Album Access?
          {
            album: {
              access: {
                some: { userId: activeUserId },
              },
            },
          },
          // 4. Inherited Artist Access?
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

    return !!track;
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: TrackCreateInput, options?: { includeRelations?: boolean }): Promise<Track> {
    const includeRelations = options?.includeRelations ?? true;
    return await this.prisma.client.track.create({
      data,
      ...(includeRelations ? { include: DEFAULT_TRACK_INCLUDE } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(
    id: string,
    data: TrackUpdateInput,
    options?: { includeRelations?: boolean },
  ): Promise<Track> {
    const includeRelations = options?.includeRelations ?? true;
    return await this.prisma.client.track.update({
      where: { id },
      data,
      ...(includeRelations ? { include: DEFAULT_TRACK_INCLUDE } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  async delete(id: string): Promise<Track> {
    return await this.prisma.client.track.delete({ where: { id } });
  }
}
