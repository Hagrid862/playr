import { useLibraryTracks } from './useLibraryTracks';

export const useAlbumTracks = (albumId: string, page = 1, limit = 20) => {
  return useLibraryTracks({ page, limit, albumId });
};
