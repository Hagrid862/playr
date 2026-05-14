import { Injectable } from '@nestjs/common';

/**
 * Deterministic normalization for genre strings (metadata tags, manual entry, search).
 * Output is suitable for slug / match-key comparison against `Genre.slug`.
 */
@Injectable()
export class GenreNormalizationService {
  /**
   * Collapses a raw label to a stable match key: lowercase, strip punctuation,
   * keep Unicode letters and numbers, max length 64 (UTF-16 code units).
   */
  normalizeToMatchKey(raw: string): string {
    const collapsed = raw
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '')
      .slice(0, 64);
    return collapsed;
  }

  /**
   * Splits common multi-value ID3 patterns into separate labels.
   */
  splitRawGenreSegments(raw: string): string[] {
    return raw
      .split(/[/;|,]+/u)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  /**
   * Flattens `music-metadata` style `string | string[]` into trimmed segment strings.
   */
  flattenRawGenreInput(input: string | readonly string[]): string[] {
    const parts = Array.isArray(input) ? input : [input];
    const out: string[] = [];
    for (const part of parts) {
      if (typeof part !== 'string') {
        continue;
      }
      out.push(...this.splitRawGenreSegments(part));
    }
    return out;
  }
}
