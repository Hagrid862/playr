import type { ExtractedAudioMetadata } from '@/lib/audio/audio-metadata';
import { normalizeLibraryArtistNameForMatch } from './pendingLibraryArtist';

/**
 * Returns a single display artist name only when every non-empty track tag
 * normalizes to the same value (case-insensitive trim). Tracks with no artist
 * tag are ignored. Mixed or conflicting tags yield `null`.
 */
export function deriveConsistentMetadataArtistName(
  results: Pick<ExtractedAudioMetadata, 'artist'>[],
): string | null {
  const artistCandidates = results
    .map((r) => r.artist?.trim())
    .filter((a): a is string => Boolean(a));
  const normalizedArtistKeys = new Set(
    artistCandidates.map((a) => normalizeLibraryArtistNameForMatch(a)),
  );
  if (artistCandidates.length === 0 || normalizedArtistKeys.size !== 1) {
    return null;
  }
  return artistCandidates[0];
}
