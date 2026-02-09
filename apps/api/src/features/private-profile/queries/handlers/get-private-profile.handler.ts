import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserPrivateProfile } from '@repo/db';
import { GetPrivateProfileQuery } from '../impl/get-private-profile.query';
import { PrivateProfileRepository } from './../../../../shared/repositories/private-profile.repository';

@QueryHandler(GetPrivateProfileQuery)
export class GetPrivateProfileHandler implements IQueryHandler<GetPrivateProfileQuery> {
  constructor(private readonly privateProfileRepository: PrivateProfileRepository) { }

  async execute(query: GetPrivateProfileQuery): Promise<UserPrivateProfile | null> {
    const { userId } = query;

    const privateProfile = await this.privateProfileRepository.getByUserId(userId);

    return privateProfile;
  }
}
