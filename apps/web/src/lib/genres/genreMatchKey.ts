/**
 * Client-side match key for genre labels. Keep aligned with
 * `apps/api/src/shared/genres/genre-normalization.service.ts` (`normalizeToMatchKey`).
 */
export function genreMatchKey(raw: string): string {
  const collapsed = raw
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .slice(0, 64);
  return collapsed;
}
