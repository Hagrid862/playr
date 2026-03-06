import { Button } from '@/components/ui/button';
import { GlobalDropzone } from '@/components/ui/GlobalDropzone';
import { Separator } from '@/components/ui/separator';
import { FormData } from './useCreateAlbumForm';
import { CircleNotchIcon, PlusIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { SyntheticEvent, useCallback, useEffect, useRef, useState } from 'react';
import { CreateAlbumDetails } from './CreateAlbumDetails';
import { CreateAlbumModals } from './CreateAlbumModals';

interface CreateAlbumFormProps {
  id?: string;
  formData: FormData;
  isLoading: boolean;
  isValid: boolean;
  type?: FormData['type'];
  onSubmit: (e: SyntheticEvent<HTMLFormElement>) => void | Promise<void>;
  onChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onBlur: (field: keyof FormData) => void;
  getFieldError: (field: keyof FormData) => string | undefined;
  onFileSelect?: (file: File | null) => void;
  _testHideFileInput?: boolean;
}

export function CreateAlbumForm({
  id,
  formData,
  isLoading,
  isValid,
  type = 'album',
  onSubmit,
  onChange,
  onBlur,
  onFileSelect,
  getFieldError,
  _testHideFileInput = false,
}: CreateAlbumFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
  const [isMultipleFilesModalOpen, setIsMultipleFilesModalOpen] = useState(false);

  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  const handleFileChange = useCallback((file: File | null) => {
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      onFileSelect?.(file);
    } else {
      setPreviewUrl(null);
      onFileSelect?.(null);
    }
  }, [onFileSelect]);

  const handleFiles = useCallback((files: FileList) => {
    if (files.length > 1) {
      setIsMultipleFilesModalOpen(true);
      return;
    }

    const file = files[0];
    if (file.type.startsWith('image/')) {
      handleFileChange(file);
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInputRef.current.files = dataTransfer.files;
      }
    } else {
      setIsFormatModalOpen(true);
    }
  }, [handleFileChange]);

  const handleRemoveImage = useCallback(() => {
    setPreviewUrl(null);
    onFileSelect?.(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileSelect]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <GlobalDropzone
      onDrop={handleFiles}
      overlayTitle="Drop cover image here"
      overlayDescription="Release to upload the artwork"
    >
      <CreateAlbumModals
        isFormatModalOpen={isFormatModalOpen}
        setIsFormatModalOpen={setIsFormatModalOpen}
        isMultipleFilesModalOpen={isMultipleFilesModalOpen}
        setIsMultipleFilesModalOpen={setIsMultipleFilesModalOpen}
      />

      <form id={id} className="flex flex-col gap-8" onSubmit={onSubmit}>
        {!_testHideFileInput && (
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
          />
        )}
        <div className="pt-6">
          <CreateAlbumDetails
            formData={formData}
            type={type}
            typeLabel={typeLabel}
            previewUrl={previewUrl}
            getFieldError={getFieldError}
            onChange={onChange}
            onBlur={onBlur}
            onCoverClick={() => fileInputRef.current?.click()}
            onRemoveImage={handleRemoveImage}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-4">
          <Button asChild variant="secondary" type="button" className="min-w-32">
            <Link to="..">Cancel</Link>
          </Button>
          <Button type="submit" disabled={!isValid || isLoading} className="min-w-32 group">
            {isLoading ? (
              <>
                <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <PlusIcon className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
                Create {typeLabel}
              </>
            )}
          </Button>
        </div>
      </form>
    </GlobalDropzone>
  );
}
