/**
 * Extracts a clean track title from an audio filename by removing:
 * - File extension
 * - Leading track/disk numbers (e.g., "01 - ", "1. ", "01-02 - ")
 * - Artist and album names when provided as context
 * - Features (e.g., "feat. Diho", "ft. Artist", "(feat. Artist)")
 * - Common metadata suffixes (bitrate, quality, format tags in brackets)
 * - Extra separators (underscores, multiple dashes)
 */
export function cleanFilenameToTitle(
  filename: string,
  context: { artists: string[]; album: string },
): string {
  let title = filename.replace(/\.[^/.]+$/, '');

  // 1. Remove leading track/disk numbers (e.g., "01 - ", "1. ", "01-02 - ")
  title = title.replace(/^(\d+[\s.\-_)]+)+/, '');

  // 2. Remove features (feat., ft., featuring)
  // This handles variants like "feat. Artist", "(feat. Artist)", "feat Artist", etc.
  // We remove the "feat" part and anything that follows it if it's likely an artist name
  // but since we want to keep the title, we usually look for "feat" as a separator.
  title = title.replace(/\s*[([]?\s*(feat\.?|ft\.?|featuring)\s+[^()\]\-_]+\s*[)\]]?/gi, ' ');

  // 3. Remove artist/album names when present at start, end, or with separators
  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const toRemove = [...context.artists.filter(Boolean), context.album?.trim()].filter(Boolean);

  for (const item of toRemove) {
    const escaped = escapeRegExp(item);
    // Match at start: "Artist - " or "Artist -"
    title = title.replace(new RegExp(`^${escaped}\\s*[\\-_]?\\s*`, 'gi'), ' ');
    // Match at end: " - Artist" or "- Artist"
    title = title.replace(new RegExp(`\\s*[\\-_]?\\s*${escaped}$`, 'gi'), ' ');
    // Match in middle with separators: " - Artist - " (replace with single space)
    title = title.replace(new RegExp(`\\s*[\\-_]+\\s*${escaped}\\s*[\\-_]+\\s*`, 'gi'), ' ');
  }

  // 4. Remove common metadata in parentheses or brackets
  title = title.replace(/\s*\([^)]*\)\s*/g, ' ');
  title = title.replace(/\s*\[[^\]]*\]\s*/g, ' ');

  // 5. Remove bitrate/quality/format tags (standalone words)
  title = title.replace(
    /\s*(320kbps|256kbps|192kbps|128kbps|hq|lossless|kbps|mp3|wav|flac|aac|m4a|ogg)\s*/gi,
    ' ',
  );

  // 6. Replace separators with spaces and collapse whitespace
  title = title.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();

  // 7. Capitalize first letter
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  const fallback = filename.replace(/\.[^/.]+$/, '');
  return title || fallback;
}
