import { Injectable } from '@nestjs/common';
import {
  AudioFile,
  AudioFileCreateInput,
  AudioFileGetPayload,
  AudioFileOrderByWithRelationInput,
  AudioFileUpdateInput,
  AudioFileWhereInput,
  Prisma,
  ProcessingStatus,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

/**
 * AudioFile has no `deletedAt`; visibility matches {@link Track}: soft-deleted tracks
 * imply the file is treated as missing (same idea as `deletedAt` checks on other models).
 */
function mergeIncludeForAudioFileGetById(
  include?: Prisma.AudioFileInclude,
): Prisma.AudioFileInclude {
  if (!include) {
    return { track: { select: { deletedAt: true } } };
  }
  if (!include.track) {
    return { ...include, track: { select: { deletedAt: true } } };
  }
  if (include.track === true) {
    return include;
  }
  const track = include.track;
  if (typeof track === 'object' && track !== null && 'select' in track && track.select) {
    return {
      ...include,
      track: {
        ...track,
        select: { ...track.select, deletedAt: true },
      },
    };
  }
  return include;
}

@Injectable()
export class AudioFileRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  async getById(id: string): Promise<AudioFile | null>;
  async getById<T extends Prisma.AudioFileInclude>(
    id: string,
    options: { include: T },
  ): Promise<AudioFileGetPayload<{ include: T }> | null>;
  async getById(
    id: string,
    options?: { include: Prisma.AudioFileInclude },
  ): Promise<AudioFile | AudioFileGetPayload<{ include: Prisma.AudioFileInclude }> | null> {
    const include = mergeIncludeForAudioFileGetById(options?.include);
    const row = await this.prisma.client.audioFile.findUnique({
      where: { id },
      include,
    });
    if (!row?.track || row.track.deletedAt) {
      return null;
    }
    if (!options?.include?.track) {
      const { track: _t, ...rest } = row;
      return rest as AudioFile;
    }
    return row;
  }

  /** All audio files for a non-soft-deleted track, optionally filtered by processing status. */
  async listByTrackId(
    trackId: string,
    options?: {
      status?: ProcessingStatus;
      include?: Prisma.AudioFileInclude;
      orderBy?: AudioFileOrderByWithRelationInput;
    },
  ): Promise<AudioFile[]>;
  async listByTrackId<T extends Prisma.AudioFileInclude>(
    trackId: string,
    options: {
      status?: ProcessingStatus;
      include: T;
      orderBy?: AudioFileOrderByWithRelationInput;
    },
  ): Promise<AudioFileGetPayload<{ include: T }>[]>;
  async listByTrackId(
    trackId: string,
    options?: {
      status?: ProcessingStatus;
      include?: Prisma.AudioFileInclude;
      orderBy?: AudioFileOrderByWithRelationInput;
    },
  ): Promise<AudioFile[] | AudioFileGetPayload<{ include: Prisma.AudioFileInclude }>[]> {
    return await this.prisma.client.audioFile.findMany({
      where: {
        trackId,
        track: { deletedAt: null },
        ...(options?.status !== undefined ? { status: options.status } : {}),
      },
      ...(options?.include ? { include: options.include } : {}),
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
    });
  }

  async getPaginated(
    page: number,
    limit: number,
    filter?: AudioFileWhereInput,
    orderBy?: AudioFileOrderByWithRelationInput,
  ): Promise<AudioFile[]>;
  async getPaginated<T extends Prisma.AudioFileInclude>(
    page: number,
    limit: number,
    filter: AudioFileWhereInput | undefined,
    orderBy: AudioFileOrderByWithRelationInput | undefined,
    options: { include: T },
  ): Promise<AudioFileGetPayload<{ include: T }>[]>;
  async getPaginated(
    page: number,
    limit: number,
    filter?: AudioFileWhereInput,
    orderBy?: AudioFileOrderByWithRelationInput,
    options?: { include: Prisma.AudioFileInclude },
  ): Promise<AudioFile[] | AudioFileGetPayload<{ include: Prisma.AudioFileInclude }>[]> {
    return await this.prisma.client.audioFile.findMany({
      take: limit,
      skip: (page - 1) * limit,
      where: filter,
      orderBy,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────────────────────

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.audioFile.count({
      where: { id, track: { deletedAt: null } },
    });
    return count > 0;
  }

  async count(filter?: AudioFileWhereInput): Promise<number> {
    return await this.prisma.client.audioFile.count({
      where: filter,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  async create(data: AudioFileCreateInput): Promise<AudioFile>;
  async create<T extends Prisma.AudioFileInclude>(
    data: AudioFileCreateInput,
    options: { include: T },
  ): Promise<AudioFileGetPayload<{ include: T }>>;
  async create(
    data: AudioFileCreateInput,
    options?: { include: Prisma.AudioFileInclude },
  ): Promise<AudioFile | AudioFileGetPayload<{ include: Prisma.AudioFileInclude }>> {
    return await this.prisma.client.audioFile.create({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async createMany(data: Prisma.AudioFileCreateManyInput[]): Promise<AudioFile[]>;
  async createMany<T extends Prisma.AudioFileInclude>(
    data: Prisma.AudioFileCreateManyInput[],
    options: { include: T },
  ): Promise<AudioFileGetPayload<{ include: T }>[]>;
  async createMany(
    data: Prisma.AudioFileCreateManyInput[],
    options?: { include: Prisma.AudioFileInclude },
  ): Promise<
    AudioFile[] | AudioFileGetPayload<{ include: Prisma.AudioFileInclude }>[]
  > {
    return await this.prisma.client.audioFile.createManyAndReturn({
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  async update(id: string, data: AudioFileUpdateInput): Promise<AudioFile>;
  async update<T extends Prisma.AudioFileInclude>(
    id: string,
    data: AudioFileUpdateInput,
    options: { include: T },
  ): Promise<AudioFileGetPayload<{ include: T }>>;
  async update(
    id: string,
    data: AudioFileUpdateInput,
    options?: { include: Prisma.AudioFileInclude },
  ): Promise<AudioFile | AudioFileGetPayload<{ include: Prisma.AudioFileInclude }>> {
    return await this.prisma.client.audioFile.update({
      where: { id },
      data,
      ...(options?.include ? { include: options.include } : {}),
    });
  }

  async updateMany(
    updates: { id: string; data: AudioFileUpdateInput }[],
  ): Promise<AudioFile[]>;
  async updateMany<T extends Prisma.AudioFileInclude>(
    updates: { id: string; data: AudioFileUpdateInput }[],
    options: { include: T },
  ): Promise<AudioFileGetPayload<{ include: T }>[]>;
  async updateMany(
    updates: { id: string; data: AudioFileUpdateInput }[],
    options?: { include: Prisma.AudioFileInclude },
  ): Promise<
    AudioFile[] | AudioFileGetPayload<{ include: Prisma.AudioFileInclude }>[]
  > {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.audioFile.update({
          where: { id },
          data,
          ...(options?.include ? { include: options.include } : {}),
        }),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  async delete(id: string): Promise<AudioFile> {
    return await this.prisma.client.audioFile.delete({ where: { id } });
  }

  /** Hard-delete by primary keys only. No-op when `ids` is empty. */
  async deleteMany(ids: string[]): Promise<AudioFile[]> {
    if (ids.length === 0) {
      return [];
    }
    const audioFiles = await this.prisma.client.audioFile.findMany({
      where: { id: { in: ids } },
    });
    await this.prisma.client.audioFile.deleteMany({
      where: { id: { in: ids } },
    });
    return audioFiles;
  }
}
