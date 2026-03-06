import type { UpdateLibraryAlbumRequest } from '@repo/contracts';
import { UpdateLibraryAlbumRequestSchema, ZodAlbum } from '@repo/contracts';
import { useForm } from '@tanstack/react-form';
import { useCallback, useEffect, useRef, useState } from 'react';

export const validateWithZod = (value: UpdateLibraryAlbumRequest) => {
  const result = UpdateLibraryAlbumRequestSchema.safeParse(value);
  if (result.success) return undefined;

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = String(issue.path[0]);
    errors[path] ??= issue.message;
  }
  return errors;
};

interface UseEditAlbumFormProps {
  album: ZodAlbum;
  onSubmit: (
    values: UpdateLibraryAlbumRequest,
    cover?: File,
    shouldDeleteCover?: boolean,
  ) => Promise<void>;
}

export function useEditAlbumForm({ album, onSubmit }: UseEditAlbumFormProps) {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverPreview, setCoverPreview] = useState<string | undefined>(undefined);
  const [selectedCover, setSelectedCover] = useState<File | undefined>(undefined);
  const [isCoverRemoved, setIsCoverRemoved] = useState(false);
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
  const [isMultipleFilesModalOpen, setIsMultipleFilesModalOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      name: album.name,
      description: album.description || '',
      type: album.type,
      releaseDate: album.releaseDate || null,
      coverId: album.coverId || undefined,
    } satisfies UpdateLibraryAlbumRequest,
    validators: {
      onChange: ({ value }) => validateWithZod(value),
    },
    onSubmit: async ({ value }) => {
      await onSubmit(
        { ...value, coverId: isCoverRemoved ? null : value.coverId },
        selectedCover,
        isCoverRemoved,
      );
    },
  });

  const handleCoverSelect = useCallback((file: File) => {
    if (file.type.startsWith('image/')) {
      setSelectedCover(file);
      setCoverPreview(URL.createObjectURL(file));
      setIsCoverRemoved(false);
    } else {
      setIsFormatModalOpen(true);
    }
  }, []);

  const handleFiles = useCallback((files: FileList) => {
    if (files.length > 1) {
      setIsMultipleFilesModalOpen(true);
      return;
    }
    handleCoverSelect(files[0]);
  }, [handleCoverSelect]);

  const handleRemoveCover = useCallback(() => {
    setSelectedCover(undefined);
    setCoverPreview(undefined);
    setIsCoverRemoved(true);
    if (coverInputRef.current) {
      coverInputRef.current.value = '';
    }
  }, []);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  const currentCoverUrl = coverPreview || (!isCoverRemoved ? album.cover?.url : undefined);

  return {
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
  };
}
