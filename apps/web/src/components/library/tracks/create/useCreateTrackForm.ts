import {
  extractCoverFromAudioFile,
  extractMetadataFromAudioFile,
} from '@/lib/audio/audio-metadata';
import { cleanFilenameToTitle } from '@/lib/audio/clean-audio-filename';
import type { CreateLibraryTrackRequest } from '@repo/contracts';
import { CreateLibraryTrackRequestSchema, ZodAlbumInfer } from '@repo/contracts';
import { useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';

export type TrackFormValues = CreateLibraryTrackRequest & { audioFile: File | null };

export const validateWithZod = (value: TrackFormValues) => {
  const metadata = {
    title: value.title,
    trackNumber: value.trackNumber,
    diskNumber: value.diskNumber,
    explicit: value.explicit,
    albumId: value.albumId,
    artistIds: value.artistIds,
  };
  const result = CreateLibraryTrackRequestSchema.safeParse(metadata);

  const errors: Partial<Record<keyof TrackFormValues | 'form', string>> = {};

  if (!result.success) {
    result.error.issues.forEach((issue) => {
      if (issue.path.length === 0) {
        errors.form = issue.message;
        return;
      }
      const path = issue.path.join('.') as keyof TrackFormValues;
      if (!errors[path]) {
        errors[path] = issue.message;
      }
    });
  }

  if (!value.audioFile) {
    errors.audioFile = 'Audio file is required';
  }

  return Object.keys(errors).length > 0 ? errors : undefined;
};

interface UseCreateTrackFormProps {
  album: ZodAlbumInfer;
  onSubmit: (
    values: CreateLibraryTrackRequest,
    audioFile: File,
    coverFile?: File | null,
  ) => Promise<void>;
}

export function useCreateTrackForm({ album, onSubmit }: UseCreateTrackFormProps) {
  const navigate = useNavigate();
  const [stayOnPage, setStayOnPage] = useState(false);
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
  const [isMultipleFilesModalOpen, setIsMultipleFilesModalOpen] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [trackCoverFile, setTrackCoverFile] = useState<File | null>(null);
  const [useTrackCoverAsAlbumCover, setUseTrackCoverAsAlbumCover] = useState(false);
  const [isScanningMetadata, setIsScanningMetadata] = useState(false);
  const [trackCoverPreviewUrl, setTrackCoverPreviewUrl] = useState<string | null>(null);
  const [audioFileForScan, setAudioFileForScan] = useState<File | null>(null);

  const form = useForm({
    defaultValues: {
      title: '',
      trackNumber: 1,
      diskNumber: 1,
      explicit: false,
      albumId: album.id,
      artistIds: album.artists?.map((a) => a.id) ?? [],
      audioFile: null,
    } as TrackFormValues,
    validators: {
      onBlur: ({ value }) => validateWithZod(value),
      onChange: ({ value }) => validateWithZod(value),
      onSubmit: ({ value }) => validateWithZod(value),
    },
    onSubmit: async ({ value }) => {
      setSubmissionError(null);
      try {
        const metadata = CreateLibraryTrackRequestSchema.parse(value);
        const audioFile = z.instanceof(File).parse(value.audioFile);
        const coverFile = useTrackCoverAsAlbumCover && trackCoverFile ? trackCoverFile : null;

        await onSubmit(metadata, audioFile, coverFile);
        if (stayOnPage) {
          form.reset();
          form.setFieldValue('trackNumber', value.trackNumber + 1);
          form.setFieldValue('diskNumber', value.diskNumber);
          setAudioFileForScan(null);
        } else {
          navigate({ to: '..' });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Submission failed. Please try again.';
        setSubmissionError(message);
      }
    },
  });

  const handleFiles = useCallback(
    (files: FileList) => {
      if (files.length > 1) {
        setIsMultipleFilesModalOpen(true);
        return;
      }

      const file = files[0];
      if (file.type.startsWith('audio/')) {
        form.setFieldValue('audioFile', file);
        setAudioFileForScan(file);
      } else {
        setIsFormatModalOpen(true);
      }
    },
    [form],
  );

  useEffect(() => {
    let cancelled = false;

    if (!audioFileForScan) {
      queueMicrotask(() => {
        if (!cancelled) {
          setTrackCoverFile(null);
          setUseTrackCoverAsAlbumCover(false);
          setTrackCoverPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
        }
      });
      return () => {
        cancelled = true;
      };
    }

    const scan = async () => {
      setIsScanningMetadata(true);
      setTrackCoverFile(null);
      setTrackCoverPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });

      const [meta, coverFile] = await Promise.all([
        extractMetadataFromAudioFile(audioFileForScan),
        extractCoverFromAudioFile(audioFileForScan),
      ]);

      if (cancelled) return;

      const metaContext = {
        artists: meta?.artist ? [meta.artist] : [],
        album: meta?.album ?? '',
      };

      form.setFieldValue(
        'title',
        meta?.title || cleanFilenameToTitle(audioFileForScan.name, metaContext),
      );
      form.setFieldValue('trackNumber', meta?.trackNo ?? 1);
      form.setFieldValue('diskNumber', meta?.diskNo ?? 1);

      if (coverFile) {
        setTrackCoverFile(coverFile);
        setTrackCoverPreviewUrl(URL.createObjectURL(coverFile));
        setUseTrackCoverAsAlbumCover(!album.cover?.url);
      } else {
        setUseTrackCoverAsAlbumCover(false);
      }

      setIsScanningMetadata(false);
    };

    scan();
    return () => {
      cancelled = true;
    };
  }, [audioFileForScan, album.artists, album.name, album.cover?.url, form]);

  useEffect(() => {
    return () => {
      if (trackCoverPreviewUrl) URL.revokeObjectURL(trackCoverPreviewUrl);
    };
  }, [trackCoverPreviewUrl]);

  return {
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
  };
}
