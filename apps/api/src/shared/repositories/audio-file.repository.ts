import { Injectable } from '@nestjs/common';
import {
  AudioFileCreateInput,
  AudioFileInclude,
  AudioFileGetPayload,
  AudioFileOrderByWithRelationInput,
  AudioFileUpdateInput,
  AudioFileWhereInput,
  AudioFileCreateManyInput,
} from '@repo/db';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class AudioFileRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // QUERIES
  // ─────────────────────────────────────────────────────────────

  /**
   * Finds a single audio file by the given where clause.
   * @param where - The where clause to filter the audio files.
   * @param include - The relations to include in the result.
   * @returns The found audio file.
   */
  async findOne<I extends AudioFileInclude>(
    where: AudioFileWhereInput,
    include?: I,
  ): Promise<AudioFileGetPayload<{ include: I }> | null> {
    return await this.prisma.client.audioFile.findFirst({
      where: { ...where, deletedAt: null },
      include: include ?? { track: true },
    });
  }

  /**
   * Finds multiple audio files by the given where clause.
   * @param where - The where clause to filter the audio files.
   * @param options - The options for the query.
   * @param include - The relations to include in the result.
   * @returns The found audio files.
   */
  async findMany<I extends AudioFileInclude>(
    where?: AudioFileWhereInput,
    options: {
      take?: number;
      skip?: number;
      orderBy?: AudioFileOrderByWithRelationInput;
    },
    include?: I,
  ): Promise<AudioFileGetPayload<{ include: I }>[]> {
    return await this.prisma.client.audioFile.findMany({
      take: options.take ?? 10,
      skip: options.skip ?? 0,
      where: { ...where, deletedAt: null },
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      include: include ?? { track: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTS & COUNT
  // ─────────────────────────────────────────────────────────────

  /**
   * Checks if an audio file exists by the given where conditions.
   * @param where - The where conditions to filter the audio files by.
   * @returns True if the audio file exists, false otherwise.
   */
  async exists(where: AudioFileWhereInput): Promise<boolean> {
    const count = await this.prisma.client.audioFile.count({
      where: { ...where, deletedAt: null },
    });
    return count > 0;
  }

  /**
   * Counts the number of audio files by the given where conditions.
   * @param where - The where conditions to filter the audio files by.
   * @returns The number of audio files.
   */
  async count(where?: AudioFileWhereInput): Promise<number> {
    return await this.prisma.client.audioFile.count({ where: { ...where, deletedAt: null } });
  }

  /**
   * Checks if a user has access to an audio file by the given ID.
   * @param where - The where conditions to filter the audio files by.
   * @param userId - The ID of the user to check access for.
   * @returns True if the user has access, false otherwise.
   */
  async checkAccess(where: AudioFileWhereInput, userId?: string): Promise<boolean> {
    const guestId = 'GUEST';
    const activeUserId = userId ?? guestId;

    const audioFile = await this.prisma.client.audioFile.findFirst({
      where: { ...where, deletedAt: null },
      include: {
        track: {
          include: {
            access: true,
            album: { include: { access: true } },
            artists: { include: { access: true } },
          },
        },
      },
    });

    if (!audioFile) return false;
    if (audioFile.track.access.some((access) => access.userId === activeUserId)) return true;
    if (audioFile.track.album?.access.some((access) => access.userId === activeUserId)) return true;
    if (
      audioFile.track.artists?.some((artist) =>
        artist.access.some((access) => access.userId === activeUserId),
      )
    )
      return true;
    return false;
  }

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Creates a new audio file.
   * @param data - The data to create the audio file.
   * @param include - The relations to include in the result.
   * @returns The created audio file.
   */
  async create<I extends AudioFileInclude>(
    data: AudioFileCreateInput,
    include?: I,
  ): Promise<AudioFileGetPayload<{ include: I }>> {
    return await this.prisma.client.audioFile.create({ data, include: include ?? { track: true } });
  }

  /**
   * Creates multiple audio files.
   * @param data - The data to create the audio files.
   * @param include - The relations to include in the result.
   * @returns The created audio files.
   */
  async createMany<I extends AudioFileInclude>(
    data: AudioFileCreateManyInput[],
    include?: I,
  ): Promise<AudioFileGetPayload<{ include: I }>[]> {
    return await this.prisma.client.audioFile.createManyAndReturn({
      data,
      include: include ?? { track: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────

  /**
   * Updates an audio file by the given ID.
   * @param id - The ID of the audio file to update.
   * @param data - The data to update the audio file.
   * @param include - The relations to include in the result.
   * @returns The updated audio file.
   */
  async update<I extends AudioFileInclude>(
    id: string,
    data: AudioFileUpdateInput,
    include?: I,
  ): Promise<AudioFileGetPayload<{ include: I }>> {
    return await this.prisma.client.audioFile.update({
      where: { id },
      data,
      include: include ?? { track: true },
    });
  }

  /**
   * Updates multiple audio files by the given IDs.
   * @param updates - The updates to update the audio files.
   * @param include - The relations to include in the result.
   * @returns The updated audio files.
   */
  async updateMany<I extends AudioFileInclude>(
    updates: { id: string; data: AudioFileUpdateInput }[],
    include?: I,
  ): Promise<AudioFileGetPayload<{ include: I }>[]> {
    return await this.prisma.mainClient.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.client.audioFile.update({
          where: { id },
          data,
          include: include ?? { track: true },
        }),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  /**
   * Deletes an audio file by the given ID.
   * @param id - The ID of the audio file to delete.
   * @param include - The relations to include in the result.
   * @returns The deleted audio file.
   */
  async delete<I extends AudioFileInclude>(
    id: string,
    include?: I,
  ): Promise<AudioFileGetPayload<{ include: I }>> {
    return await this.prisma.client.audioFile.delete({
      where: { id },
      include: include ?? { track: true },
    });
  }

  /**
   * Deletes multiple audio files by the given where clause.
   * @param where - The where clause to filter the audio files.
   * @param include - The relations to include in the result.
   * @returns The deleted audio files.
   */
  async deleteMany<I extends AudioFileInclude>(
    where?: AudioFileWhereInput,
    include?: I,
  ): Promise<AudioFileGetPayload<{ include: I }>[]> {
    const audioFilesToDelete = await this.prisma.client.audioFile.findMany({
      where: { ...where, deletedAt: null },
      include: include ?? { track: true },
    });
    if (audioFilesToDelete.length === 0) return [];

    await this.prisma.client.audioFile.deleteMany({
      where: { id: { in: audioFilesToDelete.map((audioFile) => audioFile.id) } },
    });

    return audioFilesToDelete;
  }

  // ─────────────────────────────────────────────────────────────
  // SOFT DELETE
  // ─────────────────────────────────────────────────────────────

  /**
   * Soft deletes an audio file by the given ID.
   * @param id - The ID of the audio file to soft delete.
   * @param include - The relations to include in the result.
   * @returns The deleted audio file.
   */
  async softDelete<I extends AudioFileInclude>(
    id: string,
    include?: I,
  ): Promise<AudioFileGetPayload<{ include: I }>> {
    return await this.prisma.client.audioFile.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: include ?? { track: true },
    });
  }

  /**
   * Soft deletes multiple audio files by the given where conditions.
   * @param where - The where conditions to filter the audio files by.
   * @param include - The relations to include in the result.
   * @returns The deleted audio files.
   */
  async softDeleteMany<I extends AudioFileInclude>(
    where: AudioFileWhereInput,
    include?: I,
  ): Promise<AudioFileGetPayload<{ include: I }>[]> {
    const audioFilesToDelete = await this.prisma.client.audioFile.findMany({
      where,
      include: include ?? { track: true },
    });
    if (audioFilesToDelete.length === 0) return [];

    const audioFileIds = audioFilesToDelete.map((audioFile) => audioFile.id);
    await this.prisma.client.audioFile.updateMany({
      where: { id: { in: audioFileIds } },
      data: { deletedAt: new Date() },
    });

    return await this.prisma.client.audioFile.findMany({
      where: { id: { in: audioFileIds } },
      include: include ?? { track: true },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // RESTORE
  // ─────────────────────────────────────────────────────────────

  /**
   * Restores a soft deleted audio file by the given ID.
   * @param id - The ID of the audio file to restore.
   * @param include - The relations to include in the result.
   * @returns The restored audio file.
   */
  async restore<I extends AudioFileInclude>(
    id: string,
    include?: I,
  ): Promise<AudioFileGetPayload<{ include: I }>> {
    return await this.prisma.client.audioFile.update({
      where: { id },
      data: { deletedAt: null },
      include: include ?? { track: true },
    });
  }

  /**
   * Restores multiple soft deleted audio files by the given where conditions.
   * @param where - The where conditions to filter the audio files by.
   * @param include - The relations to include in the result.
   * @returns The restored audio files.
   */
  async restoreMany<I extends AudioFileInclude>(
    where: AudioFileWhereInput,
    include?: I,
  ): Promise<AudioFileGetPayload<{ include: I }>[]> {
    const audioFilesToRestore = await this.prisma.client.audioFile.findMany({
      where,
      include: include ?? { track: true },
    });
    if (audioFilesToRestore.length === 0) return [];

    const audioFileIds = audioFilesToRestore.map((audioFile) => audioFile.id);
    await this.prisma.client.audioFile.updateMany({
      where: { id: { in: audioFileIds } },
      data: { deletedAt: null },
    });

    return await this.prisma.client.audioFile.findMany({
      where: { id: { in: audioFileIds } },
      include: include ?? { track: true },
    });
  }
}
