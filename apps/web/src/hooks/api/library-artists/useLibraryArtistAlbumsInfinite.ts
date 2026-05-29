import type { GetLibraryArtistAlbumsResponseDto } from '@repo/contracts';
import { AlbumType } from '@repo/db';
import { type InfiniteData, useInfiniteQuery } from '@tanstack/react-query';
import { getLibraryInfiniteNextPageParam } from '../getLibraryInfiniteNextPageParam';
import { getLibraryArtistAlbums } from './requests/getLibraryArtistAlbums';

type Params = {
  artistId: string;
  type?: AlbumType;
  limit?: number;
};

type ArtistAlbumsInfiniteKey = readonly [
  'library',
  'artists',
  string,
  'albums',
  'infinite',
  number,
  string,
];

export const useLibraryArtistAlbumsInfinite = ({
  artistId,
  type,
  limit = 20,
}: Params) => {
  const typeKey = type ?? 'all';

  return useInfiniteQuery<
    GetLibraryArtistAlbumsResponseDto,
    Error,
    InfiniteData<GetLibraryArtistAlbumsResponseDto>,
    ArtistAlbumsInfiniteKey,
    number
  >({
    queryKey: ['library', 'artists', artistId, 'albums', 'infinite', limit, typeKey],
    queryFn: ({ pageParam }) => getLibraryArtistAlbums(artistId, pageParam, limit, type),
    initialPageParam: 1,
    getNextPageParam: getLibraryInfiniteNextPageParam,
    enabled: !!artistId,
  });
};
