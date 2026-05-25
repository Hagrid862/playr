import { ApiError } from '@/lib/api-error';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import {
  useDeleteLibraryPlaylistCover,
  useReorderPlaylistTracks,
  useUpdateLibraryPlaylist,
  useUploadLibraryPlaylistCover,
} from '@/hooks/api/library-playlists/useLibraryPlaylistMutations';
import { useLibraryPlaylistDetail } from '@/hooks/api/library-playlists/useLibraryPlaylistDetail';
import { useLibraryPlaylists } from '@/hooks/api/library-playlists/useLibraryPlaylists';
import type { GetLibraryPlaylistDetailResponse } from '@repo/contracts';
import { PlaylistSystemRole } from '@repo/db';
import { useNavigate } from '@tanstack/react-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { toast } from 'sonner';

export type LibraryPlaylistDetailData = NonNullable<GetLibraryPlaylistDetailResponse['data']>;
export type LibraryPlaylistTrackRow = LibraryPlaylistDetailData['tracks'][number];

type InitialSnapshot = {
  name: string;
  trackIds: string[];
  hasCover: boolean;
};

type PlaylistEditDraftContextValue = {
  playlistId: string;
  detail: LibraryPlaylistDetailData | undefined;
  isLoading: boolean;
  isSaving: boolean;
  initialSnapshot: InitialSnapshot | null;
  draftName: string;
  setDraftName: (v: string) => void;
  titleError: string | null;
  setTitleError: (v: string | null) => void;
  coverFile: File | null;
  setCoverFile: (f: File | null) => void;
  removeCover: boolean;
  scheduleRemoveCover: () => void;
  undoRemoveCover: () => void;
  coverInputRef: RefObject<HTMLInputElement | null>;
  draftTrackIds: string[];
  reorderTracksFromDragEnd: (event: DragEndEvent) => void;
  orderedTrackRows: LibraryPlaylistTrackRow[];
  isDirty: boolean;
  save: () => Promise<void>;
  cancel: () => void;
  /** Back button: confirm discard then browser back */
  handleBackRequest: () => void;
};

const PlaylistEditDraftContext = createContext<PlaylistEditDraftContextValue | null>(null);

function confirmDiscard(isDirty: boolean): boolean {
  if (!isDirty) return true;
  return window.confirm('Discard unsaved changes?');
}

