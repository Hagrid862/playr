import { SetMetadata } from '@nestjs/common';

export const CHECK_TRACK_ACCESS_KEY = 'check_track_access';
export const CheckTrackAccess = (paramName: string = 'id') =>
  SetMetadata(CHECK_TRACK_ACCESS_KEY, paramName);
