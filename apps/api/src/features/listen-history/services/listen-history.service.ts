import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/shared/services/prisma.service';

const LISTEN_COOLDOWN_MS = 30000; // 30-second cooldown
const MAX_HISTORY_LIMIT = 4096;

@Injectable()
export class ListenHistoryService {
  private readonly logger = new Logger(ListenHistoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordListen(userId: string, trackId: string, bypassCooldown = false): Promise<void> {
    try {
      // 1. Check for duplicate/resume within 30s cooldown
      if (!bypassCooldown) {
        const latest = await this.prisma.client.listenHistory.findFirst({
          where: { userId, deletedAt: null },
          orderBy: { listenedAt: 'desc' },
        });

        if (
          latest &&
          latest.trackId === trackId &&
          Date.now() - latest.listenedAt.getTime() < LISTEN_COOLDOWN_MS
        ) {
          return; // Skip duplicate / resume within cooldown
        }
      }

      // 2. Insert new record
      await this.prisma.client.listenHistory.create({
        data: {
          userId,
          trackId,
          completed: false,
        },
      });

      // 3. Keep latest 4096 songs only - run cleanup check probabilistically (5% chance)
      if (Math.random() < 0.05) {
        const count = await this.prisma.client.listenHistory.count({
          where: { userId, deletedAt: null },
        });

        const CLEANUP_TRIGGER_LIMIT = MAX_HISTORY_LIMIT + 100;
        if (count > CLEANUP_TRIGGER_LIMIT) {
          const boundaryEntry = await this.prisma.client.listenHistory.findFirst({
            where: { userId, deletedAt: null },
            orderBy: { listenedAt: 'desc' },
            skip: MAX_HISTORY_LIMIT - 1,
          });

          if (boundaryEntry) {
            await this.prisma.client.listenHistory.deleteMany({
              where: {
                userId,
                deletedAt: null,
                listenedAt: {
                  lt: boundaryEntry.listenedAt,
                },
              },
            });
          }
        }
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to record listen history: ${err.message}`, err.stack);
    }
  }

  async getListenHistory(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.client.listenHistory.findMany({
        where: { userId, deletedAt: null },
        orderBy: { listenedAt: 'desc' },
        skip,
        take: limit,
        include: {
          track: {
            include: {
              artists: true,
              album: {
                include: {
                  cover: true,
                },
              },
              genres: { include: { genre: true } },
            },
          },
        },
      }),
      this.prisma.client.listenHistory.count({
        where: { userId, deletedAt: null },
      }),
    ]);

    return {
      items: items.map((item) => {
        const coverArtUrl = item.track.album?.cover?.url ?? null;
        return {
          id: item.id,
          listenedAt: item.listenedAt.toISOString(),
          durationMs: item.durationMs,
          completed: item.completed,
          track: {
            id: item.track.id,
            title: item.track.title,
            trackNumber: item.track.trackNumber,
            diskNumber: item.track.diskNumber,
            duration: item.track.duration,
            listenedCount: item.track.listenedCount,
            explicit: item.track.explicit,
            lyrics: item.track.lyrics,
            visibility: item.track.visibility,
            albumId: item.track.albumId,
            artists: item.track.artists.map((a) => ({
              id: a.id,
              name: a.name,
              description: a.description,
              isCommunity: a.isCommunity,
              verified: a.verified,
              bannerId: a.bannerId,
              avatarId: a.avatarId,
              visibility: a.visibility,
              createdAt: a.createdAt.toISOString(),
              updatedAt: a.updatedAt.toISOString(),
              deletedAt: a.deletedAt?.toISOString() ?? null,
            })),
            album: item.track.album
              ? {
                  id: item.track.album.id,
                  name: item.track.album.name,
                  description: item.track.album.description,
                  type: item.track.album.type,
                  systemKind: item.track.album.systemKind,
                  totalTracks: item.track.album.totalTracks,
                  totalDuration: item.track.album.totalDuration,
                  releaseDate: item.track.album.releaseDate?.toISOString() ?? null,
                  libraryId: item.track.album.libraryId,
                  coverId: item.track.album.coverId,
                  visibility: item.track.album.visibility,
                  createdAt: item.track.album.createdAt.toISOString(),
                  updatedAt: item.track.album.updatedAt.toISOString(),
                  deletedAt: item.track.album.deletedAt?.toISOString() ?? null,
                  cover: item.track.album.cover
                    ? {
                        id: item.track.album.cover.id,
                        alt: item.track.album.cover.alt,
                        bucket: item.track.album.cover.bucket,
                        key: item.track.album.cover.key,
                        url: item.track.album.cover.url,
                        mimeType: item.track.album.cover.mimeType,
                        blurhash: item.track.album.cover.blurhash,
                        reportId: item.track.album.cover.reportId,
                        uploadStatus: item.track.album.cover.uploadStatus,
                        createdAt: item.track.album.cover.createdAt.toISOString(),
                        updatedAt: item.track.album.cover.updatedAt.toISOString(),
                        deletedAt: item.track.album.cover.deletedAt?.toISOString() ?? null,
                      }
                    : null,
                }
              : undefined,
            albumArt: coverArtUrl,
            createdAt: item.track.createdAt.toISOString(),
            updatedAt: item.track.updatedAt.toISOString(),
            deletedAt: item.track.deletedAt?.toISOString() ?? null,
          },
        };
      }),
      total,
      page,
      limit,
    };
  }
}
