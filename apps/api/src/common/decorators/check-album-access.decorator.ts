import { SetMetadata } from '@nestjs/common';

export const CHECK_ALBUM_ACCESS_KEY = 'check_album_access';
export const CheckAlbumAccess = (paramName: string = 'id') =>
  SetMetadata(CHECK_ALBUM_ACCESS_KEY, paramName);
