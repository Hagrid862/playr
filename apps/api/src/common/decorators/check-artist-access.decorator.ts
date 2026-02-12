import { SetMetadata } from '@nestjs/common';

export const CHECK_ARTIST_ACCESS_KEY = 'check_artist_access';
export const CheckArtistAccess = (paramName: string = 'id') =>
  SetMetadata(CHECK_ARTIST_ACCESS_KEY, paramName);
