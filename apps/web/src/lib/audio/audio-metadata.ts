import { parseBlob, selectCover } from 'music-metadata';

/**
 * Extracted metadata from an audio file (album, artist, title, track, disk, year, date).
 */
export interface ExtractedAudioMetadata {
  album?: string;
  artist?: string;
  title?: string;
  trackNo?: number;
  diskNo?: number;
  year?: number;
  date?: string;
}

/**
 * Extracts common metadata (album, artist, title, track, disk, year, date) from an audio file.
 */
export async function extractMetadataFromAudioFile(
  file: File,
): Promise<ExtractedAudioMetadata | null> {
  try {
    const metadata = await parseBlob(file);
    const { common } = metadata;
    return {
      album: common.album?.trim() || undefined,
      artist: common.artist?.trim() || undefined,
      title: common.title?.trim() || undefined,
      trackNo: common.track?.no ?? undefined,
      diskNo: common.disk?.no ?? undefined,
      year: common.year,
      date: common.date?.trim() || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Parses a date string or year number into a Date object.
 * Returns the Date in local time parameters to prevent off-by-one errors
 * in timezone-sensitive browser environments (e.g. date pickers).
 */
export function parseReleaseDate(dateStr?: string, year?: number): Date | null {
  if (dateStr) {
    const trimmed = dateStr.trim();
    // 1. Matches YYYY-MM-DD
    const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (yyyymmdd) {
      const y = parseInt(yyyymmdd[1]!, 10);
      const m = parseInt(yyyymmdd[2]!, 10);
      const d = parseInt(yyyymmdd[3]!, 10);
      // Validate components to avoid auto-normalizing invalid dates
      if (
        y >= 1000 &&
        y <= 9999 &&
        m >= 1 &&
        m <= 12 &&
        d >= 1 &&
        d <= new Date(y, m, 0).getDate()
      ) {
        return new Date(y, m - 1, d);
      }
    } else {
      // 2. Matches YYYY-MM
      const yyyymm = /^(\d{4})-(\d{2})$/.exec(trimmed);
      if (yyyymm) {
        const y = parseInt(yyyymm[1]!, 10);
        const m = parseInt(yyyymm[2]!, 10);
        // Validate components to avoid auto-normalizing invalid dates
        if (y >= 1000 && y <= 9999 && m >= 1 && m <= 12) {
          return new Date(y, m - 1, 1);
        }
      } else {
        // 3. Matches YYYY
        const yyyy = /^(\d{4})$/.exec(trimmed);
        if (yyyy) {
          const y = parseInt(yyyy[1]!, 10);
          return new Date(y, 0, 1);
        } else {
          // 4. Fallback: Parse using native Date and construct local Date parameters
          const parsed = new Date(trimmed);
          if (!isNaN(parsed.getTime())) {
            const isUtc =
              trimmed.endsWith('Z') ||
              (/[+-]\d{2}(?::?\d{2})?$/.test(trimmed) &&
                (/\dT\d/.test(trimmed) || trimmed.includes(':')));
            if (isUtc) {
              return new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
            } else {
              return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
            }
          }
        }
      }
    }
  }

  // Fallback to year if no date string
  if (year !== undefined && !isNaN(year)) {
    return new Date(year, 0, 1);
  }

  return null;
}

/**
 * Extracts embedded cover art from an audio file (MP3, M4A, FLAC, etc.).
 * Uses music-metadata - a fully typed library with broad format support.
 * Returns a File suitable for uploading, or null if no cover art is embedded.
 */
export async function extractCoverFromAudioFile(file: File): Promise<File | null> {
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
