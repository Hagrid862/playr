import { TrackRepository } from '@/shared/repositories/track.repository';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TrackSchema, ZodTrack } from '@repo/contracts';
import { GetLibraryTrackQuery } from '../impl/get-library-track.query';
import { z } from 'zod';

@QueryHandler(GetLibraryTrackQuery)
export class GetLibraryTrackHandler implements IQueryHandler<GetLibraryTrackQuery> {
  constructor(private readonly trackRepository: TrackRepository) {}

  async execute(query: GetLibraryTrackQuery): Promise<ZodTrack> {
    const { id } = query;

    const track = await this.trackRepository.findOneWithInclude(
      { id },
      { artists: true, album: { include: { cover: true } } },
    );

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    const parsed = TrackSchema.safeParse(track);

    if (!parsed.success) {
      console.error(
        '[GetLibraryTrackHandler] Zod validation failed:',
        JSON.stringify(z.treeifyError(parsed.error), null, 2),
      );
      throw new InternalServerErrorException('Failed to parse track');
    }

    return parsed.data;
  }
}
