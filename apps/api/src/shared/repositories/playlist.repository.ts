import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, Playlist, PlaylistSidebarPin, PlaylistSystemRole } from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class PlaylistRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveLibraryPlaylist(
    playlistId: string,
    libraryId: string,
  ): Promise<Playlist | null> {
    return this.prisma.client.playlist.findFirst({
      where: { id: playlistId, libraryId, deletedAt: null },
    });
  }

  async findFavoritesPlaylist(libraryId: string): Promise<Playlist | null> {
    return this.prisma.client.playlist.findFirst({
      where: {
        libraryId,
        systemRole: PlaylistSystemRole.favorites,
        deletedAt: null,
      },
    });
  }

  async countActiveTracks(playlistId: string): Promise<number> {
    return this.prisma.client.playlistTrack.count({
      where: { playlistId, deletedAt: null },
    });
  }

  async listLibraryPlaylistsWithCover(libraryId: string): Promise<
    (Playlist & {
      cover: Prisma.ImageGetPayload<object> | null;
      _count: { tracks: number };
    })[]
  > {
    return this.prisma.client.playlist.findMany({
      where: { libraryId, deletedAt: null },
      include: {
        cover: true,
        _count: {
          select: {
            tracks: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  async listActivePinsForLibrary(libraryId: string): Promise<
    (PlaylistSidebarPin & {
      playlist: Playlist & { cover: Prisma.ImageGetPayload<object> | null };
    })[]
  > {
    return this.prisma.client.playlistSidebarPin.findMany({
      where: {
        libraryId,
        deletedAt: null,
        playlist: { deletedAt: null },
      },
      orderBy: { order: 'asc' },
      include: {
        playlist: { include: { cover: true } },
      },
    });
  }

  async findActivePinById(pinId: string, libraryId: string): Promise<PlaylistSidebarPin | null> {
    return this.prisma.client.playlistSidebarPin.findFirst({
      where: { id: pinId, libraryId, deletedAt: null },
    });
  }

  async findActivePinByPlaylist(
    libraryId: string,
    playlistId: string,
  ): Promise<PlaylistSidebarPin | null> {
    return this.prisma.client.playlistSidebarPin.findFirst({
      where: { libraryId, playlistId, deletedAt: null },
    });
  }

  async createUserPlaylist(libraryId: string, name: string): Promise<Playlist> {
    return this.prisma.client.playlist.create({
      data: {
        name,
        library: { connect: { id: libraryId } },
      },
    });
  }

  async updatePlaylistName(playlistId: string, name: string): Promise<Playlist> {
    return this.prisma.client.playlist.update({
      where: { id: playlistId },
      data: { name },
    });
  }

  async softDeletePlaylist(playlistId: string): Promise<Playlist> {
    return this.prisma.client.playlist.update({
      where: { id: playlistId },
      data: { deletedAt: new Date() },
    });
  }

  async getPlaylistDetailPage(
    playlistId: string,
    libraryId: string,
    page: number,
    limit: number,
  ): Promise<{
    playlist: Playlist & { cover: Prisma.ImageGetPayload<object> | null };
    trackRows: Prisma.PlaylistTrackGetPayload<{
      include: {
        track: {
          include: {
            artists: { where: { deletedAt: null } };
            album: { include: { cover: true } };
            genres: { include: { genre: true } };
          };
        };
      };
    }>[];
    totalTracks: number;
  } | null> {
    const trackInclude = {
      track: {
        include: {
          artists: { where: { deletedAt: null } },
          album: { include: { cover: true } },
          genres: { include: { genre: true } },
        },
      },
    } satisfies Prisma.PlaylistTrackInclude;

    const playlist = await this.prisma.client.playlist.findFirst({
      where: { id: playlistId, libraryId, deletedAt: null },
      include: { cover: true },
    });
    if (!playlist) {
      return null;
    }
    const totalTracks = await this.prisma.client.playlistTrack.count({
      where: { playlistId, deletedAt: null },
    });
    const trackRows = await this.prisma.client.playlistTrack.findMany({
      where: { playlistId, deletedAt: null },
      orderBy: { order: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: trackInclude,
    });
    return { playlist, trackRows, totalTracks };
  }

  async addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
    const existing = await this.prisma.client.playlistTrack.findUnique({
      where: {
        playlistId_trackId: { playlistId, trackId },
      },
    });
    const maxOrderAgg = await this.prisma.client.playlistTrack.aggregate({
      where: { playlistId, deletedAt: null },
      _max: { order: true },
    });
    const nextOrder = (maxOrderAgg._max.order ?? -1) + 1;
    const now = new Date();
    if (existing) {
      if (existing.deletedAt) {
        await this.prisma.client.playlistTrack.update({
          where: { id: existing.id },
          data: { deletedAt: null, order: nextOrder, addedAt: now },
        });
      }
      return;
    }
    await this.prisma.client.playlistTrack.create({
      data: {
        playlistId,
        trackId,
        order: nextOrder,
        addedAt: now,
      },
    });
  }

  async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
    const row = await this.prisma.client.playlistTrack.findUnique({
      where: {
        playlistId_trackId: { playlistId, trackId },
      },
    });
    if (!row || row.deletedAt) {
      return;
    }
    await this.prisma.client.playlistTrack.update({
      where: { id: row.id },
      data: { deletedAt: new Date() },
    });
  }

  async isTrackInFavoritesPlaylist(libraryId: string, trackId: string): Promise<boolean> {
    const fav = await this.findFavoritesPlaylist(libraryId);
    if (!fav) {
      return false;
    }
    const row = await this.prisma.client.playlistTrack.findFirst({
      where: {
        playlistId: fav.id,
        trackId,
        deletedAt: null,
      },
    });
    return !!row;
  }

  async setFavoritesMembership(libraryId: string, trackId: string, favorited: boolean): Promise<void> {
    const fav = await this.findFavoritesPlaylist(libraryId);
    if (!fav) {
      return;
    }
    if (favorited) {
      await this.addTrackToPlaylist(fav.id, trackId);
    } else {
      await this.removeTrackFromPlaylist(fav.id, trackId);
    }
  }

  async createPin(libraryId: string, playlistId: string, order: number): Promise<PlaylistSidebarPin> {
    return this.prisma.client.playlistSidebarPin.create({
      data: {
        libraryId,
        playlistId,
        order,
      },
    });
  }

  /**
   * Creates a new sidebar pin or restores a soft-deleted pin for the same
   * (libraryId, playlistId). Required because @@unique([libraryId, playlistId])
   * prevents inserting a second row after unpin.
   */
  async pinPlaylist(libraryId: string, playlistId: string, order: number): Promise<PlaylistSidebarPin> {
    const row = await this.prisma.client.playlistSidebarPin.findFirst({
      where: { libraryId, playlistId },
    });
    if (row) {
      if (row.deletedAt === null) {
        throw new ConflictException('Playlist is already pinned');
      }
      return this.prisma.client.playlistSidebarPin.update({
        where: { id: row.id },
        data: { deletedAt: null, order },
      });
    }
    return this.createPin(libraryId, playlistId, order);
  }

  async maxPinOrder(libraryId: string): Promise<number> {
    const agg = await this.prisma.client.playlistSidebarPin.aggregate({
      where: { libraryId, deletedAt: null },
      _max: { order: true },
    });
    return agg._max.order ?? -1;
  }

  async softDeletePin(pinId: string): Promise<PlaylistSidebarPin> {
    return this.prisma.client.playlistSidebarPin.update({
      where: { id: pinId },
      data: { deletedAt: new Date() },
    });
  }

  async reorderPins(libraryId: string, orderedPinIds: string[]): Promise<void> {
    await this.prisma.mainClient.$transaction(
      orderedPinIds.map((id, index) =>
        this.prisma.client.playlistSidebarPin.updateMany({
          where: { id, libraryId, deletedAt: null },
          data: { order: index },
        }),
      ),
    );
  }
}
