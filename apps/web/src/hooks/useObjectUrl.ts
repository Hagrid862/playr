import { useEffect, useMemo } from 'react';

/** Blob URL for a `File`, revoked automatically when `file` changes or the component unmounts. */
export function useObjectUrl(file: File | null | undefined): string | null {
  const objectUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    if (!objectUrl) return;
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  return objectUrl;
}
