import { Button } from '@/components/ui/button';
import { GlobalDropzone } from '@/components/ui/GlobalDropzone';
import { Separator } from '@/components/ui/separator';
import { CircleNotchIcon, FloppyDiskIcon } from '@phosphor-icons/react';
import type { UpdateLibraryAlbumRequest, ZodAlbum } from '@repo/contracts';
import { EditAlbumHero } from './EditAlbumHero';
import { EditAlbumMetadata } from './EditAlbumMetadata';
import { EditAlbumModals } from './EditAlbumModals';
import { EditAlbumTracksSection } from './EditAlbumTracksSection';
import type { EditAlbumTracksSubmitPayload } from './useEditAlbumTracks';
import { useEditAlbumTracks } from './useEditAlbumTracks';
import { useEditAlbumForm } from './useEditAlbumForm';

interface EditAlbumFormProps {
  album: ZodAlbum;
  isLoading: boolean;
  serverErrors?: Partial<Record<keyof UpdateLibraryAlbumRequest, string>>;
  onSubmit: (
    values: UpdateLibraryAlbumRequest,
    tracks: EditAlbumTracksSubmitPayload,
    cover?: File,
    shouldDeleteCover?: boolean,
  ) => Promise<void>;
  onCancel: () => void;
  /** @internal When true, cover input is not rendered. Used by tests to cover ref-null branch. */
  _testHideCoverInput?: boolean;
}

export function EditAlbumForm({
  album,
  isLoading,
  serverErrors,
  onSubmit,
  onCancel,
  _testHideCoverInput = false,
}: EditAlbumFormProps) {
  const tracksState = useEditAlbumTracks(album);

  const {
    form,
    coverInputRef,
    currentCoverUrl,
    handleFiles,
    handleRemoveCover,
    isFormatModalOpen,
    setIsFormatModalOpen,
    isMultipleFilesModalOpen,
    setIsMultipleFilesModalOpen,
    handleCoverSelect,
  } = useEditAlbumForm({
    album,
    onSubmit,
    prepareTracksSubmit: tracksState.prepareTracksSubmit,
  });

  return (
    <GlobalDropzone
      onDrop={handleFiles}
      overlayTitle="Drop cover image here"
      overlayDescription="Release to upload the artwork"
      className="relative flex min-h-0 w-full flex-1 flex-col overflow-visible"
    >
      <EditAlbumModals
        isFormatModalOpen={isFormatModalOpen}
        setIsFormatModalOpen={setIsFormatModalOpen}
        isMultipleFilesModalOpen={isMultipleFilesModalOpen}
        setIsMultipleFilesModalOpen={setIsMultipleFilesModalOpen}
      />

      <div className="relative flex w-full min-w-0 flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-col overflow-visible">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex w-full min-w-0 flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-visible"
        >
          {!_testHideCoverInput && (
            <input
              type="file"
              ref={coverInputRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCoverSelect(file);
              }}
            />
          )}

          <div className="flex w-full min-w-0 flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-row lg:items-stretch lg:gap-8 xl:gap-12 2xl:gap-16 overflow-visible">
            <aside className="flex w-full shrink-0 flex-col overflow-visible lg:max-h-full lg:min-h-0 lg:w-[min(100%,24rem)] lg:overscroll-contain lg:px-3 xl:w-[min(100%,28rem)] 2xl:w-[30rem]">
              <div className="flex flex-col gap-6 overflow-visible lg:max-h-full lg:min-h-0 lg:flex-1">
                <div className="flex shrink-0 flex-col gap-6">
                  <h3 className="text-sm font-medium">Album details</h3>
                  <EditAlbumHero
                    form={form}
                    currentCoverUrl={currentCoverUrl}
                    albumName={album.name}
                    onCoverClick={() => coverInputRef.current?.click()}
                    onRemoveCover={handleRemoveCover}
                    serverErrors={serverErrors as Record<string, string>}
                  />
                </div>

                <div className="min-h-0 flex-1 space-y-6 lg:overflow-y-auto lg:pr-1">
                  <EditAlbumMetadata form={form} />
                </div>
              </div>
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:min-h-0 lg:border-l lg:border-border/60 lg:pl-8 xl:pl-12 2xl:pl-16">
              <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-2 xl:pr-3">
                <Separator className="lg:hidden" />
                <EditAlbumTracksSection tracks={tracksState} />
              </div>
            </div>
          </div>

          <Separator className="shrink-0 lg:mt-0" />

          <div className="flex shrink-0 flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="secondary"
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="min-w-32 sm:min-w-36"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="min-w-32 sm:min-w-36">
              {isLoading ? (
                <>
                  <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FloppyDiskIcon size={18} className="mr-2" />
                  Save changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </GlobalDropzone>
  );
}
