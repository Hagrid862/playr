import jsmediatags from 'jsmediatags';

/**
 * Extracts embedded cover art from an audio file (MP3, M4A, FLAC, etc.).
 * Uses jsmediatags - a pure browser library with no Node.js dependencies.
 * Returns a File suitable for uploading, or null if no cover art is embedded.
 */
export function extractCoverFromAudioFile(file: File): Promise<File | null> {
  return new Promise((resolve) => {
    jsmediatags.read(file, {
      onSuccess: (tag) => {
        const picture = tag.tags.picture;
        if (!picture?.data || !picture?.format) {
          resolve(null);
          return;
        }

        const data = picture.data;
        const format = picture.format;
        const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
        const blob = new Blob([new Uint8Array(bytes)], { type: format });
        const extension = format.split('/')[1] || 'jpg';
        resolve(new File([blob], `cover.${extension}`, { type: format }));
      },
      onError: (error) => {
        console.error('Failed to extract metadata:', error);
        resolve(null);
      },
    });
  });
}
