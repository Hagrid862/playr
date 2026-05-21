import type {
  AddPlaylistAlbumRequest,
  AddPlaylistTrackRequest,
  CreateLibraryPlaylistRequest,
  PinPlaylistRequest,
  ReorderPlaylistPinsRequest,
  ReorderPlaylistTracksRequest,
  SortPlaylistTracksRequest,
  UpdateLibraryPlaylistRequest,
} from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addPlaylistAlbum } from './requests/addPlaylistAlbum';
import { addPlaylistTrack } from './requests/addPlaylistTrack';
import { createLibraryPlaylist } from './requests/createLibraryPlaylist';
import { deleteLibraryPlaylist } from './requests/deleteLibraryPlaylist';
import { deleteLibraryPlaylistCover } from './requests/deleteLibraryPlaylistCover';
import { pinPlaylist } from './requests/pinPlaylist';
import { removePlaylistTrack } from './requests/removePlaylistTrack';
import { reorderPlaylistPins } from './requests/reorderPlaylistPins';
import { reorderPlaylistTracks } from './requests/reorderPlaylistTracks';
import { sortPlaylistTracks } from './requests/sortPlaylistTracks';
import { unpinPlaylist } from './requests/unpinPlaylist';
import { updateLibraryPlaylist } from './requests/updateLibraryPlaylist';
import { uploadLibraryPlaylistCover } from './requests/uploadLibraryPlaylistCover';
import { libraryPlaylistPinsQueryKey } from './useLibraryPlaylistPins';
import { libraryPlaylistsQueryKey } from './useLibraryPlaylists';

const invalidatePlaylistQueries = (qc: ReturnType<typeof useQueryClient>, playlistId?: string) => {
  void qc.invalidateQueries({ queryKey: libraryPlaylistsQueryKey });
  void qc.invalidateQueries({ queryKey: libraryPlaylistPinsQueryKey });
  if (playlistId) {
    void qc.invalidateQueries({ queryKey: ['library', 'playlists', playlistId] });
  }
};

export const useCreateLibraryPlaylist = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLibraryPlaylistRequest) => createLibraryPlaylist(body),
    onSuccess: () => invalidatePlaylistQueries(qc),
  });
};

export const useUpdateLibraryPlaylist = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { playlistId: string; body: UpdateLibraryPlaylistRequest }) =>
      updateLibraryPlaylist(params),
    onSuccess: (_data, vars) => invalidatePlaylistQueries(qc, vars.playlistId),
  });
};

export const useDeleteLibraryPlaylist = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (playlistId: string) => deleteLibraryPlaylist(playlistId),
    onSuccess: (_data, playlistId) => invalidatePlaylistQueries(qc, playlistId),
  });
};

export const useAddPlaylistTrack = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { playlistId: string; body: AddPlaylistTrackRequest }) =>
      addPlaylistTrack(params),
    onSuccess: (_data, vars) => invalidatePlaylistQueries(qc, vars.playlistId),
  });
};

export const useAddPlaylistAlbum = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { playlistId: string; body: AddPlaylistAlbumRequest }) =>
      addPlaylistAlbum(params),
    onSuccess: (_data, vars) => invalidatePlaylistQueries(qc, vars.playlistId),
  });
};

export const useRemovePlaylistTrack = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { playlistId: string; trackId: string }) => removePlaylistTrack(params),
    onSuccess: (_data, vars) => invalidatePlaylistQueries(qc, vars.playlistId),
  });
};

export const usePinPlaylist = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PinPlaylistRequest) => pinPlaylist(body),
    onSuccess: () => invalidatePlaylistQueries(qc),
  });
};

export const useUnpinPlaylist = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pinId: string) => unpinPlaylist(pinId),
    onSuccess: () => invalidatePlaylistQueries(qc),
  });
};

export const useReorderPlaylistPins = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReorderPlaylistPinsRequest) => reorderPlaylistPins(body),
    onSuccess: () => invalidatePlaylistQueries(qc),
  });
};

export const useReorderPlaylistTracks = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { playlistId: string; body: ReorderPlaylistTracksRequest }) =>
      reorderPlaylistTracks(params),
    onSuccess: (_data, vars) => invalidatePlaylistQueries(qc, vars.playlistId),
  });
};

export const useSortPlaylistTracks = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { playlistId: string; body: SortPlaylistTracksRequest }) =>
      sortPlaylistTracks(params),
    onSuccess: (_data, vars) => invalidatePlaylistQueries(qc, vars.playlistId),
  });
};

export const useUploadLibraryPlaylistCover = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { playlistId: string; file: File }) =>
      uploadLibraryPlaylistCover(params.playlistId, params.file),
    onSuccess: (_data, vars) => invalidatePlaylistQueries(qc, vars.playlistId),
  });
};

export const useDeleteLibraryPlaylistCover = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (playlistId: string) => deleteLibraryPlaylistCover(playlistId),
    onSuccess: (_data, playlistId) => invalidatePlaylistQueries(qc, playlistId),
  });
};
