import { CHECK_ALBUM_ACCESS_KEY } from '@/common/decorators/check-album-access.decorator';
import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
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
    const userId = request.user?.id;

    if (!albumId) {
      return true;
    }

    const hasAccess = await this.albumRepository.checkAccess(albumId, userId);

    if (!hasAccess) {
      throw new NotFoundException('Album not found');
    }

    return true;
  }
}
