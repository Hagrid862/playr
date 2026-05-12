import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';
import { useCallback, useId, useMemo, useState } from 'react';
import {
  LIBRARY_ALBUM_ARTIST_CREATE_VALUE,
  LIBRARY_ALBUM_ARTIST_NONE_VALUE,
} from './libraryAlbumArtistConstants';

function matchesArtistSearch(query: string, name: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return name.toLowerCase().includes(q);
}

function sortByName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

function labelForArtistId(
  id: string,
  artists: { id: string; name: string }[],
  pendingArtists: { id: string; name: string }[],
): string | null {
  const pending = pendingArtists.find((p) => p.id === id);
  if (pending) return `${pending.name} (new)`;
  const a = artists.find((x) => x.id === id);
  return a?.name ?? null;
}

function triggerSummary(
  selectedArtistIds: string[],
  artists: { id: string; name: string }[],
  pendingArtists: { id: string; name: string }[],
  placeholder: string,
): string {
  if (selectedArtistIds.length === 0) return placeholder;
  const labels = selectedArtistIds
    .map((id) => labelForArtistId(id, artists, pendingArtists))
    .filter((n): n is string => Boolean(n));
  if (labels.length === 0) return placeholder;
  if (labels.length === 1) return labels[0]!;
  if (labels.length === 2) return `${labels[0]}, ${labels[1]}`;
  return `${labels[0]}, ${labels[1]} +${labels.length - 2} more`;
}

export interface LibraryAlbumArtistPickerProps {
  label?: string;
  selectedArtistIds: string[];
  artists: { id: string; name: string }[];
  pendingArtists: { id: string; name: string }[];
  isLoading: boolean;
  disabled?: boolean;
  nonePlaceholder?: string;
  /** Sentinels: create opens modal; none clears all; otherwise toggles id. */
  onSelect: (value: string) => void;
}

export function LibraryAlbumArtistPicker({
  label = 'Artists',
  selectedArtistIds,
  artists,
  pendingArtists,
  isLoading,
  disabled = false,
  nonePlaceholder = 'No artists',
  onSelect,
}: LibraryAlbumArtistPickerProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selectedSet = useMemo(() => new Set(selectedArtistIds), [selectedArtistIds]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setSearch('');
  }, []);

  const filteredPending = useMemo(() => {
    return pendingArtists
      .filter((p) => matchesArtistSearch(search, p.name))
      .sort(sortByName);
  }, [pendingArtists, search]);

  const filteredLibrary = useMemo(() => {
    return artists.filter((a) => matchesArtistSearch(search, a.name)).sort(sortByName);
  }, [artists, search]);

  const displayValue = triggerSummary(
    selectedArtistIds,
    artists,
    pendingArtists,
    nonePlaceholder,
  );

  const handlePick = useCallback(
    (value: string) => {
      if (value === LIBRARY_ALBUM_ARTIST_CREATE_VALUE) {
        onSelect(value);
        handleOpenChange(false);
        return;
      }
      onSelect(value);
      if (value !== LIBRARY_ALBUM_ARTIST_NONE_VALUE) {
        return;
      }
      handleOpenChange(false);
    },
    [onSelect, handleOpenChange],
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
              placeholder="Search artists…"
              value={search}
              onChange={(ev) => setSearch(ev.target.value)}
              className="h-8"
              autoComplete="off"
              aria-label="Search artists"
              autoFocus
            />
          </div>
          <div role="listbox" aria-label="Artists" className="max-h-64 overflow-y-auto p-1">
            {optionRow(LIBRARY_ALBUM_ARTIST_CREATE_VALUE, '+ Create new artist…', false, {
              accent: true,
            })}
            {optionRow(
              LIBRARY_ALBUM_ARTIST_NONE_VALUE,
              'No artists',
              selectedArtistIds.length === 0,
            )}
            {filteredPending.map((p) =>
              optionRow(p.id, `${p.name} (new)`, selectedSet.has(p.id), { accent: true }),
            )}
            {filteredPending.length > 0 && filteredLibrary.length > 0 ? (
              <div
                role="presentation"
                className="text-foreground/85 select-none px-2 pb-0.5 pt-2 text-xs font-semibold tracking-tight"
              >
                Library
              </div>
            ) : null}
            {filteredLibrary.map((a) => optionRow(a.id, a.name, selectedSet.has(a.id)))}

            {!isLoading &&
            filteredLibrary.length === 0 &&
            search.trim() &&
            filteredPending.length === 0 ? (
              <p className="text-muted-foreground px-2 py-3 text-center text-xs">
                No artists match “{search.trim()}”.
              </p>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </Field>
  );
}
