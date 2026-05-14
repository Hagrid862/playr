import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { UsersThreeIcon } from '@phosphor-icons/react';
import { useCallback, useState } from 'react';

export interface AlbumArtistOption {
  id: string;
  label: string;
}

/** Next artist id list after a checkbox toggle; `null` means leave selection unchanged. */
export function nextAlbumArtistIds(value: string[], id: string, checked: boolean): string[] | null {
  if (checked) {
    if (!value.includes(id)) return [...value, id];
    return null;
  }
  return value.filter((x) => x !== id);
}

/** Applies a checkbox toggle and calls `onChange` only when the selection actually changes. */
export function applyAlbumArtistToggle(
  value: string[],
  id: string,
  checked: boolean,
  onChange: (next: string[]) => void,
): void {
  const next = nextAlbumArtistIds(value, id, checked);
  if (next !== null) onChange(next);
}

interface AlbumTrackArtistsPickerProps {
  artists: AlbumArtistOption[];
  value: string[];
  onChange: (artistIds: string[]) => void;
  disabled?: boolean;
  error?: string;
  /** Show "+ Create new artist…" action (opens modal via parent). */
  allowCreateNew?: boolean;
  onRequestCreateNew?: () => void;
}

export function AlbumTrackArtistsPicker({
  artists,
  value,
  onChange,
  disabled,
  error,
  allowCreateNew = false,
  onRequestCreateNew,
}: AlbumTrackArtistsPickerProps) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(
    (id: string, checked: boolean) => {
      applyAlbumArtistToggle(value, id, checked, onChange);
    },
    [onChange, value],
  );

  const summary =
    value.length === 0
      ? 'Select artists'
      : `${value.length} artist${value.length !== 1 ? 's' : ''}`;

  const listDisabled = disabled || (!allowCreateNew && artists.length === 0);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Artists</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={listDisabled}
            className={cn('w-full justify-start gap-2 font-normal', error && 'border-destructive')}
          >
            <UsersThreeIcon className="size-4 shrink-0 opacity-70" />
            <span className="truncate">{summary}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(100vw-2rem,22rem)] p-0" align="start">
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto p-2">
            {allowCreateNew && onRequestCreateNew ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="justify-start font-normal text-primary"
                disabled={disabled}
                onClick={() => {
                  setOpen(false);
                  onRequestCreateNew();
                }}
              >
                + Create new artist…
              </Button>
            ) : null}
            {artists.map((a) => (
              <label
                key={a.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60"
              >
                <Checkbox
                  checked={value.includes(a.id)}
                  onCheckedChange={(c) => toggle(a.id, !!c)}
                  disabled={disabled}
                />
                <span className="text-sm">{a.label}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {!allowCreateNew && artists.length === 0 ? (
        <p className="text-xs text-muted-foreground">No library artists loaded yet.</p>
      ) : null}
    </div>
  );
}
