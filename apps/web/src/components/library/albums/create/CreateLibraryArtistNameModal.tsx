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
import { checkLibraryArtistNameAvailability } from '@/hooks/api/library-artists/requests/checkLibraryArtistNameAvailability';
import { useCallback, useEffect, useState } from 'react';

type CreateLibraryArtistNameModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Names of artists already staged as pending in this session (exact match vs trimmed input). */
  pendingArtistNames: string[];
  /** Called with trimmed name when availability passes. */
  onConfirm: (name: string) => void;
};

export function CreateLibraryArtistNameModal({
  open,
  onOpenChange,
  pendingArtistNames,
  onConfirm,
}: CreateLibraryArtistNameModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!open) {
      setName('');
      setError(null);
      setIsChecking(false);
    }
  }, [open]);

  const handleConfirm = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setError(null);

    if (pendingArtistNames.some((n) => n === trimmed)) {
      setError('You already added an artist with this name for this album.');
      return;
    }

    setIsChecking(true);
    try {
      const result = await checkLibraryArtistNameAvailability(trimmed);
      if (!result.data.available) {
        setError('An artist with this name already exists in your library.');
        return;
      }
      onConfirm(trimmed);
      onOpenChange(false);
    } catch {
      setError('Could not verify name. Try again.');
    } finally {
      setIsChecking(false);
    }
  }, [name, onConfirm, onOpenChange, pendingArtistNames]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New artist</DialogTitle>
          <DialogDescription>
            This artist will be saved when you create the album. You can add more details later from
            the library.
          </DialogDescription>
        </DialogHeader>
        <TextField
          label="Artist name"
          placeholder="e.g. The Band"
          value={name}
          onChange={(v) => {
            setName(v);
            setError(null);
          }}
          onBlur={() => {}}
          error={error ?? undefined}
        />
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!name.trim() || isChecking}
          >
            {isChecking ? 'Checking…' : 'Add artist'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
