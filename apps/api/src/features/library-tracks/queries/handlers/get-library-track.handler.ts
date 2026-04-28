import { TrackRepository } from '@/shared/repositories/track.repository';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TrackSchema, ZodTrack } from '@repo/contracts';
import { GetLibraryTrackQuery } from '../impl/get-library-track.query';

@QueryHandler(GetLibraryTrackQuery)
export class GetLibraryTrackHandler implements IQueryHandler<GetLibraryTrackQuery> {
  constructor(private readonly trackRepository: TrackRepository) {}

  async execute(query: GetLibraryTrackQuery): Promise<ZodTrack> {
    const { id } = query;

    const track = await this.trackRepository.getById(id, {
      include: {
        album: true,
        artists: true,
        genres: { include: { genre: true } },
      },
    });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    const parsed = TrackSchema.safeParse(track);

    if (!parsed.success) {
      console.error(
        '[GetLibraryTrackHandler] Zod validation failed:',
        JSON.stringify(parsed.error.format(), null, 2),
      );
      throw new InternalServerErrorException('Failed to parse track');
    }

    return parsed.data;
  }
}
