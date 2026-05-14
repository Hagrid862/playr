import { TextField } from '@/components/form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { genreMatchKey } from '@/lib/genres/genreMatchKey';
import { useCallback, useState } from 'react';

type CreateLibraryGenreNameModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Names of genres already staged as pending in this session (exact match vs trimmed input). */
  pendingGenreNames: string[];
  /** Genres loaded for the library (system + custom) — used to block duplicates in the dropdown set. */
  existingGenres: { id: string; name: string; slug: string }[];
  /** Called with trimmed name when validation passes. */
  onConfirm: (name: string) => void;
};

export function CreateLibraryGenreNameModal({
  open,
  onOpenChange,
  pendingGenreNames,
  existingGenres,
  onConfirm,
}: CreateLibraryGenreNameModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setName('');
      setError(null);
    }
  }

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setName('');
        setError(null);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  const handleConfirm = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setError(null);

    if (pendingGenreNames.some((n) => n === trimmed)) {
      setError('You already added a genre with this name for this album.');
      return;
    }

    const key = genreMatchKey(trimmed);
    if (!key) {
      setError('Genre name must contain at least one letter or number.');
      return;
    }

    const collides = existingGenres.some((g) => genreMatchKey(g.name) === key);
    if (collides) {
      setError('A genre like this already exists — pick it from the list instead.');
      return;
    }

    onConfirm(trimmed);
    handleOpenChange(false);
  }, [name, onConfirm, handleOpenChange, pendingGenreNames, existingGenres]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New genre</DialogTitle>
          <DialogDescription>
            Draft genres are created when you submit the album. Add several if you like, select them
            in the list, and manage custom genres later from the library.
          </DialogDescription>
        </DialogHeader>
        <TextField
          label="Genre name"
          placeholder="e.g. Shoegaze"
          value={name}
          onChange={(v) => {
            setName(v);
            setError(null);
          }}
          onBlur={() => {}}
          error={error ?? undefined}
        />
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={!name.trim()}>
            Add genre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
