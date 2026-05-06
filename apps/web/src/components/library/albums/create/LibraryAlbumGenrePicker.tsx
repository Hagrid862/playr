import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { ZodGenreInfer } from '@repo/contracts';
import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';
import { useCallback, useId, useMemo, useState } from 'react';
import {
  LIBRARY_ALBUM_GENRE_CREATE_VALUE,
  LIBRARY_ALBUM_GENRE_NONE_VALUE,
} from './libraryAlbumGenreConstants';

function matchesGenreSearch(query: string, name: string, slug: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return name.toLowerCase().includes(q) || slug.toLowerCase().includes(q);
}

function sortByName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

function labelForGenreId(
  id: string,
  genres: ZodGenreInfer[],
  pendingGenres: { id: string; name: string }[],
): string | null {
  const pending = pendingGenres.find((p) => p.id === id);
  if (pending) return `${pending.name} (new)`;
  const g = genres.find((x) => x.id === id);
  return g?.name ?? null;
}

function triggerSummary(
  selectedGenreIds: string[],
  genres: ZodGenreInfer[],
  pendingGenres: { id: string; name: string }[],
  placeholder: string,
): string {
  if (selectedGenreIds.length === 0) return placeholder;
  const labels = selectedGenreIds
    .map((id) => labelForGenreId(id, genres, pendingGenres))
    .filter((n): n is string => Boolean(n));
  if (labels.length === 0) return placeholder;
  if (labels.length === 1) return labels[0]!;
  if (labels.length === 2) return `${labels[0]}, ${labels[1]}`;
  return `${labels[0]}, ${labels[1]} +${labels.length - 2} more`;
}

export interface LibraryAlbumGenrePickerProps {
  label?: string;
  selectedGenreIds: string[];
  genres: ZodGenreInfer[];
  pendingGenres: { id: string; name: string }[];
  isLoading: boolean;
  disabled?: boolean;
  /** Shown when no genres are selected. */
  nonePlaceholder?: string;
  /** Sentinels: `LIBRARY_ALBUM_GENRE_CREATE_VALUE` opens modal; `LIBRARY_ALBUM_GENRE_NONE_VALUE` clears all; otherwise toggles id. */
  onSelect: (value: string) => void;
}

export function LibraryAlbumGenrePicker({
  label = 'Genres (optional)',
  selectedGenreIds,
  genres,
  pendingGenres,
  isLoading,
  disabled = false,
  nonePlaceholder = 'No genres',
  onSelect,
}: LibraryAlbumGenrePickerProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selectedSet = useMemo(() => new Set(selectedGenreIds), [selectedGenreIds]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setSearch('');
  }, []);

  const filteredPending = useMemo(() => {
    return pendingGenres.filter((p) => matchesGenreSearch(search, p.name, p.name)).sort(sortByName);
  }, [pendingGenres, search]);

  const systemGenres = useMemo(() => {
    return genres
      .filter((g) => g.kind === 'system')
      .filter((g) => matchesGenreSearch(search, g.name, g.slug))
      .sort(sortByName);
  }, [genres, search]);

  const customGenres = useMemo(() => {
    return genres
      .filter((g) => g.kind === 'custom')
      .filter((g) => matchesGenreSearch(search, g.name, g.slug))
      .sort(sortByName);
  }, [genres, search]);

  const hasLibraryRowsBelow = systemGenres.length > 0 || customGenres.length > 0;
  const showSeparatorBeforeCustom = systemGenres.length > 0 && customGenres.length > 0;

  const displayValue = triggerSummary(selectedGenreIds, genres, pendingGenres, nonePlaceholder);

  const handlePick = useCallback(
    (value: string) => {
      if (value === LIBRARY_ALBUM_GENRE_CREATE_VALUE) {
        onSelect(value);
        handleOpenChange(false);
        return;
      }
      onSelect(value);
      if (value !== LIBRARY_ALBUM_GENRE_NONE_VALUE) {
        return;
      }
      handleOpenChange(false);
    },
    [onSelect, handleOpenChange],
  );

  const sectionHeader = (title: string, opts?: { first?: boolean }) => (
    <div
      role="presentation"
      className={cn(
        'text-foreground/85 select-none px-2 pb-0.5 text-xs font-semibold tracking-tight',
        opts?.first ? 'pt-1.5' : 'pt-2',
      )}
    >
      {title}
    </div>
  );

  const optionRow = (
    value: string,
    text: string,
    selected: boolean,
    opts?: { accent?: boolean },
  ) => (
    <button
      key={value}
      type="button"
      role="option"
      aria-selected={selected}
      className={cn(
        'focus:bg-accent focus:text-accent-foreground flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-left text-sm outline-none select-none',
        selected && 'bg-accent/50',
        opts?.accent && 'font-medium text-primary',
      )}
      onClick={() => handlePick(value)}
    >
      <span className="min-w-0 flex-1 truncate">{text}</span>
      {selected ? <CheckIcon className="text-muted-foreground size-4 shrink-0" /> : null}
    </button>
  );

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled || isLoading}
            className={cn(
              'border-input data-placeholder:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full min-w-0 rounded-lg border bg-transparent py-2 pr-2 pl-2.5 text-left text-sm transition-colors select-none focus-visible:ring-[3px] flex items-center justify-between gap-1.5 outline-none disabled:cursor-not-allowed disabled:opacity-50',
            )}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className="min-w-0 flex-1 truncate text-foreground">
              {isLoading ? 'Loading...' : displayValue}
            </span>
            <CaretDownIcon className="text-muted-foreground size-4 shrink-0 pointer-events-none" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] min-w-[var(--radix-popover-trigger-width)] max-w-[min(100vw-2rem,24rem)] gap-0 overflow-hidden p-0"
        >
          <div className="flex flex-col gap-0 border-b border-border px-2 py-2">
            <Input
              placeholder="Search genres…"
              value={search}
              onChange={(ev) => setSearch(ev.target.value)}
              className="h-8"
              autoComplete="off"
              aria-label="Search genres"
              autoFocus
            />
          </div>
          <div role="listbox" aria-label="Genres" className="max-h-64 overflow-y-auto p-1">
            {optionRow(LIBRARY_ALBUM_GENRE_CREATE_VALUE, '+ Create new genre…', false, {
              accent: true,
            })}
            {optionRow(LIBRARY_ALBUM_GENRE_NONE_VALUE, 'No genres', selectedGenreIds.length === 0)}
            {filteredPending.map((p) =>
              optionRow(p.id, `${p.name} (new)`, selectedSet.has(p.id), { accent: true }),
            )}

            {hasLibraryRowsBelow ? <Separator className="my-1" /> : null}

            {systemGenres.length > 0 ? (
              <>
                {sectionHeader('System genres', { first: true })}
                {systemGenres.map((g) => optionRow(g.id, g.name, selectedSet.has(g.id)))}
              </>
            ) : null}

            {showSeparatorBeforeCustom ? <Separator className="my-1" /> : null}

            {customGenres.length > 0 ? (
              <>
                {sectionHeader('Custom genres', {
                  first: systemGenres.length === 0,
                })}
                {customGenres.map((g) => optionRow(g.id, g.name, selectedSet.has(g.id)))}
              </>
            ) : null}

            {!isLoading && !hasLibraryRowsBelow && search.trim() && filteredPending.length === 0 ? (
              <p className="text-muted-foreground px-2 py-3 text-center text-xs">
                No genres match “{search.trim()}”.
              </p>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </Field>
  );
}
