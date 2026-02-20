import { PrismaService } from '@/shared/services/prisma.service';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTrackStreamQualitiesResponse, StreamAudioQuality } from '@repo/contracts';
import { GetTrackStreamQualitiesQuery } from '../impl/get-track-stream-qualities.query';

@QueryHandler(GetTrackStreamQualitiesQuery)
export class GetTrackStreamQualitiesHandler implements IQueryHandler<GetTrackStreamQualitiesQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetTrackStreamQualitiesQuery,
  ): Promise<GetTrackStreamQualitiesResponse['data']> {
    const { id } = query;

    const audioFiles = await this.prisma.client.audioFile.findMany({
      where: {
        trackId: id,
        status: 'complete',
      },
      select: {
        quality: true,
        format: true,
      },
    });

    const availableQualities = new Set<StreamAudioQuality>();

    audioFiles.forEach((file) => {
      const q = file.quality?.toLowerCase();
      const format = file.format?.toLowerCase();

      if (q === 'lossless' || q === 'original' || format === 'flac') {
        availableQualities.add(StreamAudioQuality.lossless);
      }
      if (q === 'high') availableQualities.add(StreamAudioQuality.high);
      if (q === 'standard') availableQualities.add(StreamAudioQuality.standard);
      if (q === 'low') availableQualities.add(StreamAudioQuality.low);
    });

    const qualitiesArray = Array.from(availableQualities);
    return qualitiesArray;
  }
}
