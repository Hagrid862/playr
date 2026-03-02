import { parseBlob, selectCover } from 'music-metadata';

/**
 * Extracts embedded cover art from an audio file (MP3, M4A, FLAC, etc.).
 * Uses music-metadata - a fully typed library with broad format support.
 * Returns a File suitable for uploading, or null if no cover art is embedded.
 */
export async function extractCoverFromAudioFile(
  file: File
): Promise<File | null> {
  try {
    const metadata = await parseBlob(file);
    const picture = selectCover(metadata.common.picture);

    if (!picture?.data || !picture.format) {
      return null;
    }

    const blob = new Blob([new Uint8Array(picture.data)], { type: picture.format });
    const extension = picture.format.split('/')[1] || 'jpg';
    return new File([blob], `cover.${extension}`, { type: picture.format });
  } catch {
    return null;
  }
}
