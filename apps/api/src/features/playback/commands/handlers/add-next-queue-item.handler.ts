import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { PlaybackState } from '@repo/contracts';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { requirePlaybackMutationExpectedVersion } from '../../utils/playback-mutation-guards';
import { SetNextQueueItemCommand } from '../impl/set-next-queue-item.command';

@CommandHandler(SetNextQueueItemCommand)
export class SetNextQueueItemHandler implements ICommandHandler<SetNextQueueItemCommand> {
  constructor(private readonly persistence: PlaybackStatePersistenceService) {}

  async execute(command: SetNextQueueItemCommand): Promise<PlaybackState> {
    const { track, expectedVersion } = command.request;

    requirePlaybackMutationExpectedVersion(expectedVersion);

    return this.persistence.applyMutation(command.userId, expectedVersion, (current) => {
      const ordered = [...current.queue].sort((a, b) => a.position - b.position);
      const maxOriginalPos = ordered.reduce(
        (max, item) => Math.max(max, item.originalPosition),
        -1,
      );
      const item = {
        ...track,
        type: 'playingNext' as const,
        originalPosition: track.originalPosition ?? maxOriginalPos + 1,
      };

      let combined: typeof ordered;
      if (current.shuffle) {
        combined = [item, ...ordered];
      } else {
        const manual = ordered.filter((q) => q.type === 'queue');
        const playingNext = ordered.filter((q) => q.type === 'playingNext');
        combined = [...manual, item, ...playingNext];
      }

      const queue = combined.map((q, idx) => ({ ...q, position: idx }));
      return { ...current, queue };
    });
  }
}
