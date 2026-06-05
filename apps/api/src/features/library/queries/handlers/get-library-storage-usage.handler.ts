import { LibraryRepository } from '@/shared/repositories/library.repository';
import { LibraryStorageQuotaService } from '@/shared/services/library-storage-quota.service';
import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { LibraryStorageUsage } from '@repo/contracts';
import { GetLibraryStorageUsageQuery } from '../impl/get-library-storage-usage.query';

@QueryHandler(GetLibraryStorageUsageQuery)
export class GetLibraryStorageUsageHandler implements IQueryHandler<GetLibraryStorageUsageQuery> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly storageQuotaService: LibraryStorageQuotaService,
  ) {}

  async execute(query: GetLibraryStorageUsageQuery): Promise<LibraryStorageUsage> {
    const { userId } = query;

    const library = await this.libraryRepository.getByUserId(userId);
    if (!library) {
      throw new NotFoundException('Library not found');
    }

    return this.storageQuotaService.getUsage(userId);
  }
}
