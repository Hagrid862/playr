import type { GetLibraryArtistsResponseDto } from '@repo/contracts';
import { type InfiniteData, useInfiniteQuery } from '@tanstack/react-query';
import { getLibraryInfiniteNextPageParam } from '../getLibraryInfiniteNextPageParam';
import { getLibraryArtists } from './requests/getLibraryArtists';

type Params = { limit?: number };

type ArtistsInfiniteKey = readonly ['library', 'artists', 'infinite', number];

export const useLibraryArtistsInfinite = ({ limit = 50 }: Params = {}) => {
  return useInfiniteQuery<
    GetLibraryArtistsResponseDto,
    Error,
    InfiniteData<GetLibraryArtistsResponseDto>,
    ArtistsInfiniteKey,
    number
  >({
    queryKey: ['library', 'artists', 'infinite', limit],
    queryFn: ({ pageParam }) => getLibraryArtists(pageParam, limit),
    initialPageParam: 1,
    getNextPageParam: getLibraryInfiniteNextPageParam,
  });
};
