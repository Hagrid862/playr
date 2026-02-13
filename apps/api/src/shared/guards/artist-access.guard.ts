import { CHECK_ARTIST_ACCESS_KEY } from '@/common/decorators/check-artist-access.decorator';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ArtistRepository } from '../repositories/artist.repository';

@Injectable()
export class ArtistAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly artistRepository: ArtistRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const paramName = this.reflector.get<string>(CHECK_ARTIST_ACCESS_KEY, context.getHandler());

    if (!paramName) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const artistId = request.params[paramName];
    const userId = request.user?.user?.id;

    if (!artistId) {
      return true;
    }

    const hasAccess = await this.artistRepository.checkAccess(artistId, userId);

    if (!hasAccess) {
      const exists = await this.artistRepository.exists(artistId);
      if (!exists) {
        throw new NotFoundException('Artist not found');
      }
      throw new ForbiddenException('You do not have access to this artist');
    }

    return true;
  }
}
