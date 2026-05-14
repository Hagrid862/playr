import { AlbumType } from '@repo/db';
import { format, isValid } from 'date-fns';

/** Album–genre join rows as returned on `Album.genres`. */
export type AlbumGenreRow = {
  genre?: { name?: string | null } | null;
} | null;

export function genreNamesFromAlbumGenres(genres: AlbumGenreRow[] | undefined): string[] {
  if (!genres?.length) return [];
  return genres.map((ag) => ag?.genre?.name?.trim()).filter((n): n is string => Boolean(n));
}

export function buildGenreMiddleSegment(names: string[]): {
  text: string;
  showTooltip: boolean;
  tooltipLines: string[];
} {
  if (names.length === 0) {
    return { text: 'No Genre', showTooltip: false, tooltipLines: [] };
  }
  if (names.length === 1) {
    return { text: names[0]!, showTooltip: false, tooltipLines: names };
  }
  const more = names.length - 1;
  const genreWord = more === 1 ? 'genre' : 'genres';
  return {
    text: `${names[0]} and ${more} more ${genreWord}`,
    showTooltip: true,
    tooltipLines: names,
  };
}

/** Same label shape as album type options in `EditAlbumMetadata`. */
export function albumTypeDisplayName(type: AlbumType): string {
  const entry = Object.entries(AlbumType).find(([, v]) => v === type);
  const key = entry?.[0] ?? 'album';
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function formatAlbumReleaseDateSegment(
  releaseDate: Date | string | null | undefined,
): string | null {
  if (releaseDate == null) return null;
  const d = releaseDate instanceof Date ? releaseDate : new Date(releaseDate);
  if (!isValid(d)) return null;
  return format(d, 'MMM d, yyyy');
}