export function PlaylistEditDraftProvider({
  playlistId,
  children,
}: {
  playlistId: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { data, isLoading } = useLibraryPlaylistDetail(playlistId, { page: 1, limit: 200 });
  const { data: playlistsResponse } = useLibraryPlaylists();

  const [initialSnapshot, setInitialSnapshot] = useState<InitialSnapshot | null>(null);
  const [draftName, setDraftNameState] = useState('');
  const [draftTrackIds, setDraftTrackIds] = useState<string[]>([]);
  const [coverFile, setCoverFileState] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { mutateAsync: updatePlaylist } = useUpdateLibraryPlaylist();
  const { mutateAsync: uploadCover } = useUploadLibraryPlaylistCover();
  const { mutateAsync: deleteCover } = useDeleteLibraryPlaylistCover();
  const { mutateAsync: reorderTracks } = useReorderPlaylistTracks();
  const setCoverFile = useCallback((f: File | null) => {
    setCoverFileState(f);
    if (f) setRemoveCover(false);
  }, []);

  const detail = data?.data;

  useEffect(() => {
    if (!detail || detail.systemRole === PlaylistSystemRole.favorites) return;
    if (initialSnapshot) return;

    const ids = detail.tracks.map((r) => r.track.id);
    const hasCover = Boolean(detail.cover?.url != null && detail.cover.url !== '');
    setInitialSnapshot({ name: detail.name, trackIds: [...ids], hasCover });
    setDraftNameState(detail.name);
    setDraftTrackIds(ids);
    setCoverFileState(null);
    setRemoveCover(false);
    setTitleError(null);
    if (coverInputRef.current) coverInputRef.current.value = '';
  }, [detail, initialSnapshot]);

  const setDraftName = useCallback((v: string) => {
    setTitleError(null);
    setDraftNameState(v);
  }, []);

  const isDirty = useMemo(() => {
    if (!initialSnapshot) return false;
    const trimmed = draftName.trim();
    if (trimmed !== initialSnapshot.name.trim()) return true;
    if (coverFile) return true;
    if (removeCover && initialSnapshot.hasCover) return true;
    if (draftTrackIds.length !== initialSnapshot.trackIds.length) return true;
    for (let i = 0; i < draftTrackIds.length; i++) {
      if (draftTrackIds[i] !== initialSnapshot.trackIds[i]) return true;
    }
    return false;
  }, [draftName, coverFile, removeCover, draftTrackIds, initialSnapshot]);

  const orderedTrackRows = useMemo(() => {
    if (!detail) return [];
    const map = new Map(detail.tracks.map((r) => [r.track.id, r]));
    return draftTrackIds
      .map((id) => map.get(id))
      .filter((r): r is LibraryPlaylistTrackRow => r != null);
  }, [detail, draftTrackIds]);

  const reorderTracksFromDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraftTrackIds((items) => {
      const oldIndex = items.indexOf(String(active.id));
      const newIndex = items.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  }, []);

  const clearNewCoverSelection = useCallback(() => {
    setCoverFileState(null);
    if (coverInputRef.current) coverInputRef.current.value = '';
  }, []);

  const scheduleRemoveCover = useCallback(() => {
    setRemoveCover(true);
    clearNewCoverSelection();
  }, [clearNewCoverSelection]);

  const undoRemoveCover = useCallback(() => {
    setRemoveCover(false);
  }, []);

  const save = useCallback(async () => {
    if (!initialSnapshot || !detail || detail.systemRole === PlaylistSystemRole.favorites) return;
    setTitleError(null);
    const trimmed = draftName.trim();
    if (!trimmed) {
      toast.error('Enter a playlist name');
      return;
    }

    const items = playlistsResponse?.data?.items ?? [];
    const dup = items.find(
      (p) => p.id !== playlistId && p.systemRole == null && p.name.trim() === trimmed,
    );
    if (dup) {
      setTitleError('This playlist name is already taken');
      return;
    }

    setIsSaving(true);
    try {
      if (trimmed !== initialSnapshot.name.trim()) {
        await updatePlaylist({ playlistId, body: { name: trimmed } });
      }
      if (removeCover && initialSnapshot.hasCover) {
        await deleteCover(playlistId);
      } else if (coverFile) {
        await uploadCover({ playlistId, file: coverFile });
      }

      const orderChanged = draftTrackIds.some((id, i) => id !== initialSnapshot.trackIds[i]);
      if (orderChanged) {
        await reorderTracks({
          playlistId,
          body: { orderedTrackIds: draftTrackIds },
        });
      }

      toast.success('Playlist updated');
      await navigate({ to: '/app/playlists/$playlistId', params: { playlistId } });
    } catch (err) {
      console.error(err);
      if (err instanceof ApiError && err.status === 409) {
        setTitleError(err.message);
        return;
      }
      toast.error('Could not update playlist');
    } finally {
      setIsSaving(false);
    }
  }, [
    initialSnapshot,
    detail,
    draftName,
    playlistId,
    playlistsResponse?.data?.items,
    removeCover,
    coverFile,
    draftTrackIds,
    updatePlaylist,
    deleteCover,
    uploadCover,
    reorderTracks,
    navigate,
  ]);

  const cancel = useCallback(() => {
    if (!confirmDiscard(isDirty)) return;
    void navigate({ to: '/app/playlists/$playlistId', params: { playlistId } });
  }, [isDirty, navigate, playlistId]);

  const handleBackRequest = useCallback(() => {
    if (!confirmDiscard(isDirty)) return;
    window.history.back();
  }, [isDirty]);

  const value = useMemo<PlaylistEditDraftContextValue>(
    () => ({
      playlistId,
      detail,
      isLoading,
      isSaving,
      initialSnapshot,
      draftName,
      setDraftName,
      titleError,
      setTitleError,
      coverFile,
      setCoverFile,
      removeCover,
      scheduleRemoveCover,
      undoRemoveCover,
      coverInputRef,
      draftTrackIds,
      reorderTracksFromDragEnd,
      orderedTrackRows,
      isDirty,
      save,
      cancel,
      handleBackRequest,
    }),
    [
      playlistId,
      detail,
      isLoading,
      isSaving,
      initialSnapshot,
      draftName,
      setDraftName,
      titleError,
      coverFile,
      setCoverFile,
      removeCover,
      scheduleRemoveCover,
      undoRemoveCover,
      draftTrackIds,
      reorderTracksFromDragEnd,
      orderedTrackRows,
      isDirty,
      save,
      cancel,
      handleBackRequest,
    ],
  );

  return (
    <PlaylistEditDraftContext.Provider value={value}>{children}</PlaylistEditDraftContext.Provider>
  );
}

export function usePlaylistEditDraft(): PlaylistEditDraftContextValue {
  const ctx = useContext(PlaylistEditDraftContext);
  if (!ctx) {
    throw new Error('usePlaylistEditDraft must be used within PlaylistEditDraftProvider');
  }
  return ctx;
}
