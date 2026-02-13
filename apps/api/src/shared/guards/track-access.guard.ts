import { CHECK_TRACK_ACCESS_KEY } from '@/common/decorators/check-track-access.decorator';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TrackRepository } from '../repositories/track.repository';

@Injectable()
export class TrackAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly trackRepository: TrackRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const paramName = this.reflector.get<string>(CHECK_TRACK_ACCESS_KEY, context.getHandler());

    if (!paramName) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const trackId = request.params[paramName];
    const userId = request.user?.user?.id;

    if (!trackId) {
      return true;
    }

    const hasAccess = await this.trackRepository.checkAccess(trackId, userId);

    if (!hasAccess) {
      const track = await this.trackRepository.findOne({ id: trackId });
      if (!track) {
        throw new NotFoundException('Track not found');
      }
      throw new ForbiddenException('You do not have access to this track');
    }

    return true;
  }
}
