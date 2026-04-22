import { CHECK_ALBUM_ACCESS_KEY } from '@/common/decorators/check-album-access.decorator';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AlbumRepository } from '../repositories/album.repository';

@Injectable()
export class AlbumAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly albumRepository: AlbumRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const paramName = this.reflector.get<string>(CHECK_ALBUM_ACCESS_KEY, context.getHandler());

    if (!paramName) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const albumId = request.params[paramName];
    const userId = request.user?.user?.id;

    if (!albumId) {
      return true;
    }

    const hasAccess = await this.albumRepository.checkAccess({ id: albumId }, userId);

    if (!hasAccess) {
      // We check if it exists at all to give a better error message.
      const exists = await this.albumRepository.exists({ id: albumId });
      if (!exists) {
        throw new NotFoundException('Album not found');
      }
      throw new ForbiddenException('You do not have access to this album');
    }

    return true;
  }
}
