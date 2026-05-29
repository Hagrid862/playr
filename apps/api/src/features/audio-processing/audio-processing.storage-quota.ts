import { AccessRole, Prisma, ProcessingStatus } from '@repo/db';
import { LOSSLESS_QUALITY_PRESET, TRANSCRIPTION_QUALITIES } from './audio-processing.constants';

export function buildCountableAudioFileWhere(): Prisma.AudioFileWhereInput {
  const countableProcessed = [
    ...TRANSCRIPTION_QUALITIES.filter((p) => p.countsTowardStorageQuota),
    LOSSLESS_QUALITY_PRESET,
  ].map((p) => ({ quality: p.quality, format: p.format }));

  return {
    OR: [
      { isOriginal: true },
      {
        isOriginal: false,
        status: ProcessingStatus.complete,
        OR: countableProcessed,
      },
    ],
  };
}

export function buildOwnerScopedCountableAudioFileWhere(
  ownerUserId: string,
): Prisma.AudioFileWhereInput {
  return {
    ...buildCountableAudioFileWhere(),
    track: {
      deletedAt: null,
      access: {
        some: {
          userId: ownerUserId,
          role: AccessRole.owner,
        },
      },
    },
  };
}
