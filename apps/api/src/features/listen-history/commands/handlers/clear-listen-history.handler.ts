import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@/shared/services/prisma.service';
import { ClearListenHistoryCommand } from '../impl/clear-listen-history.command';

@CommandHandler(ClearListenHistoryCommand)
export class ClearListenHistoryHandler implements ICommandHandler<ClearListenHistoryCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ClearListenHistoryCommand) {
    const { userId } = command;
    await this.prisma.client.listenHistory.updateMany({
      where: { userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }
}
