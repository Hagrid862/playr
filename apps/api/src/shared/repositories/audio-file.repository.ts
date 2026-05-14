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
  /**
   * Gets a single record by its ID.
   * @param id Record identifier.
   * @param options Optional include or query options.
   * @returns Matching record when found, otherwise null.
   */
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
      const { track, ...rest } = row;
      void track;
      return rest as AudioFile;
    }
    return row;
  }
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
  /**
   * Lists audio files for the provided track ID.
   * @param trackId trackId to match.
   * @param options Optional include or query options.
   * @returns Records that match the query criteria.
   */
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
  /**
   * Returns a paginated list of matching records.
   * @param page 1-based page index.
   * @param limit Maximum rows to return.
   * @param filter Filter criteria for matching rows.
   * @param orderBy Sort order for the query.
   * @param options Optional include or query options.
   * @returns Records that match the query criteria.
   */
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
  /**
   * Checks whether a matching record currently exists.
   * @param id Record identifier.
   * @returns True when a matching record exists.
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.client.audioFile.count({
      where: { id, track: { deletedAt: null } },
    });
    return count > 0;
  }
  /**
   * Counts records that match the provided filters.
   * @param filter Filter criteria for matching rows.
   * @returns Number of matching records.
   */
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
  /**
   * Creates a new record with the provided data.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created record. Includes related entities when `options.include` is provided.
   */
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
  /**
   * Creates multiple records in a single operation.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Created records. Includes related entities when `options.include` is provided.
   */
  async createMany(
    data: Prisma.AudioFileCreateManyInput[],
    options?: { include: Prisma.AudioFileInclude },
  ): Promise<AudioFile[] | AudioFileGetPayload<{ include: Prisma.AudioFileInclude }>[]> {
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
  /**
   * Updates an existing record with the provided data.
   * @param id Record identifier.
   * @param data Data payload to persist.
   * @param options Optional include or query options.
   * @returns Updated record. Includes related entities when `options.include` is provided.
   * @throws Error if no matching record is found for this strict write operation.
   */
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
  async updateMany(updates: { id: string; data: AudioFileUpdateInput }[]): Promise<AudioFile[]>;
  async updateMany<T extends Prisma.AudioFileInclude>(
    updates: { id: string; data: AudioFileUpdateInput }[],
    options: { include: T },
  ): Promise<AudioFileGetPayload<{ include: T }>[]>;
  /**
   * Updates multiple existing records in a single operation.
   * @param updates List of record IDs and update payloads to apply.
   * @param options Optional include or query options.
   * @returns Updated records. Includes related entities when `options.include` is provided.
   */
  async updateMany(
    updates: { id: string; data: AudioFileUpdateInput }[],
    options?: { include: Prisma.AudioFileInclude },
  ): Promise<AudioFile[] | AudioFileGetPayload<{ include: Prisma.AudioFileInclude }>[]> {
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
  /**
   * Permanently deletes a single record by ID.
   * @param id Record identifier.
   * @returns Deleted record.
   * @throws Error if no matching record is found for this strict write operation.
   * @warning Permanently deletes records, including soft-deleted rows.
   */
  async delete(id: string): Promise<AudioFile> {
    return await this.prisma.client.audioFile.delete({ where: { id } });
  }
  /**
   * Permanently deletes multiple records by their IDs.
   * @param ids Record identifiers to match.
   * @returns Pre-delete snapshots of deleted records.
   * @warning Permanently deletes records, including soft-deleted rows.
   */
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
