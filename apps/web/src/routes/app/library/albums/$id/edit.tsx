import type { EditAlbumTracksSubmitPayload } from '@/components/library/albums/edit/useEditAlbumTracks';
import { EditAlbumForm } from '@/components/library/albums/edit/EditAlbumForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useCreateLibraryArtist } from '@/hooks/api/library-artists/useCreateLibraryArtist';
import { useDeleteLibraryAlbumCover } from '@/hooks/api/library-albums/useDeleteLibraryAlbumCover';
import { useLibraryAlbum } from '@/hooks/api/library-albums/useLibraryAlbum';
import { useUpdateLibraryAlbum } from '@/hooks/api/library-albums/useUpdateLibraryAlbum';
import { useUploadLibraryAlbumCover } from '@/hooks/api/library-albums/useUploadLibraryAlbumCover';
import { useCreateLibraryGenre } from '@/hooks/api/library-genres/useCreateLibraryGenre';
import { useBulkCreateLibraryTracks } from '@/hooks/api/library-tracks/useBulkCreateLibraryTracks';
import { useDeleteLibraryTrack } from '@/hooks/api/library-tracks/useDeleteLibraryTrack';
import { useUpdateLibraryTrack } from '@/hooks/api/library-tracks/useUpdateLibraryTrack';
import type { UpdateLibraryAlbumRequest } from '@repo/contracts';
import { AlbumSystemKind } from '@repo/db';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { getStorageQuotaErrorToastMessage } from '@/lib/storage-quota-error';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/app/library/albums/$id/edit')({
  component: EditAlbumComponent,
});

function mapArtistIds(ids: string[], localToServer: Map<string, string>): string[] {
  return ids.map((id) => localToServer.get(id) ?? id);
}

function EditAlbumComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  const { data: albumResponse, isLoading: isLoadingAlbum } = useLibraryAlbum(id);
  const {
    mutateAsync: updateAlbum,
    isPending: isUpdatingAlbum,
    error: updateError,
  } = useUpdateLibraryAlbum();
  const { mutateAsync: uploadCover, isPending: isUploadingCover } = useUploadLibraryAlbumCover();
  const { mutateAsync: deleteCover, isPending: isDeletingCover } = useDeleteLibraryAlbumCover();
  const { mutateAsync: createArtist } = useCreateLibraryArtist();
  const { mutateAsync: updateTrack } = useUpdateLibraryTrack();
  const { mutateAsync: deleteTrack } = useDeleteLibraryTrack();
  const { mutateAsync: bulkCreateTracks } = useBulkCreateLibraryTracks();
  const { mutateAsync: createLibraryGenre } = useCreateLibraryGenre();

  const album = albumResponse?.data;

  const handleUpdate = useCallback(
    async (
      data: UpdateLibraryAlbumRequest,
      tracks: EditAlbumTracksSubmitPayload,
      cover?: File,
      shouldDeleteCover?: boolean,
      extras?: { pendingGenres: { id: string; name: string }[] },
    ) => {
      if (!album) return;

      setIsSaving(true);
      try {
        const localToServer = new Map<string, string>();

        for (const { localId, name } of tracks.pendingArtistsToCreate) {
          const res = await createArtist({ name });
          const serverId = res.data?.id;
          if (!serverId) {
            throw new Error('Failed to create artist');
          }
          localToServer.set(localId, serverId);
        }

        const existingUpdates = tracks.existingUpdates.map(({ trackId, data: d }) => ({
          trackId,
          data: {
            ...d,
            artistIds: d.artistIds ? mapArtistIds(d.artistIds, localToServer) : undefined,
          },
        }));

        const newTracksResolved = tracks.newTracks.map((t) => ({
          ...t,
          artistIds: mapArtistIds(t.artistIds ?? [], localToServer),
        }));

        if (shouldDeleteCover) {
          await deleteCover({ id });
        } else if (cover) {
          await uploadCover({ id, file: cover });
        }

        await updateAlbum({ id, data });

        for (const u of existingUpdates) {
          await updateTrack({ id: u.trackId, data: u.data });
        }

        for (const delId of tracks.deleteIds) {
          await deleteTrack(delId);
        }

        if (newTracksResolved.length > 0) {
          await bulkCreateTracks({
            album,
            tracks: newTracksResolved,
            pendingGenres: extras?.pendingGenres,
            createLibraryGenre,
          });
        }

        toast.success('Album saved');
        navigate({ to: '/app/library/albums/$id', params: { id } });
      } catch (error) {
        console.error('Failed to update album:', error);
        const message = getStorageQuotaErrorToastMessage(error, 'Failed to save');
        toast.error(message);
      } finally {
        setIsSaving(false);
      }
    },
    [
      album,
      bulkCreateTracks,
      createLibraryGenre,
      createArtist,
      deleteCover,
      deleteTrack,
      id,
      navigate,
      updateAlbum,
      updateTrack,
      uploadCover,
    ],
  );

  const handleCancel = () => {
    navigate({ to: '/app/library/albums/$id', params: { id } });
  };

  if (isLoadingAlbum) {
    return (
      <div className="-mx-4 flex max-lg:h-full min-h-0 w-[calc(100%+2rem)] min-w-0 flex-col gap-6 overflow-y-auto px-4 pb-6 md:pb-8 lg:h-[calc(100dvh-15rem)] lg:max-h-[calc(100dvh-15rem)] lg:min-h-[calc(100dvh-15rem)] lg:px-6 xl:px-8">
        <div className="mx-auto flex w-full min-w-0 max-w-[1920px] flex-col gap-6 animate-pulse">
          <div className="h-10 rounded-lg bg-muted/40" />
          <div className="h-48 rounded-2xl bg-muted/30 md:h-40" />
          <div className="h-32 rounded-xl bg-muted/30" />
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <p className="text-muted-foreground">Album not found</p>
      </div>
    );
  }

  if (album.systemKind !== AlbumSystemKind.none) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-4">
        <Alert className="max-w-md border-muted">
          <AlertTitle className="text-foreground">This album cannot be edited</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            System albums such as the library Unknown album are managed automatically. You can open
            it to view or organize tracks, but metadata and bulk edits are not available here.
          </AlertDescription>
        </Alert>
        <Button
          type="button"
          onClick={() => navigate({ to: '/app/library/albums/$id', params: { id } })}
        >
          Back to album
        </Button>
      </div>
    );
  }

  return (
    <div className="-mx-4 flex max-lg:h-full min-h-0 w-[calc(100%+2rem)] min-w-0 flex-col gap-6 overflow-y-auto px-4 pb-6 md:pb-8 lg:h-[calc(100dvh-15rem)] lg:max-h-[calc(100dvh-15rem)] lg:min-h-[calc(100dvh-15rem)] lg:px-6 xl:px-8">
      <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-[1920px] flex-col gap-6 overflow-visible lg:flex-1 lg:min-h-0">
        <div className="flex shrink-0 flex-col gap-2">
          <Alert className="border-primary/20 bg-primary/5">
            <AlertTitle className="text-primary">Edit album</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              Edit artwork, album details, and tracks below. Everything is saved together when you
              click Save changes (including new artists, track edits, removals, and new audio
              files).
            </AlertDescription>
          </Alert>
        </div>

        <EditAlbumForm
          album={album}
          isLoading={isSaving || isUpdatingAlbum || isUploadingCover || isDeletingCover}
          serverErrors={updateError?.status === 409 ? { name: updateError.message } : undefined}
          onSubmit={handleUpdate}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
