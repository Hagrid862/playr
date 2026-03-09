import { Injectable } from '@nestjs/common';
import {
  Track,
  TrackCreateInput,
  TrackOrderByWithRelationInput,
  TrackUpdateInput,
  TrackWhereInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class TrackRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async findOne(where: TrackWhereInput, includeRelations = false): Promise<Track | null> {
    return await this.prisma.client.track.findFirst({
      where: { ...where, deletedAt: null },
      include: includeRelations ? { artists: true, album: true, access: true } : undefined,
    });
  }

  async findMany(options: {
    where?: TrackWhereInput;
    take?: number;
    skip?: number;
    orderBy?: TrackOrderByWithRelationInput;
  }): Promise<Track[]> {
    return await this.prisma.client.track.findMany({
      take: options.take,
      skip: options.skip,
      where: {
        ...options.where,
        deletedAt: null,
      },
      orderBy: options.orderBy ?? { createdAt: 'desc' },
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

  async create(data: TrackCreateInput): Promise<Track> {
    return await this.prisma.client.track.create({ data });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: TrackUpdateInput): Promise<Track> {
    return await this.prisma.client.track.update({ where: { id }, data });
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  async delete(id: string): Promise<Track> {
    return await this.prisma.client.track.delete({ where: { id } });
  }
}
