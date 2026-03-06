import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { GlobalDropzone } from '@/components/ui/GlobalDropzone';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CircleNotchIcon, PlusIcon } from '@phosphor-icons/react';
import type { CreateLibraryTrackRequest, ZodAlbumInfer } from '@repo/contracts';
import { Link } from '@tanstack/react-router';
import { CreateTrackFormFields } from './CreateTrackFormFields';
import { CreateTrackFormModals } from './CreateTrackFormModals';
import { useCreateTrackForm } from './useCreateTrackForm';

interface CreateTrackFormProps {
  album: ZodAlbumInfer;
  isLoading: boolean;
  onSubmit: (
    values: CreateLibraryTrackRequest,
    audioFile: File,
    coverFile?: File | null,
  ) => Promise<void>;
  serverErrors?: Partial<Record<keyof CreateLibraryTrackRequest, string>>;
}

export function CreateTrackForm({
  album,
  isLoading,
  onSubmit,
  serverErrors,
}: CreateTrackFormProps) {
  const {
    form,
    stayOnPage,
    setStayOnPage,
    isFormatModalOpen,
    setIsFormatModalOpen,
    isMultipleFilesModalOpen,
    setIsMultipleFilesModalOpen,
    submissionError,
    trackCoverFile,
    useTrackCoverAsAlbumCover,
    setUseTrackCoverAsAlbumCover,
    isScanningMetadata,
    trackCoverPreviewUrl,
    handleFiles,
  } = useCreateTrackForm({ album, onSubmit });

  return (
    <GlobalDropzone
      onDrop={handleFiles}
      overlayTitle="Drop audio files to upload"
      overlayDescription="Your tracks will be processed automatically"
    >
      <CreateTrackFormModals
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
        <form.Subscribe selector={(state) => state.errors}>
          {(errors) => {
            const error = (errors?.[0] as Record<string, string> | undefined)?.form;
            return error ? (
              <div className="text-destructive text-sm font-medium">{error}</div>
            ) : null;
          }}
        </form.Subscribe>

        {submissionError && (
          <div className="text-destructive text-sm font-medium">{submissionError}</div>
        )}

        <CreateTrackFormFields
          form={form}
          serverErrors={serverErrors as Record<string, string>}
          isScanningMetadata={isScanningMetadata}
          trackCoverFile={trackCoverFile}
          trackCoverPreviewUrl={trackCoverPreviewUrl}
          useTrackCoverAsAlbumCover={useTrackCoverAsAlbumCover}
          currentAlbumCoverUrl={album.cover?.url ?? null}
          onSelectTrackCover={setUseTrackCoverAsAlbumCover}
          onAudioFileChange={() => {}}
        />

        <Separator />

        <div className="flex items-center justify-between gap-4">
          <Button asChild variant="secondary" type="button" className="min-w-32">
            <Link to="..">Cancel</Link>
          </Button>
          <div className="flex items-center gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="stayOnPage"
                checked={stayOnPage}
                onCheckedChange={(checked) => setStayOnPage(!!checked)}
              />
              <Label htmlFor="stayOnPage" className="text-sm">
                Add another track
              </Label>
            </div>
            <form.Subscribe selector={(state) => [state.isSubmitting] as const}>
              {([isSubmitting]) => (
                <Button
                  type="submit"
                  disabled={isLoading || isSubmitting}
                  className="min-w-32 group"
                >
                  {isLoading || isSubmitting ? (
                    <>
                      <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
                      Add Track
                    </>
                  )}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </div>
      </form>
    </GlobalDropzone>
  );
}
