import { Button } from '@/components/ui/button';
import { GlobalDropzone } from '@/components/ui/GlobalDropzone';
import { Separator } from '@/components/ui/separator';
import { CircleNotchIcon, FloppyDiskIcon } from '@phosphor-icons/react';
import type { UpdateLibraryAlbumRequest, ZodAlbum } from '@repo/contracts';
import { EditAlbumHero } from './EditAlbumHero';
import { EditAlbumMetadata } from './EditAlbumMetadata';
import { EditAlbumModals } from './EditAlbumModals';
import { useEditAlbumForm } from './useEditAlbumForm';

interface EditAlbumFormProps {
  album: ZodAlbum;
  isLoading: boolean;
  serverErrors?: Partial<Record<keyof UpdateLibraryAlbumRequest, string>>;
  onSubmit: (
    values: UpdateLibraryAlbumRequest,
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
  } = useEditAlbumForm({ album, onSubmit });

  return (
    <GlobalDropzone
      onDrop={handleFiles}
      overlayTitle="Drop cover image here"
      overlayDescription="Release to upload the artwork"
    >
      <EditAlbumModals
        isFormatModalOpen={isFormatModalOpen}
        setIsFormatModalOpen={setIsFormatModalOpen}
        isMultipleFilesModalOpen={isMultipleFilesModalOpen}
        setIsMultipleFilesModalOpen={setIsMultipleFilesModalOpen}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="flex flex-col gap-8"
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

        <EditAlbumHero
          form={form}
          currentCoverUrl={currentCoverUrl}
          albumName={album.name}
          onCoverClick={() => coverInputRef.current?.click()}
          onRemoveCover={handleRemoveCover}
          serverErrors={serverErrors as Record<string, string>}
        />

        <Separator className="opacity-50" />

        <EditAlbumMetadata form={form} />

        <Separator className="opacity-50" />

        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" type="button" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="min-w-32 group rounded-xl">
            {isLoading ? (
              <>
                <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FloppyDiskIcon size={18} className="mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </GlobalDropzone>
  );
}
